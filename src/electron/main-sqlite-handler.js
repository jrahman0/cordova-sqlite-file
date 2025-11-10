// main-sqlite-handler.js
const { ipcMain } = require('electron');
const path = require('path');

let sqlite3;
try {
  const sqlitePath = path.join(__dirname, "node_modules", "cordova-sqlite-file", 'sqlite3');
  sqlite3 = require(sqlitePath);
} catch (e) {
  console.error('[sqliteplugin-main] sqlite3 require failed:', e && e.stack ? e.stack : e);
  sqlite3 = null;
}

const dbMap = new Map(); // key -> { db: sqlite3.Database, path }

function resolvePath(filePath) {
  if (!filePath) throw new Error('filePath required');
  return path.resolve(filePath);
}

ipcMain.handle('electron-sqlite-open', async (event, { key, filePath, mode = 'readwrite' }) => {
  return new Promise((resolve, reject) => {
    try {
      const resolvedPath = resolvePath(path.join(filePath, key));
      console.log("Opening db:", resolvedPath);
      const flags = mode === 'readonly' ? sqlite3.OPEN_READONLY : (sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE);
      const db = new sqlite3.Database(resolvedPath, flags, (err) => {
        if (err) return reject({ message: err.message });
        dbMap.set(key, { db, path: resolvedPath });
        resolve({ ok: true, path: resolvedPath });
      });
    } catch (err) {
      reject({ message: err.message });
    }
  });
});

ipcMain.handle('electron-sqlite-run', async (event, { key, sql, params }) => {
  return new Promise((resolve, reject) => {
    const entry = dbMap.get(key);
    if (!entry) return reject({ message: 'DB not open' });
    const db = entry.db;
    db.run(sql, params || [], function (err) {
      if (err) return reject({ message: err.message });
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
});


ipcMain.handle('electron-sqlite-all', async (event, { key, executes }) => {
    return new Promise((resolve, reject) => {
      const entry = dbMap.get(key);
      if (!entry) return reject({ message: 'DB not open' });
      const db = entry.db;
  
      const batchResults = [];
      let statementsFinished = 0;
  
      db.serialize(() => {
        if (executes.length === 0) {
          return resolve([]);
        }
  
        executes.forEach(statement => {
        const sql = statement["sql"];
        const params = statement["params"];
  
          const callback = function(err, rows) {
            try {
              if (err) {
                batchResults.push({
                  type: 'error',
                  result: {
                    message: err.message,
                    code: err.code
                  }
                });
              } else {
                let queryResult;
                if (rows) { // for SELECT
                  queryResult = { rows };
                } else { // for INSERT, UPDATE, DELETE
                  queryResult = {
                    rowsAffected: this.changes,
                    insertId: this.lastID
                  };
                }
                batchResults.push({
                  type: 'success',
                  result: queryResult
                });
              }
            } catch (e) {
              // This catch is for synchronous errors in the callback logic itself
              batchResults.push({
                type: 'error',
                result: { message: e.message }
              });
            } finally {
              statementsFinished++;
              if (statementsFinished === executes.length) {
                resolve(batchResults);
              }
            }
          };
  
          if (sql.trim().toUpperCase().startsWith('SELECT')) {
            db.all(sql, params, callback);
          } else {
            db.run(sql, params, callback);
          }
        });
      });
    });
});
  

ipcMain.handle('electron-sqlite-close', async (event, { key }) => {
  return new Promise((resolve, reject) => {
    const entry = dbMap.get(key);
    if (!entry) resolve({ ok: true });
    entry.db.close((err) => {
      if (err) return reject({ message: err.message });
      dbMap.delete(key);
      resolve({ ok: true });
    });
  });
});