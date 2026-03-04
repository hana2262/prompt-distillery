# Prompt Distillery V2 - AI 记忆文档

> 本文档记录了 Prompt Distillery V2 的完整技术架构、设计决策和开发历史。作为项目的"存档"，本文档旨在帮助未来的 AI 开发者快速理解代码库、延续开发工作。

---

## 1. 项目概述

### 1.1 目标与定位

Prompt Distillery V2 是一款**AI 驱动的 Prompt 整理工具**，旨在帮助用户：
- 监听并捕获剪贴板内容
- 管理和整理 Prompt 模板
- 使用 AI 算法分析、查重、合并 Prompt
- 提供多窗口模式适配不同工作场景

### 1.2 版本信息

| 项目 | 信息 |
|------|------|
| 当前版本 | 1.0.0 |
| 发布日期 | 2026-02-27 |
| 打包格式 | Windows .exe (NSIS/Squirrel) |
| 安装包位置 | `out/make/squirrel.windows/x64/PromptDistillery-Setup.exe` |

---

## 2. 技术栈

### 2.1 核心技术

| 技术 | 版本 | 用途 |
|------|------|------|
| Electron | ^40.6.1 | 桌面应用框架 |
| Vue 3 | ^3.x (CDN) | 前端框架 (Composition API) |
| Tailwind CSS | ^3.x (CDN) | UI 样式框架 |
| localStorage | - | 本地数据存储 |
| electron-forge | ^7.11.1 | 打包构建工具 |

### 2.2 构建与开发工具

```json
{
  "scripts": {
    "start": "electron-forge start",
    "package": "electron-forge package",
    "make": "electron-forge make"
  }
}
```

### 2.3 打包配置

- **打包工具**: electron-forge
- **输出目录**: `out/`
- **安装包格式**: `.exe` (Squirrel.Windows)
- **应用图标**: `assets/icon.png`

---

## 3. 目录结构

```
prompt-distillery-v2/
├── .claude/                    # Claude Code 配置
│   └── plan.md                 # 项目里程碑计划
├── assets/                     # 静态资源
│   └── icon.png                # 应用图标 (69KB)
├── docs/                       # 文档
│   └── PRD.md                  # 产品需求文档
├── src/
│   ├── main/
│   │   ├── index.js            # Electron 主进程入口 (~490行)
│   │   └── preload.js          # Context Bridge 预加载脚本 (~35行)
│   └── renderer/
│       ├── index.html          # HTML + Vue 模板 (~700行)
│       └── app.js              # Vue 应用逻辑 (~700行)
├── out/                        # 打包输出
│   ├── make/
│   │   └── squirrel.windows/x64/
│   │       └── PromptDistillery-Setup.exe  # 安装包 (~128MB)
│   └── PromptDistillery-win32-x64/          # 解压版应用
├── package.json                # 项目配置
└── CLAUDE.md                   # AI 开发指南
```

---

## 4. 核心模块详解

### 4.1 主进程 (src/main/index.js)

**职责**：窗口管理、系统托盘、全局快捷键、剪贴板监听、设置持久化

#### 4.1.1 窗口模式

定义了三种窗口模式：

```javascript
const WINDOW_MODES = {
  mini: { width: 300, height: 200, resizable: false },      // 300x200, 固定大小
  standard: { width: 800, height: 600, resizable: true },    // 800x600, 可调整
  editor: { width: 1200, height: 800, resizable: true }       // 1200x800, 大编辑器
};
```

#### 4.1.2 默认设置

```javascript
const DEFAULT_SETTINGS = {
  window: { mode: 'standard' },
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
```

#### 4.1.3 IPC 处理器

| 通道 | 功能 |
|------|------|
| `window:minimize` | 最小化窗口 |
| `window:maximize` | 最大化/还原窗口 |
| `window:close` | 关闭窗口 |
| `window:get-mode` | 获取当前窗口模式 |
| `window:switch-mode` | 切换窗口模式 |
| `settings:get` | 获取设置 |
| `settings:set` | 保存设置 |
| `clipboard:read` | 读取剪贴板 |
| `clipboard:write` | 写入剪贴板 |
| `clipboard:start-monitor` | 启动剪贴板监听 |
| `clipboard:stop-monitor` | 停止剪贴板监听 |
| `clipboard:get-status` | 获取监听状态 |
| `background:save` | 保存背景图片到文件系统 |

#### 4.1.4 敏感词过滤

```javascript
function checkSensitiveWords(text) {
  const keywords = settings.clipboardMonitor?.ignoreKeywords || [];
  const lowerText = text.toLowerCase();
  return keywords.some(keyword => lowerText.includes(keyword.toLowerCase()));
}
```

