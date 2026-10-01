// Eat the Frog – Windows-Programm (Electron-Hülle um index.html)
const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

if (!app.requestSingleInstanceLock()) app.quit();

let win, splash;
const PRELOAD = path.join(__dirname, 'preload.js');
const ICON = path.join(__dirname, 'app', 'icon-512.png');

function makeWindow(url, hold) {
  const w = new BrowserWindow({
    width: 1360, height: 900, minWidth: 900, minHeight: 600,
    backgroundColor: '#0a1311', icon: ICON, title: 'Eat the Frog',
    autoHideMenuBar: true, show: false,
    webPreferences: { preload: PRELOAD, contextIsolation: true, nodeIntegration: false, spellcheck: true }
  });
  if (!hold) w.once('ready-to-show', () => w.show());
  const wc = w.webContents;
  // Links nach aussen (Mail, Websites) im normalen Programm öffnen
  wc.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('file:')) { makeWindow(url); return { action: 'deny' }; }
    shell.openExternal(url); return { action: 'deny' };
  });
  wc.on('will-navigate', (e, url) => {
    if (!url.startsWith('file:')) { e.preventDefault(); shell.openExternal(url); }
  });
  url ? w.loadURL(url) : w.loadFile(path.join(__dirname, 'app', 'index.html'));
  return w;
}

function uniquePath(dir, name) {
  const ext = path.extname(name), base = path.basename(name, ext);
  let p = path.join(dir, name), i = 1;
  while (fs.existsSync(p)) p = path.join(dir, `${base} (${i++})${ext}`);
  return p;
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);

  // Downloads landen direkt im Ordner «Downloads»; die Mail an die Trainerin öffnet sich von selbst
  require('electron').session.defaultSession.on('will-download', (e, item) => {
    const target = uniquePath(app.getPath('downloads'), item.getFilename());
    item.setSavePath(target);
    item.once('done', (ev, state) => {
      if (state !== 'completed') return;
      if (/\.eml$/i.test(target)) shell.openPath(target);
      else shell.showItemInFolder(target);
    });
  });

  // Drucken: Drucker oder direkt als PDF speichern
  ipcMain.handle('print', async (e) => {
    const w = BrowserWindow.fromWebContents(e.sender);
    const { response } = await dialog.showMessageBox(w, {
      type: 'question', title: 'Drucken',
      message: 'Was möchtest du mit deinem A4-Blatt machen?',
      buttons: ['🖨  Drucken', '📄  Als PDF speichern', 'Abbrechen'],
      defaultId: 0, cancelId: 2, noLink: true
    });
    if (response === 0) {
      await new Promise(res => e.sender.print({ silent: false, printBackground: true }, () => res()));
    } else if (response === 1) {
      const d = new Date(), pad = n => String(n).padStart(2, '0');
      const { canceled, filePath } = await dialog.showSaveDialog(w, {
        title: 'Als PDF speichern',
        defaultPath: path.join(app.getPath('downloads'), `Tagesplan ${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}.pdf`),
        filters: [{ name: 'PDF', extensions: ['pdf'] }]
      });
      if (canceled || !filePath) return;
      const pdf = await e.sender.printToPDF({ pageSize: 'A4', printBackground: true, preferCSSPageSize: true });
      fs.writeFileSync(filePath, pdf);
      shell.openPath(filePath);
    }
  });

  // Speicherkarte: normale Windows-Fenster und eine ganz normale Datei
  const CARD_FILTER = [{ name: 'Tagesplan-Speicherkarte', extensions: ['html'] }];
  ipcMain.handle('card-save', async (e, name) => {
    const { canceled, filePath } = await dialog.showSaveDialog(BrowserWindow.fromWebContents(e.sender), {
      title: 'Speicherkarte erstellen', defaultPath: path.join(app.getPath('documents'), name), filters: CARD_FILTER
    });
    return canceled ? null : filePath;
  });
  ipcMain.handle('card-open', async (e) => {
    const { canceled, filePaths } = await dialog.showOpenDialog(BrowserWindow.fromWebContents(e.sender), {
      title: 'Speicherkarte einstecken', defaultPath: app.getPath('documents'), properties: ['openFile'], filters: CARD_FILTER
    });
    return canceled ? null : filePaths[0];
  });
  ipcMain.handle('read-file', (e, p) => fs.readFileSync(p, 'utf8'));
  ipcMain.handle('write-file', (e, p, text) => {
    const tmp = p + '.tmp';
    fs.writeFileSync(tmp, text, 'utf8');
    fs.renameSync(tmp, p);
  });

  startUp();
});

