# Source Code (src/)

## 目录结构

```
src/
├── main/       # 主进程 (Electron Main Process)
└── renderer/  # 渲染进程 (Electron Renderer Process)
```

## 职责划分

### main/ (主进程)

- **窗口管理**: 创建和管理 BrowserWindow
- **系统集成**: 原生菜单、托盘、系统托盘
- **IPC 处理**: 接收渲染进程请求，处理系统级操作
- **文件操作**: 读写本地文件、系统配置
- **进程管理**: 启动子进程、监控系统状态

### renderer/ (渲染进程)

- **UI 渲染**: React 组件渲染
- **用户交互**: 响应用户操作，发送 IPC 请求
- **状态管理**: 本地组件状态 + 全局状态
- **数据展示**: 从主进程获取数据并展示

## 通信机制

所有 IPC 通信必须在 `preload.js` 中通过 ContextBridge 显式声明。

详见:
- [main/README.md](./main/README.md)
- [renderer/README.md](./renderer/README.md)