#### 4.1.5 全局快捷键

| 快捷键 | 功能 |
|--------|------|
| `Ctrl+Shift+P` | 显示/隐藏窗口 |
| `Ctrl+M` | 循环切换窗口模式 |
| `Ctrl+1` | 切换到迷你模式 |
| `Ctrl+2` | 切换到标准模式 |
| `Ctrl+3` | 切换到编辑模式 |

### 4.2 预加载脚本 (src/main/preload.js)

使用 Context Bridge 安全暴露 API：

```javascript
contextBridge.exposeInMainWorld('electronAPI', {
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close: () => ipcRenderer.invoke('window:close'),
    getMode: () => ipcRenderer.invoke('window:get-mode'),
    switchMode: (mode) => ipcRenderer.invoke('window:switch-mode', mode),
    onModeChanged: (callback) => {
      ipcRenderer.on('window:mode-changed', (event, mode) => callback(mode));
    }
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (newSettings) => ipcRenderer.invoke('settings:set', newSettings)
  },
  clipboard: {
    read: () => ipcRenderer.invoke('clipboard:read'),
    write: (text) => ipcRenderer.invoke('clipboard:write', text),
    startMonitor: () => ipcRenderer.invoke('clipboard:start-monitor'),
    stopMonitor: () => ipcRenderer.invoke('clipboard:stop-monitor'),
    getStatus: () => ipcRenderer.invoke('clipboard:get-status'),
    onChanged: (callback) => {
      ipcRenderer.on('clipboard:changed', (event, text) => callback(text));
    }
  },
  background: {
    save: (base64Data) => ipcRenderer.invoke('background:save', base64Data)
  }
});
```

### 4.3 渲染进程

#### 4.3.1 Vue 3 Composition API

使用 Vue 3 的 Composition API (`ref`, `computed`, `watch`, `onMounted`)：

```javascript
const { createApp, ref, computed, onMounted, watch } = Vue;

const App = {
  setup() {
    const windowMode = ref('standard');
    const templates = ref([]);
    const settings = ref({...});
    // ...
  }
};
```

#### 4.3.2 数据存储策略

**关键设计决策**：
- **主题设置** → `localStorage` (支持自定义背景 URL 数组)
- **模板数据** → `localStorage`
- **系统设置** → Electron API → `settings.json` 文件

```javascript
// 加载设置 - 注意顺序
async function loadSettings() {
  // 1. 先从 localStorage 加载主题（包含自定义背景）
  const storedTheme = localStorage.getItem('themeSettings');
  if (storedTheme) {
    const themeData = JSON.parse(storedTheme);
    settings.value.theme = { ...settings.value.theme, ...themeData };
  }
  // 2. 再从 Electron API 加载其他设置
  const loaded = await window.electronAPI.settings.get();
  if (loaded) {
    const { theme, ...otherSettings } = loaded;  // 注意：不覆盖 theme
    settings.value = { ...settings.value, ...otherSettings };
  }
}

async function saveSettings() {
  // 1. 保存主题到 localStorage
  localStorage.setItem('themeSettings', JSON.stringify(settings.value.theme));
  // 2. 保存其他设置到 Electron
  await window.electronAPI.settings.set(settings.value);
}
```

#### 4.3.3 模板数据结构

```javascript
{
  id: 'uuid',
  name: '模板名称',
  content: '模板内容，支持 {{variable}} 变量',
  category: ['分类1', '分类2'],
  tags: ['标签1', '标签2'],
  pinned: false,
  createdAt: '2026-02-27T12:00:00Z',
  usage: {
    lastUsed: '2026-02-27T14:00:00Z',
    count: 5
  },
  versions: [
    { content: '旧版本', timestamp: '...' }
  ]
}
```

#### 4.3.4 AI 分析功能

**查重算法 (Jaccard Similarity)**：

```javascript
function calculateSimilarity(text1, text2) {
  const set1 = new Set(text1.toLowerCase().split(/\s+/));
  const set2 = new Set(text2.toLowerCase().split(/\s+/));
  const intersection = new Set([...set1].filter(x => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return intersection.size / union.size;
}
```

**Diff 对比视图**：简单的行级 diff 算法，高亮显示差异。

**自动标签**：基于内容的关键词提取。

---

## 5. 关键技术决策

### 5.1 为什么选择 localStorage？

1. **简单快速**：无需服务器，零配置
2. **足够容量**：对于文本数据足够（~5MB）
3. **跨会话持久化**：重启应用后数据仍在
4. **与 Electron 设置分离**：主题设置保存在 localStorage，系统设置保存在文件系统

### 5.2 为什么使用 Context Bridge？

