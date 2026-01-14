const { app, BrowserWindow, Menu, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let currentSavePath = null; // Track current save file path

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    minWidth: 800,
    minHeight: 600,
    frame: false, // We'll create our own Win95-style title bar
    backgroundColor: '#C0C0C0',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    },
    icon: path.join(__dirname, 'src/assets/icon.png')
  });

  mainWindow.loadFile('src/index.html');

  // Remove default menu
  Menu.setApplicationMenu(null);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC handlers for window controls
ipcMain.on('window-minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window-maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('window-close', () => {
  mainWindow?.close();
});

ipcMain.handle('window-is-maximized', () => {
  return mainWindow?.isMaximized() ?? false;
});

// File save dialog
ipcMain.handle('show-save-dialog', async () => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save City',
    defaultPath: currentSavePath || 'MyCity.cty',
    filters: [
      { name: 'ClaudeCity Save', extensions: ['cty'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (!result.canceled && result.filePath) {
    currentSavePath = result.filePath;
    return result.filePath;
  }
  return null;
});

// File open dialog
ipcMain.handle('show-open-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Load City',
    filters: [
      { name: 'ClaudeCity Save', extensions: ['cty'] },
      { name: 'All Files', extensions: ['*'] }
    ],
    properties: ['openFile']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    currentSavePath = result.filePaths[0];
    return result.filePaths[0];
  }
  return null;
});

// Save file to disk
ipcMain.handle('save-file', async (event, { filePath, data }) => {
  try {
    fs.writeFileSync(filePath, data, 'utf-8');
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Load file from disk
ipcMain.handle('load-file', async (event, filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf-8');
    return { success: true, data };
  } catch (error) {
    return { success: false, error: error.message };
  }
});

// Get current save path
ipcMain.handle('get-current-save-path', () => {
  return currentSavePath;
});

// Quick save (to current path)
ipcMain.handle('quick-save', async (event, data) => {
  if (!currentSavePath) {
    // No current path, need to show dialog
    return { success: false, needsDialog: true };
  }

  try {
    fs.writeFileSync(currentSavePath, data, 'utf-8');
    return { success: true, filePath: currentSavePath };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
