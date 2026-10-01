const { contextBridge, ipcRenderer } = require('electron');
// Kleine Brücke zur App: Drucken (Drucker oder PDF)
contextBridge.exposeInMainWorld('desktopApp', {
  print: () => ipcRenderer.invoke('print')
});
