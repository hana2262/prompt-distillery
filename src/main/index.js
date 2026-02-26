const { app, BrowserWindow, ipcMain, Menu, Tray, globalShortcut, nativeImage } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let tray = null;

const WINDOW_MODES = {
  mini: { width: 300, height: 200, resizable: false },
  standard: { width: 800, height: 600, resizable: true },
  editor: { width: 1200, height: 800, resizable: true }
};

const DEFAULT_SETTINGS = {
  window: {
    mode: 'standard'
  },
  clipboardMonitor: {
    enabled: false,
    autoCapture: false,
    ignoreKeywords: ['password', 'token', '密钥', '密码', 'secret', 'api_key', 'apikey']
  },
  theme: {
    accentColor: '#10B981',
    backgroundImage: '',
    glassEffect: true
  }
};

let clipboardMonitorTimer = null;
let lastClipboardText = '';

let settingsPath = null;

function getSettingsPath() {
  if (!settingsPath && app.isReady()) {
    settingsPath = path.join(app.getPath('userData'), 'settings.json');
  }
  return settingsPath;
}

let settings = { ...DEFAULT_SETTINGS };

function loadSettings() {
  try {
    const sp = getSettingsPath();
    if (sp && fs.existsSync(sp)) {
      const data = fs.readFileSync(sp, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Failed to load settings:', err);
  }
  return { ...DEFAULT_SETTINGS };
}

function saveSettings() {
  try {
    const sp = getSettingsPath();
    if (sp) {
      fs.writeFileSync(sp, JSON.stringify(settings, null, 2), 'utf8');
    }
  } catch (err) {
    console.error('Failed to save settings:', err);
  }
}

function createWindow() {
  const mode = settings.window.mode || 'standard';
  const config = WINDOW_MODES[mode];

  mainWindow = new BrowserWindow({
    width: config.width,
    height: config.height,
    minWidth: mode === 'mini' ? 300 : 400,
    minHeight: mode === 'mini' ? 200 : 300,
    resizable: config.resizable,
    frame: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    console.log(`Window opened in ${mode} mode`);
  });

  mainWindow.on('close', (event) => {
    if (mode === 'mini') {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  createMenu();
  console.log('Main window created');
}

function createMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '迷你模式',
          click: () => switchWindowMode('mini')
        },
        {
          label: '标准模式',
          click: () => switchWindowMode('standard')
        },
        {
          label: '编辑模式',
          click: () => switchWindowMode('editor')
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.isQuitting = true;
            app.quit();
          }
        }
      ]
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' }
      ]
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '刷新' },
        { role: 'forceReload', label: '强制刷新' },
        { role: 'toggleDevTools', label: '开发者工具' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' }
      ]
    },
    {
      label: '窗口',
      submenu: [
        { role: 'minimize', label: '最小化' },
        { role: 'close', label: '关闭' },
        { type: 'separator' },
        {
          label: '切换到迷你模式',
          accelerator: 'CmdOrCtrl+1',
          click: () => switchWindowMode('mini')
        },
        {
          label: '切换到标准模式',
          accelerator: 'CmdOrCtrl+2',
          click: () => switchWindowMode('standard')
        },
        {
          label: '切换到编辑模式',
          accelerator: 'CmdOrCtrl+3',
          click: () => switchWindowMode('editor')
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

function switchWindowMode(mode) {
  if (!mainWindow) return;

  // Get target mode's config from constant
  const config = WINDOW_MODES[mode];

  // Update mode and save
  settings.window.mode = mode;
  saveSettings();

  // Set window size to constant value
  mainWindow.setSize(config.width, config.height);
  mainWindow.center();

  // Set resizable state
  mainWindow.setResizable(mode !== 'mini');

  mainWindow.webContents.send('window:mode-changed', mode);
  console.log(`Switched to ${mode} mode`);
}

function createTray() {
  const iconPath = path.join(__dirname, '../../assets/icon.png');
  let trayIcon;

  try {
    trayIcon = nativeImage.createFromPath(iconPath);
    if (trayIcon.isEmpty()) {
      trayIcon = nativeImage.createEmpty();
    }
  } catch {
    trayIcon = nativeImage.createEmpty();
  }

  tray = new Tray(trayIcon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: '显示窗口',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      }
    },
    { type: 'separator' },
    {
      label: '迷你模式',
      click: () => switchWindowMode('mini')
    },
    {
      label: '标准模式',
      click: () => switchWindowMode('standard')
    },
    {
      label: '编辑模式',
      click: () => switchWindowMode('editor')
    },
    { type: 'separator' },
    {
      label: '退出',
      click: () => {
        app.isQuitting = true;
        app.quit();
      }
    }
  ]);

  tray.setToolTip('Prompt 蒸馏器');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  console.log('System tray created');
}

