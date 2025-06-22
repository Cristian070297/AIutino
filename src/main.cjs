const { app, BrowserWindow, ipcMain, desktopCapturer } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  const win = new BrowserWindow({
    width: 400,
    height: 350,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow = win;

  win.setContentProtection(true);

  win.loadURL('http://localhost:5173');
}

app.whenReady().then(createWindow);

ipcMain.on('close-app', () => {
  app.quit();
});

ipcMain.on('resize-window', (event, { width, height }) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    win.setSize(width, height, true);
  }
});

ipcMain.on('capture-screen', async (event) => {
  try {
    mainWindow.hide();
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 1920, height: 1080 },
    });

    if (sources.length === 0) {
      event.reply('capture-screen-response', {
        success: false,
        error: 'No screen sources found.',
      });
      return;
    }

    const primarySource = sources.find(
      (source) => source.display_id === require('electron').screen.getPrimaryDisplay().id.toString()
    ) || sources[0];

    const screenshot = primarySource.thumbnail.toDataURL();
    mainWindow.show();
    event.reply('capture-screen-response', { success: true, screenshot });
  } catch (error) {
    console.error('Failed to capture screen:', error);
    mainWindow.show();
    event.reply('capture-screen-response', {
      success: false,
      error: error.message,
    });
  }
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
