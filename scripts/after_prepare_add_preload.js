const fs = require('fs');
const path = require('path');

const debug = process.env.SQLITEPLUGIN_HOOK_DEBUG === '1';

function log(...args) { 
  if (debug) {
    console.log('[sqliteplugin-hook]', ...args); 
  }
}

const CANDIDATE_PRELOADS = [
  'cdv-electron-preload.js',
  path.join('platforms', 'electron', 'www', 'cdv-electron-preload.js'),
];

const CANDIDATE_Mains = [
  'cdv-electron-main.js',
  path.join('platforms', 'electron', 'www', 'cdv-electron-main.js'),
];

function findProjectRoot() {
  return process.env.PWD || process.cwd();
}

function findPreloadFile(projectRoot) {
  for (const rel of CANDIDATE_PRELOADS) {
    const abs = path.join(projectRoot, rel);
    if (fs.existsSync(abs)) return abs;
  }
  // fallback: try to find any file that contains 'contextBridge' and 'cdvElectronIpc'
  const candidates = fs.readdirSync(projectRoot).filter(f => f.endsWith('.js'));
  for (const f of candidates) {
    const abs = path.join(projectRoot, f);
    const stat = fs.statSync(abs);
    if (!stat.isFile()) continue;
    const content = fs.readFileSync(abs, 'utf8');
    if (content.includes('contextBridge') && content.includes('_cdvElectronIpc')) return abs;
  }
  return null;
}

