const { app, BrowserWindow, Tray, Menu, nativeImage, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const os = require('os');
const crypto = require('crypto');
const fs = require('fs');

// Keep references to prevent GC
let mainWindow = null;
let tray = null;
let isQuitting = false;
let serverInstance = null;
let closeDb = null;

// --- Persistent config (JWT secret, stored in userData) ---
function getConfig() {
  const configPath = path.join(app.getPath('userData'), 'config.json');
  try {
    return JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch {
    const config = { jwtSecret: crypto.randomUUID() };
    fs.mkdirSync(path.dirname(configPath), { recursive: true });
    fs.writeFileSync(configPath, JSON.stringify(config));
    return config;
  }
}

// --- Environment setup (must be done before importing server) ---
const config = getConfig();
process.env.JWT_SECRET = config.jwtSecret;
process.env.DB_PATH = path.join(app.getPath('userData'), 'data', 'gantt.db');

// --- Get LAN IP ---
function getLanIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// --- Create status window ---
function createWindow(serverInfo) {
  mainWindow = new BrowserWindow({
    width: 520,
    height: 620,
    resizable: false,
    title: 'Gantt Project Server',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, 'status.html'));
  mainWindow.setMenuBarVisibility(false);

  // Send server info once page loads
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('server-info', serverInfo);
  });

  // Close = hide to tray
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

// --- Create system tray ---
function createTray(serverInfo) {
  const iconPath = path.join(__dirname, 'icon.png');
  let trayIcon;
  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    trayIcon = trayIcon.resize({ width: 16, height: 16 });
  } catch {
    // Fallback: create a 16x16 empty image
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);
  tray.setToolTip(`Gantt Project Server - http://${serverInfo.lanIp}:${serverInfo.port}`);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Status Window',
      click: () => mainWindow?.show(),
    },
    {
      label: `Open in Browser (http://${serverInfo.lanIp}:${serverInfo.port})`,
      click: () => shell.openExternal(`http://${serverInfo.lanIp}:${serverInfo.port}`),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        isQuitting = true;
        app.quit();
      },
    },
  ]);
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    mainWindow?.show();
  });
}

// --- IPC handlers ---
ipcMain.handle('open-browser', (event, url) => {
  shell.openExternal(url);
});

ipcMain.handle('quit-app', () => {
  isQuitting = true;
  app.quit();
});

// --- Try starting server with port fallback ---
async function startServer() {
  const lanIp = getLanIp();
  let lastError = null;

  for (let port = 3001; port < 3011; port++) {
    try {
      const serverPath = app.isPackaged
        ? path.join(process.resourcesPath, 'server', 'server.mjs')
        : path.join(__dirname, '..', 'server', 'src', 'index.js');

      const staticDir = app.isPackaged
        ? path.join(process.resourcesPath, 'client', 'dist')
        : path.join(__dirname, '..', 'client', 'dist');

      const serverModule = await import(pathToFileURL(serverPath).href);
      closeDb = serverModule.closeDb;
      const result = await serverModule.start({
        port,
        host: '0.0.0.0',
        staticDir: fs.existsSync(staticDir) ? staticDir : undefined,
        log: false,
        jwtSecret: config.jwtSecret,
      });

      serverInstance = result.app;

      const serverInfo = { lanIp, port: result.port, url: `http://${lanIp}:${result.port}` };
      console.log(`Server started at ${serverInfo.url}`);

      createWindow(serverInfo);
      createTray(serverInfo);
      return;
    } catch (err) {
      lastError = err;
      if (err.code !== 'EADDRINUSE') break;
      console.log(`Port ${port} in use, trying ${port + 1}...`);
    }
  }

  // All ports failed
  dialog.showErrorBox('Server Error', `Failed to start server:\n${lastError?.message || lastError}`);
  app.quit();
}

// --- Dev mode: connect to Vite dev server ---
async function startDev() {
  const lanIp = getLanIp();
  // Dev mode: Vite serves the SPA on 5173, server provides API on 3001
  const port = 5173;
  const serverInfo = { lanIp, port, url: `http://${lanIp}:${port}` };
  createWindow(serverInfo);
  createTray(serverInfo);
}

// --- App lifecycle ---
app.whenReady().then(() => {
  if (process.env.ELECTRON_DEV === 'true') {
    startDev();
  } else {
    startServer();
  }
});

app.on('window-all-closed', () => {
  // Don't quit on macOS (no menu bar), or on other platforms either - keep in tray
});

app.on('before-quit', () => {
  isQuitting = true;
  if (serverInstance) {
    serverInstance.close();
  }
  if (typeof closeDb === 'function') {
    closeDb();
  }
});

app.on('activate', () => {
  // macOS: re-create window if dock icon clicked
  if (mainWindow) {
    mainWindow.show();
  }
});