// ---------- Start: Ladebalken mit Fredi, dabei nach Updates suchen ----------
function makeSplash() {
  const w = new BrowserWindow({
    width: 480, height: 320, frame: false, transparent: true, resizable: false, maximizable: false,
    fullscreenable: false, show: false, center: true, icon: ICON, title: 'Eat the Frog',
    backgroundColor: '#00000000', webPreferences: { contextIsolation: true, nodeIntegration: false }
  });
  w.once('ready-to-show', () => w.show());
  w.loadFile(path.join(__dirname, 'splash.html'));
  return w;
}
const sp = (code) => { if (splash && !splash.isDestroyed()) return splash.webContents.executeJavaScript(code).catch(() => {}); return Promise.resolve(); };
const wait = (ms) => new Promise(r => setTimeout(r, ms));

async function startUp() {
  splash = makeSplash();
  await new Promise(r => splash.webContents.once('did-finish-load', r));
  const started = Date.now();
  let skipped = false;
  splash.on('page-title-updated', (e, t) => { if (t === 'skip') skipped = true; });

  let result = 'none';                        // none | update | error
  if (app.isPackaged) {
    sp(`setStatus('Fredi schaut nach Updates …')`);
    const { autoUpdater } = require('electron-updater');
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = true;  // falls doch später fertig: still beim Schliessen installieren
    result = await Promise.race([
      autoUpdater.checkForUpdates().then(r => (r && r.isUpdateAvailable) ? 'update' : 'none').catch(() => 'error'),
      wait(8000).then(() => 'error')          // kein Internet / zu langsam: einfach starten
    ]);
    if (result === 'update') {
      sp(`setStatus('Neue Version wird geladen …')`);
      autoUpdater.on('download-progress', p => sp(`setDownload(${Math.round(p.percent || 0)})`));
      setTimeout(() => sp('showSkip()'), 12000);
      const done = await Promise.race([
        autoUpdater.downloadUpdate().then(() => 'ok').catch(() => 'fail'),
        new Promise(r => { const t = setInterval(() => { if (skipped) { clearInterval(t); r('skip'); } }, 200); })
      ]);
      if (done === 'ok') {
        await sp(`finish('Wird installiert … gleich geht’s los!')`);
        await wait(400);
        autoUpdater.quitAndInstall(true, true);   // still installieren und neu starten
        return;
      }
    }
  } else {
    sp(`setStatus('Fredi schaut nach Updates …')`);
    await wait(1400);
  }
  // Mindestens kurz zeigen, damit man Fredi hüpfen sieht
  const rest = 1600 - (Date.now() - started); if (rest > 0) await wait(rest);
  win = makeWindow(null, true);               // im Hintergrund laden, erst zeigen, wenn der Balken voll ist
  const ready = new Promise(r => win.once('ready-to-show', r));
  await Promise.all([ready, sp(`finish('Los geht’s! 🐸')`)]);
  win.show();
  if (splash && !splash.isDestroyed()) setTimeout(() => splash.close(), 120);
}

app.on('second-instance', () => { const w = (win && !win.isDestroyed()) ? win : splash; if (w && !w.isDestroyed()) { if (w.isMinimized()) w.restore(); w.focus(); } });
app.on('window-all-closed', () => app.quit());
