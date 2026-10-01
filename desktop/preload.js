const { contextBridge, ipcRenderer } = require('electron');
// Kleine Brücke zur App: Drucken (Drucker oder PDF) und die Speicherkarte als normale Datei
contextBridge.exposeInMainWorld('desktopApp', {
  print: () => ipcRenderer.invoke('print'),
  cardSave: (name) => ipcRenderer.invoke('card-save', name),
  cardOpen: () => ipcRenderer.invoke('card-open'),
  readFile: (p) => ipcRenderer.invoke('read-file', p),
  writeFile: (p, text) => ipcRenderer.invoke('write-file', p, text)
});