function findMainFile(projectRoot) {
  for (const rel of CANDIDATE_Mains) {
    const abs = path.join(projectRoot, rel);
    if (fs.existsSync(abs)) return abs;
  }
  // fallback: try to find any file that contains 'contextBridge' and 'cdvElectronIpc'
  const candidates = fs.readdirSync(projectRoot).filter(f => f.endsWith('.js'));
  for (const f of candidates) {
    const abs = path.join(projectRoot, f);
    const stat = fs.statSync(abs);
    if (!stat.isFile()) continue;
    const content = fs.readFileSync(abs, 'utf8');
    if (content.includes('ipcMain.handle') && content.includes('new BrowserWindow')) return abs;
  }
  return null;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function copyBridge(pluginRoot, destDir) {
  const src = path.join(pluginRoot, 'src', 'electron', 'preload-bridge.js');
  if (!fs.existsSync(src)) throw new Error('Plugin preload-bridge.js not found at ' + src);
  // const dstDir = path.join(projectRoot, 'electron_plugins', 'sqliteplugin');
  ensureDir(destDir);
  const dst = path.join(destDir, 'preload-bridge.js');
  fs.copyFileSync(src, dst);
  log('Copied preload-bridge to', dst);
  return dst;
}

function copyHandler(pluginRoot, destDir) {
  const src = path.join(pluginRoot, 'src', 'electron', 'main-sqlite-handler.js');
  if (!fs.existsSync(src)) throw new Error('Plugin main-sqlite-handler.js not found at ' + src);
  // const dstDir = path.join(projectRoot, 'electron_plugins', 'sqliteplugin');
  ensureDir(destDir);
  const dst = path.join(destDir, 'main-sqlite-handler.js');
  fs.copyFileSync(src, dst);
  log('Copied main-sqlite-handler to', dst);
  return dst;
}

function copyDependencies(pluginRoot, destDir, files) {
  const sourceDir = path.join(pluginRoot, 'src', 'electron');
  ensureDir(destDir);
  const copiedFilePaths = [];

  files.forEach(file => {
    const srcPath = path.join(sourceDir, file);
    if (!fs.existsSync(srcPath)) {
      throw new Error(`Plugin file not found at ${srcPath}`);
    }
    const destPath = path.join(destDir, file);
    fs.copyFileSync(srcPath, destPath);
    log(`Copied ${file} to ${destPath}`);
    copiedFilePaths.push(destPath);
  });

  return copiedFilePaths;
}

function backupFile(file) {
  const bak = file + '.sqliteplugin.bak';
  if (!fs.existsSync(bak)) {
    fs.copyFileSync(file, bak);
    log('Backup created:', bak);
  } else {
    log('Backup already exists:', bak);
  }
}

function injectRequireIntoPreload(preloadFile, requireLine) {
  const content = fs.readFileSync(preloadFile, 'utf8');
  const fileName = path.basename(preloadFile);


  // Check for existing require line (loose check)
  if (content.includes(requireLine) || content.includes(fileName) ) {
    log('Preload already requires sqliteplugin bridge; no change.');
    return false;
  }

  // Ensure 'path' is required in preload; if not, add it near the top
  let modified = content;
  if (!/require\(['"]path['"]\)/.test(modified)) {
    // Try to insert after first line if it's a shebang or 'use strict', otherwise at top
    const firstNewline = modified.indexOf('\n');
    const insertion = "const path = require('path');\n";
    if (firstNewline !== -1) {
      modified = insertion + modified;
    } else {
      modified = insertion + modified;
    }
    log('Inserted require(\'path\') into preload.');
  }

  // Insert the require line after the path require (so path is available)
  // We'll put it after the first occurrence of "const path" line
  const pathRequireIndex = modified.indexOf("const path = require('path');");
  const insertAt = pathRequireIndex !== -1 ? pathRequireIndex + "const path = require('path');".length : 0;
  const before = modified.slice(0, insertAt);
  const after = modified.slice(insertAt);
  const lineToInsert = '\n' + requireLine + '\n';
  const newContent = before + lineToInsert + after;

  fs.writeFileSync(preloadFile, newContent, 'utf8');
  log('Injected require into preload:', preloadFile);
  return true;
}

module.exports = async function(context) {
  await new Promise((resolve, reject) => { setTimeout(resolve, 1000); });
  try {
    const pluginRoot = path.resolve(__dirname, '..', '..', 'cordova-sqlite-file'); // plugin/scripts/hooks/...
    const projectRoot = findProjectRoot();
    // findProjectRoot();
    log('Project root:', projectRoot);
    // log(context);

    const preloadFile = findPreloadFile(projectRoot);
    if (!preloadFile) {
      log('Could not find existing preload file; skipping bridge injection.');
      return;
    }
    log('Found existing preload file at', preloadFile);

    const _dirname = process.env.dirname || __dirname;
    const platformFolder = path.resolve(projectRoot, 'platforms', 'electron', 'platform_www');

    const copiedBridge = copyBridge(pluginRoot, platformFolder);
    await new Promise((resolve, reject) => { setTimeout(resolve, 0); });
    // Compute relative path from preload file dir to copied bridge
    const rel = path.relative(path.dirname(preloadFile), copiedBridge);
    const relNormalized = rel.split(path.sep).join(path.posix.sep);

    // backupFile(preloadFile);

      // The require line we want to add (using path.join for robust path computation)
    const fileNamePreload = path.basename(relNormalized);
    const requireLine = "require('./" + fileNamePreload + "');";
    let changed = injectRequireIntoPreload(preloadFile, requireLine);
    
    const mainFile = findMainFile(projectRoot);
    const copiedHandler = copyHandler(pluginRoot, platformFolder);
    const relHandler = path.relative(path.dirname(mainFile), copiedHandler);
    const relNormalizedHandler = relHandler.split(path.sep).join(path.posix.sep);

    // const requireLineHandler = `require(path.join(__dirname, ${JSON.stringify(relNormalizedHandler)}));`;
    const fileNameHandler = path.basename(relNormalizedHandler);
    const requireLineHandler = "require('./" + fileNameHandler + "');";
    // backupFile(mainFile);
    await new Promise((resolve, reject) => { setTimeout(resolve, 0); });
    changed = injectRequireIntoPreload(mainFile, requireLineHandler);

    copyDependencies(pluginRoot, path.resolve(platformFolder, 'lib', "sqlite3"), [
      'sqlite3.js',
      'sqlite3-binding.js',
      'node_sqlite3.node',
      'package.json',
    ]);

    if (!changed) {
      log('No modification required for preload file.')
    };

  } catch (err) {
    console.error('[sqliteplugin-hook] ERROR:', err && err.stack ? err.stack : err);
    // process.exitCode = 1;
  }
  await new Promise((resolve, reject) => { setTimeout(resolve, 1000); });
}