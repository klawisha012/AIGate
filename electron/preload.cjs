const { contextBridge } = require('electron');

// Пробрасываем безопасное API в браузерное окно
contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  isElectron: true,
  getVersion: () => process.versions.electron,
  // Сюда можно добавить функции для связи через ipcRenderer
});