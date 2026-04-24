const { app, BrowserWindow } = require('electron');
const path = require('path');

// 1. Отключаем аппаратное ускорение для устранения ошибки GPU (exit_code=-1073740791)
app.disableHardwareAcceleration();

let mainWindow;

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    title: 'PrivacyGate AI',
    backgroundColor: '#f4fce8',
    webPreferences: {
      nodeIntegration: false,    // Безопасность: выключено
      contextIsolation: true,    // Безопасность: включено
      // Убедитесь, что путь к preload.cjs правильный относительно этого файла
      preload: path.join(__dirname, 'preload.cjs'),
    },
    // Проверьте путь к иконке (обычно в dev-режиме это public/icon.png)
    icon: path.join(__dirname, '../public/icon.png'),
  });

  const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
};

// Запуск приложения
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});