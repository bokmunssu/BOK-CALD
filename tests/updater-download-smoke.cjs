// Run with Electron after building the x64 NSIS installer. No installation is performed.
const { app } = require('electron');
const { NsisUpdater } = require('electron-updater');
const { ElectronHttpExecutor } = require('electron-updater/out/electronHttpExecutor');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const yaml = require('js-yaml');
const root = path.resolve(__dirname, '..');
const metadata = yaml.load(fs.readFileSync(path.join(root, 'release/latest.yml'), 'utf8'));
const installer = path.join(root, 'release', metadata.files[0].url);
const cache = fs.mkdtempSync(path.join(root, 'test-results/updater-download-'));
app.setPath('userData', path.join(cache, 'electron'));
let corrupt = false;
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname === '/latest.yml') {
    const record = corrupt ? { ...metadata, sha512: Buffer.alloc(64).toString('base64'), files: [{ ...metadata.files[0], sha512: Buffer.alloc(64).toString('base64') }] } : metadata;
    res.end(yaml.dump(record));
  } else if (decodeURIComponent(url.pathname.slice(1)) === metadata.files[0].url) {
    res.setHeader('Content-Length', fs.statSync(installer).size);
    fs.createReadStream(installer).pipe(res);
  } else { res.writeHead(404); res.end(); }
});
app.whenReady().then(async () => {
  try {
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    const feed = `http://127.0.0.1:${server.address().port}`;
    const makeUpdater = suffix => {
      const config = path.join(cache, `${suffix}.yml`);
      fs.writeFileSync(config, yaml.dump({ provider: 'generic', url: feed, updaterCacheDirName: suffix }));
      const adapter = { version: '2.1.0', name: 'TomoUpdaterSmoke', isPackaged: true, appUpdateConfigPath: config, userDataPath: cache, baseCachePath: cache,
        whenReady: () => Promise.resolve(), onQuit: () => {}, quit: () => { throw new Error('Smoke test must not install'); }, relaunch: () => { throw new Error('Smoke test must not relaunch'); } };
      const updater = new NsisUpdater(null, adapter);
      updater.httpExecutor = new ElectronHttpExecutor(() => {});
      updater.setFeedURL({ provider: 'generic', url: feed });
      updater.autoDownload = true; updater.autoInstallOnAppQuit = false; updater.disableDifferentialDownload = true; updater.logger = null;
      updater.on('error', () => {});
      return updater;
    };
    const valid = makeUpdater('valid'); let ready = false;
    valid.on('update-downloaded', () => { ready = true; });
    const downloaded = await (await valid.checkForUpdates()).downloadPromise;
    assert.equal(ready, true);
    const digest = crypto.createHash('sha512').update(fs.readFileSync(downloaded[0])).digest('base64');
    assert.equal(digest, metadata.files[0].sha512);
    corrupt = true;
    const invalid = makeUpdater('corrupt');
    await assert.rejects(async () => { await (await invalid.checkForUpdates()).downloadPromise; }, /checksum mismatch/i);
    fs.writeFileSync(path.join(cache, 'result.json'), JSON.stringify({ validDownload: true, invalidChecksumRejected: true, installerBytes: fs.statSync(installer).size, installationPerformed: false }, null, 2));
    console.log('PASS: actual updater downloaded the installer and rejected an invalid checksum; installation was not performed.');
    server.close(); app.exit(0);
  } catch (error) { console.error(error.message); server.close(); app.exit(1); }
});
