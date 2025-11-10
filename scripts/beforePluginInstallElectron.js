const path = require('path');
const exec = require('child_process').exec;

const packageName = require('../src/electron/package.json').name;

module.exports = function (context) {
    return new Promise(function (resolve, reject) {
        // console.log('Installing Electron external dependencies via npm');
        // console.log('For package name: ' + packageName);
        resolve();

        
        // try {
        //     const sqlite3Package = require(path.join(context.opts.projectRoot, "platforms", "electron", "www", "node_modules", "sqlite3"));
        //     // const sqlite3PackagePath = path.join(process.cwd(), 'node_modules', 'sqlite3', 'package.json');
        //     const sqlite3Version = sqlite3Package.version;
        //     console.log('Detected sqlite3 version: ' + sqlite3Version);
        //     resolve();
        // } catch (e)  {
        //     console.log(e);
        // }

        // Dynamically find the Electron version
        // let electronVersion;
        // try {
        //     const electronPackage = require(path.join(process.cwd(), 'node_modules', 'electron', 'package.json'));
        //     electronVersion = electronPackage.version;
        //     console.log('Detected Electron version: ' + electronVersion);
        // } catch (err) {
        //     console.error('Failed to detect Electron version. Ensure Electron is installed.');
        //     return reject(err);
        // }
        

        // // Run npm install and electron-rebuild with the detected version
        // const command = `npm install sqlite3 && npm install electron-rebuild && npx electron-rebuild --version=${electronVersion}`;
        // console.log(`npm install && npm install electron-rebuild && npx electron-rebuild --version=${electronVersion}`);
        // // cwd: path.join('plugins', packageName, "src", "electron")
        // // { cwd: context.opts.projectRoot }
        // const installPath = path.join(context.opts.projectRoot, "platforms", "electron", "www")
        // exec(command, { cwd: installPath }, function (error, stdout, stderr) {
        //     if (error !== null) {
        //         console.log('npm install of external dependencies failed with error message: ' + error.message);
        //         console.log('stdout: ' + stdout);
        //         console.log('stderr: ' + stderr);
        //         reject();
        //     } else {
        //         console.log('npm install of external dependencies completed successfully');
        //         resolve();
        //     }
        // });
    });
};