# Main Process (主进程)

## 职责

- 窗口管理 (BrowserWindow)
- 系统集成 (菜单、托盘)
- IPC 通信处理
- 文件系统操作
- 全局快捷键注册

## IPC 监听清单 (ipcMain)

| Channel | 说明 | 参数 | 返回值 |
|---------|------|------|--------|
| `window:minimize` | 最小化窗口 | - | - |
| `window:maximize` | 最大化/还原窗口 | - | - |
| `window:close` | 关闭窗口 | - | - |
| `window:get-mode` | 获取当前窗口模式 | - | `string` (mini/standard/editor) |
| `window:switch-mode` | 切换窗口模式 | `mode: string` | `string` |
| `settings:get` | 获取应用设置 | - | `object` |
| `settings:set` | 更新应用设置 | `newSettings: object` | `object` |
| `clipboard:read` | 读取剪贴板 | - | `string` |
| `clipboard:write` | 写入剪贴板 | `text: string` | `boolean` |
| `clipboard:start-monitor` | 启动剪贴板监听 | - | `boolean` |
| `clipboard:stop-monitor` | 停止剪贴板监听 | - | `boolean` |
| `clipboard:get-status` | 获取监听状态 | - | `{enabled, ignoreKeywords}` |
| `clipboard:changed` | 剪贴板变化通知 | - | (渲染进程接收) |

## 核心模块

### main/index.js
入口文件，负责应用启动、窗口创建、菜单、托盘、快捷键。

### main/preload.js
ContextBridge 暴露安全 API 给渲染进程。

## 窗口模式

| 模式 | 尺寸 | 可调整大小 |
|------|------|-----------|
| Mini | 300x200 | 否 |
| Standard | 800x600 | 是 |
| Editor | 1200x800 | 是 |

## 全局快捷键

| 快捷键 | 功能 |
|--------|------|
| Ctrl+Shift+P | 显示/隐藏窗口 |
| Ctrl+M | 循环切换窗口模式 |
| Ctrl+1 | 切换到 Mini 模式 |
| Ctrl+2 | 切换到 Standard 模式 |
| Ctrl+3 | 切换到 Editor 模式 |

## 更新日志

- 2026-02-25: 初始化文档，实现基础框架
- 2026-02-26: 实现剪贴板监听功能，敏感词过滤
