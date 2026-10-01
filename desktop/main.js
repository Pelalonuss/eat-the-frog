// Eat the Frog – Windows-Programm (Electron-Hülle um index.html)
const { app, BrowserWindow, ipcMain, dialog, shell, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

if (!app.requestSingleInstanceLock()) app.quit();

let win;
const PRELOAD = path.join(__dirname, 'preload.js');
const ICON = path.join(__dirname, 'app', 'icon-512.png');

function makeWindow(url) {
  const w = new BrowserWindow({
    width: 1360, height: 900, minWidth: 900, minHeight: 600,
    backgroundColor: '#0a1311', icon: ICON, title: 'Eat the Frog',
    autoHideMenuBar: true, show: false,
    webPreferences: { preload: PRELOAD, contextIsolation: true, nodeIntegration: false, spellcheck: true }
  });
  w.once('ready-to-show', () => w.show());
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

  win = makeWindow();
});

app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.on('window-all-closed', () => app.quit());