function registerGlobalShortcuts() {
  globalShortcut.register('CommandOrControl+Shift+P', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });

  globalShortcut.register('CommandOrControl+M', () => {
    const modes = ['mini', 'standard', 'editor'];
    const currentIndex = modes.indexOf(settings.window.mode);
    const nextIndex = (currentIndex + 1) % modes.length;
    switchWindowMode(modes[nextIndex]);
  });

  console.log('Global shortcuts registered');
}

function checkSensitiveWords(text) {
  const keywords = settings.clipboardMonitor?.ignoreKeywords || [];
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}

function startClipboardMonitor() {
  if (clipboardMonitorTimer) return;

  const { clipboard } = require('electron');
  lastClipboardText = clipboard.readText();

  clipboardMonitorTimer = setInterval(() => {
    try {
      const currentText = clipboard.readText();
      if (currentText && currentText !== lastClipboardText) {
        lastClipboardText = currentText;

        if (!checkSensitiveWords(currentText)) {
          if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.webContents.send('clipboard:changed', currentText);
            console.log('Clipboard changed, sent to renderer');
          }
        } else {
          console.log('Clipboard ignored (sensitive words)');
        }
      }
    } catch (err) {
      console.error('Clipboard monitor error:', err);
    }
  }, 500);

  console.log('Clipboard monitor started');
}

function stopClipboardMonitor() {
  if (clipboardMonitorTimer) {
    clearInterval(clipboardMonitorTimer);
    clipboardMonitorTimer = null;
    console.log('Clipboard monitor stopped');
  }
}

ipcMain.handle('window:minimize', () => {
  if (mainWindow) mainWindow.minimize();
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow) {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  }
});

ipcMain.handle('window:close', () => {
  if (mainWindow) mainWindow.close();
});

ipcMain.handle('window:get-mode', () => {
  return settings.window.mode;
});

ipcMain.handle('window:switch-mode', (event, mode) => {
  switchWindowMode(mode);
  return mode;
});

ipcMain.handle('settings:get', () => {
  return settings;
});

ipcMain.handle('settings:set', (event, newSettings) => {
  settings = { ...settings, ...newSettings };
  saveSettings();
  return settings;
});

ipcMain.handle('clipboard:read', () => {
  const { clipboard } = require('electron');
  return clipboard.readText();
});

ipcMain.handle('clipboard:write', (event, text) => {
  const { clipboard } = require('electron');
  clipboard.writeText(text);
  return true;
});

ipcMain.handle('clipboard:start-monitor', () => {
  if (!settings.clipboardMonitor.enabled) {
    settings.clipboardMonitor.enabled = true;
    saveSettings();
  }
  startClipboardMonitor();
  return true;
});

ipcMain.handle('clipboard:stop-monitor', () => {
  if (settings.clipboardMonitor.enabled) {
    settings.clipboardMonitor.enabled = false;
    saveSettings();
  }
  stopClipboardMonitor();
  return true;
});

ipcMain.handle('clipboard:get-status', () => {
  return {
    enabled: settings.clipboardMonitor?.enabled || false,
    ignoreKeywords: settings.clipboardMonitor?.ignoreKeywords || []
  };
});

app.whenReady().then(() => {
  settings = loadSettings();
  createWindow();
  createTray();
  registerGlobalShortcuts();

  if (settings.clipboardMonitor?.enabled) {
    startClipboardMonitor();
  }

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

app.on('before-quit', () => {
  app.isQuitting = true;
});

app.on('will-quit', () => {
  stopClipboardMonitor();
  globalShortcut.unregisterAll();
});
