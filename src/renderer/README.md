# Renderer Process (渲染进程)

## 职责

- UI 组件渲染
- 用户交互处理
- 状态管理 (Vue 3 Composition API)
- 与主进程 IPC 通信

## 目录结构

```
renderer/
├── index.html          # 入口 HTML + 模板
├── app.js             # 主入口 (~160行)
├── composables/       # Vue Composables
│   ├── useWindowMode.mjs   # 窗口模式控制
│   ├── useClipboard.mjs    # 剪贴板监听
│   └── useTheme.mjs        # 主题管理
├── components/        # 公共组件
│   └── Toast.mjs      # 通知组件
└── utils/             # 工具函数
    ├── templateUtils.mjs  # 模板操作
    └── storageUtils.mjs   # localStorage 操作
```

## 模块说明

| 模块 | 功能 |
|------|------|
| useWindowMode | 窗口模式切换、状态监听 |
| useClipboard | 剪贴板读写、监听开关 |
| useTheme | 主题色、设置加载 |
| Toast | 轻量级通知 |
| templateUtils | 默认模板、模板生成 |
| storageUtils | localStorage 读写 |

## 状态管理方案

- **Vue 3 Composables**: 各功能模块独立的状态管理
- **本地状态**: 使用 `ref()` / `computed()`
- **全局状态**: 最小化，仅 settings 等必要数据

## IPC 调用 (通过 preload.js)

所有 IPC 调用必须通过 ContextBridge 暴露的 API:

```javascript
window.electronAPI.<channel>
```

示例:
```javascript
window.electronAPI.settings.get()
window.electronAPI.window.switchMode('mini')
```

## 质量规范

- 禁止直接使用 Node.js API
- 必须使用 Tailwind 类名 (禁止硬编码样式)
- 异步操作必须有 try-catch 包裹
- 单文件 < 800 行，单函数 < 30 行

## 更新日志

- 2026-02-25: 初始化文档
- 2026-02-26: 重构为 Vue 3 + Composables 架构
