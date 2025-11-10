const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('SQLitePluginElectron', {
  open: async (opts) => {
    try {
      // console.error('[SQLitePluginElectron] running hook:');
      const options = { key: opts.key, filePath: opts.filePath, mode: opts.mode || 'readwrite' };
      const r = await ipcRenderer.invoke('electron-sqlite-open', options);
      // const result = new SQLiteObject(opts.key, opts.filePath);
      opts.okcb(r);
      return r;
    } catch (e) {
      console.error('[SQLitePluginElectron] open failed:', e && e.stack ? e.stack : e);
      opts.errorcb(e);
    }
  },
  run: async (opts) => await ipcRenderer.invoke('electron-sqlite-run', opts),
  all: async (opts) => {
    // opts: {success: mycb, error: null, executes: tropts, key: this.db.dbname }
    try {
      const r = await ipcRenderer.invoke('electron-sqlite-all', { key: opts.key, executes: opts.executes });
      opts.okcb(r);
      return r;
    } catch (e) {
      console.error('[SQLitePluginElectron] execute failed:', e && e.stack ? e.stack : e);
      opts.errorcb(e);
    }
  },
  close: async (opts) => { 
    try {
      await ipcRenderer.invoke('electron-sqlite-close', {key: opts.key});
    } catch (e) {
      console.error('[SQLitePluginElectron] close failed:', e && e.stack ? e.stack : e);
      if (opts.errorcb != null) {
        opts.errorcb(e);
      }
      return;
    }
    if (opts.okcb != null) {
      opts.okcb();
    }
  },
});
