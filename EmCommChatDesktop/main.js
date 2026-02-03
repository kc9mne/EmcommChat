const { app, BrowserWindow } = require('electron');

// CHANGE THIS to your server IP!
const SERVER_URL = 'http://192.168.3.113:3000';

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Allow HTTP microphone access
      additionalArguments: [
        '--unsafely-treat-insecure-origin-as-secure=' + SERVER_URL
      ]
    },
    icon: __dirname + '/icon.png'
  });

  // Load EmComm Chat server
  mainWindow.loadURL(SERVER_URL);

  // FIX 1: Clean up window reference when closed
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // FIX 2: Properly handle window close
  mainWindow.on('close', () => {
    mainWindow = null;
  });
}

// FIX 3: Quit when all windows closed (even on macOS)
app.on('window-all-closed', () => {
  app.quit(); // Force quit on all platforms
});

// FIX 4: Ensure clean quit
app.on('before-quit', () => {
  if (mainWindow) {
    mainWindow.destroy();
    mainWindow = null;
  }
});

// FIX 5: Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  
  app.on('ready', createWindow);
}

// Additional cleanup on exit signals
process.on('SIGTERM', () => {
  app.quit();
});

process.on('SIGINT', () => {
  app.quit();
});