- **安全隔离**：Renderer 进程无法直接访问 Node.js API
- **明确接口**：只暴露必要的 API，减少攻击面
- **IPC 通信**：通过 `ipcRenderer.invoke` 和 `ipcMain.handle` 实现双向通信

### 5.3 窗口模式设计

- **迷你模式**：固定大小，适合快速访问
- **标准模式**：默认工作模式
- **编辑模式**：大屏编辑，适合复杂 Prompt

### 5.4 背景图片存储方案

**问题**：Base64 直接存 localStorage 会超限

**解决方案**：
- 本地图片 → 保存到 `userData/backgrounds/bg.jpg`，返回 `__local_bg__` 标记
- 网络图片 → 保存 URL 到 `customBackgrounds` 数组
- 预设图片 → 预设 URL 列表

### 5.5 WebSecurity 配置

```javascript
webPreferences: {
  preload: path.join(__dirname, 'preload.js'),
  contextIsolation: true,
  nodeIntegration: false,
  webSecurity: false  // 允许加载本地文件
}
```

`webSecurity: false` 允许加载本地背景图片，但带来了安全风险。如需更安全的方案，考虑使用 `file://` 协议白名单。

---

## 6. 开发历史

### 里程碑

| 里程碑 | 完成日期 | 内容 |
|--------|----------|------|
| M1 | 2026-02-25 | 基础框架 (Electron + Vue + Tailwind) |
| M2 | 2026-02-26 | 剪贴板监听功能 |
| M3 | 2026-02-26 | 模板管理 CRUD |
| M4 | 2026-02-27 | AI 分析功能 (查重、合并、标签、Diff) |
| M5 | 2026-02-27 | 完善优化 (托盘、快捷键、主题、Toast) |
| M6 | 2026-02-27 | 打包发布 (生成 .exe 安装包) |

### 关键修复记录

1. **主题色切换不生效**：添加 `saveSettings()` 和 `watch()` 自动保存
2. **背景图片不持久化**：修正 `loadSettings()` 加载顺序，避免覆盖 theme
3. **本地背景图片加载失败**：改用 URL 方案而非直接文件路径
4. **打包缺少作者信息**：在 `package.json` 添加 `author` 字段

---

## 7. 下一步开发计划 (Roadmap)

### 7.1 v1.1 潜在功能

1. **云同步**
   - 支持账户登录
   - 模板云端同步
   - 多设备同步

2. **Prompt 市场**
   - 分享模板到社区
   - 下载他人模板
   - 模板评分系统

3. **高级 AI 功能**
   - GPT 模型选择
   - Prompt 优化建议
   - 自动生成 Prompt

4. **插件系统**
   - 支持第三方插件
   - 自定义变量类型

5. **导出/导入**
   - 支持 JSON/Markdown 导出
   - 批量导入

### 7.2 技术债务

1. **代码组织**：考虑拆分为组件文件
2. **测试**：添加单元测试和 E2E 测试
3. **TypeScript**：迁移到 TypeScript 以提高类型安全
4. **CSP 改进**：优化 Content Security Policy

---

## 8. 注意事项 (给 AI 开发者)

### 8.1 开发环境

```bash
# 安装依赖
npm install

# 开发模式
npm run start

# 打包
npm run make
```

### 8.2 调试技巧

- 使用 `console.log()` 输出到终端
- 使用 `mainWindow.webContents.openDevTools()` 打开开发者工具
- 检查 `out/PromptDistillery-win32-x64/` 下的日志

### 8.3 常见问题

1. **窗口不显示**：检查 `mainWindow.loadFile()` 路径
2. **IPC 不工作**：确认 `contextIsolation: true` 和 `preload` 路径
3. **背景图片不显示**：检查 `webSecurity` 设置和 CSP
4. **设置不保存**：检查 `settings.json` 写入权限

### 8.4 重要文件

| 文件 | 作用 |
|------|------|
| `src/main/index.js` | 主进程，所有系统交互 |
| `src/main/preload.js` | IPC 桥接 |
| `src/renderer/app.js` | Vue 逻辑核心 |
| `src/renderer/index.html` | UI 模板 |
| `package.json` | 依赖和构建配置 |

### 8.5 代码风格

- 使用 ESLint + Prettier
- 遵循 Vue 3 Composition API 最佳实践
- 使用 Tailwind CSS 类名

---

## 9. 附录

### 9.1 相关文档

- [PRD.md](docs/PRD.md) - 产品需求文档
- [CLAUDE.md](CLAUDE.md) - AI 开发指南
- [.claude/plan.md](.claude/plan.md) - 项目里程碑

### 9.2 联系方式

- 作者：Prompt Distillery Team
- 许可证：ISC

---

> 本文档最后更新于 2026-02-27
