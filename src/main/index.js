const { app, BrowserWindow, ipcMain, Menu, Tray, globalShortcut, nativeImage, dialog } = require('electron');
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
  },
  autoBackup: true
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

  // 加载应用图标
  const iconPath = path.join(__dirname, '../../assets/icon.png');
  let appIcon;
  try {
    appIcon = nativeImage.createFromPath(iconPath);
    if (appIcon.isEmpty()) {
      appIcon = undefined;
    }
  } catch {
    appIcon = undefined;
  }

  mainWindow = new BrowserWindow({
    width: config.width,
    height: config.height,
    minWidth: mode === 'mini' ? 300 : 400,
    minHeight: mode === 'mini' ? 200 : 300,
    resizable: config.resizable,
    frame: true,
    show: false,
    icon: appIcon,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
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

// 背景图片保存路径
function getBackgroundPath() {
  const userDataPath = app.getPath('userData');
  const bgPath = path.join(userDataPath, 'backgrounds');
  if (!fs.existsSync(bgPath)) {
    fs.mkdirSync(bgPath, { recursive: true });
  }
  return bgPath;
}

// 备份目录路径
function getBackupPath() {
  const userDataPath = app.getPath('userData');
  const backupDir = path.join(userDataPath, 'backups');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  return backupDir;
}

// 保存背景图片到文件系统
ipcMain.handle('background:save', async (event, base64Data) => {
  try {
    const bgDir = getBackgroundPath();
    const filePath = path.join(bgDir, 'bg.jpg');

    // 移除 data:image/xxx;base64, 前缀
    const base64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');

    fs.writeFileSync(filePath, buffer);
    console.log('Background image saved to:', filePath);

    // 返回固定标识符
    // 返回标记
    return '__local_bg__';
  } catch (err) {
    console.error('Failed to save background image:', err);
    return null;
  }
});

// 数据导出
ipcMain.handle('data:export', async () => {
  try {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: '导出数据',
      defaultPath: `prompt-distillery-backup-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON Files', extensions: ['json'] }]
    });

    if (result.canceled || !result.filePath) {
      return { success: false, message: '已取消' };
    }

    // 从 localStorage 读取模板数据
    let templates = [];
    try {
      const stored = localStorage.getItem('templates');
      templates = stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to read templates:', e);
    }

    // 从 localStorage 读取主题设置
    let themeSettings = {};
    try {
      const stored = localStorage.getItem('themeSettings');
      themeSettings = stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.error('Failed to read theme settings:', e);
    }

    const exportData = {
      version: '1.1',
      exportTime: new Date().toISOString(),
      templates,
      themeSettings
    };

    fs.writeFileSync(result.filePath, JSON.stringify(exportData, null, 2), 'utf8');
    console.log('Data exported to:', result.filePath);

    return { success: true, message: '导出成功', count: templates.length };
  } catch (err) {
    console.error('Failed to export data:', err);
    return { success: false, message: '导出失败: ' + err.message };
  }
});

// 数据导入
ipcMain.handle('data:import', async () => {
  try {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '导入数据',
      filters: [{ name: 'JSON Files', extensions: ['json'] }],
      properties: ['openFile']
    });

    if (result.canceled || result.filePaths.length === 0) {
      return { success: false, message: '已取消' };
    }

    const filePath = result.filePaths[0];
    const content = fs.readFileSync(filePath, 'utf8');
    const importData = JSON.parse(content);

    // 验证数据结构（兼容旧版本 1.0）
    if (!importData.templates) {
      return { success: false, message: '无效的备份文件格式' };
    }

    return {
      success: true,
      message: '导入成功',
      templates: importData.templates || [],
      themeSettings: importData.themeSettings || {}
    };
  } catch (err) {
    console.error('Failed to import data:', err);
    return { success: false, message: '导入失败: ' + err.message };
  }
});

// 手动备份
ipcMain.handle('data:backup', async () => {
  try {
    const backupDir = getBackupPath();

    // 从 localStorage 读取模板数据
    let templates = [];
    try {
      const stored = localStorage.getItem('templates');
      templates = stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Failed to read templates:', e);
    }

    // 从 localStorage 读取主题设置
    let themeSettings = {};
    try {
      const stored = localStorage.getItem('themeSettings');
      themeSettings = stored ? JSON.parse(stored) : {};
    } catch (e) {
      console.error('Failed to read theme settings:', e);
    }

    const backupData = {
      version: '1.1',
      exportTime: new Date().toISOString(),
      templates,
      themeSettings
    };

    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const fileName = `backup_${timestamp}.json`;
    const filePath = path.join(backupDir, fileName);

    fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf8');
    console.log('Backup created:', filePath);

    // 清理旧备份（最多保留 10 个）
    cleanupOldBackups(backupDir);

    return { success: true, message: '备份成功' };
  } catch (err) {
    console.error('Failed to create backup:', err);
    return { success: false, message: '备份失败: ' + err.message };
  }
});

// 获取备份目录路径
ipcMain.handle('data:get-backup-path', () => {
  return getBackupPath();
});

// 打开备份目录
ipcMain.handle('data:open-backup-folder', () => {
  const { shell } = require('electron');
  const backupPath = getBackupPath();
  shell.openPath(backupPath);
  return true;
});

// 清理旧备份
function cleanupOldBackups(backupDir) {
  try {
    const files = fs.readdirSync(backupDir)
      .filter(f => f.startsWith('backup_') && f.endsWith('.json'))
      .map(f => ({
        name: f,
        path: path.join(backupDir, f),
        time: fs.statSync(path.join(backupDir, f)).mtime.getTime()
      }))
      .sort((a, b) => b.time - a.time);

    // 保留最新的 10 个备份
    if (files.length > 10) {
      files.slice(10).forEach(f => {
        fs.unlinkSync(f.path);
        console.log('Deleted old backup:', f.name);
      });
    }
  } catch (err) {
    console.error('Failed to cleanup old backups:', err);
  }
}

// 自动备份
function autoBackup() {
  if (settings.autoBackup !== false) { // 默认开启
    try {
      const backupDir = getBackupPath();

      // 检查今天是否已有备份
      const today = new Date().toISOString().slice(0, 10);
      const files = fs.readdirSync(backupDir).filter(f => f.includes(today));
      if (files.length > 0) {
        console.log('Backup already exists for today');
        return;
      }

      // 读取数据
      let templates = [];
      try {
        const stored = localStorage.getItem('templates');
        templates = stored ? JSON.parse(stored) : [];
      } catch (e) {}

      let themeSettings = {};
      try {
        const stored = localStorage.getItem('themeSettings');
        themeSettings = stored ? JSON.parse(stored) : {};
      } catch (e) {}

      const backupData = {
        version: '1.1',
        exportTime: new Date().toISOString(),
        templates,
        themeSettings
      };

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const fileName = `backup_${timestamp}.json`;
      const filePath = path.join(backupDir, fileName);

      fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), 'utf8');
      console.log('Auto backup created:', filePath);

      cleanupOldBackups(backupDir);
    } catch (err) {
      console.error('Auto backup failed:', err);
    }
  }
}

app.whenReady().then(() => {
  settings = loadSettings();
  createWindow();
  createTray();
  registerGlobalShortcuts();

  if (settings.clipboardMonitor?.enabled) {
    startClipboardMonitor();
  }

  // 自动备份
  setTimeout(() => {
    autoBackup();
  }, 3000);

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
