// Adapted from:
// https://github.com/AllJoyn-Cordova/cordova-plugin-alljoyn/blob/master/scripts/beforePluginInstall.js

const path = require('path');
const execa = require('execa');

const packageName = require('../package.json').name;

module.exports = async function (context) {
    console.log(`[sqliteplugin-hook] Running npm install for ${packageName}`);
    await new Promise((resolve) => setTimeout(resolve, 1000)); // Delay before npm install

    try {
        const pluginPath = path.join(context.opts.projectRoot, 'plugins', packageName);
        if (require('fs').existsSync(pluginPath)) {
            let result = execa.sync('npm', ['install'], {
                cwd: pluginPath,
                cleanup: true,
                stdio: 'inherit'
            });
            if (result.failed) {
                console.error(`[sqliteplugin-hook] npm install failed: ${result.stderr}`);
                throw new Error('npm install failed');
            }
            console.log('[sqliteplugin-hook] npm install completed.');
        } else {
            console.warn(`[sqliteplugin-hook] Plugin path not found, skipping npm install: ${pluginPath}`);
        }
    } catch (e) {
        console.error('[sqliteplugin-hook] Error during npm install:', e);
        // Decide if this should be a fatal error
        // process.exit(1);
    }

    // Allow for any background copy to finish.
    await new Promise((resolve) => setTimeout(resolve, 2000));
};
