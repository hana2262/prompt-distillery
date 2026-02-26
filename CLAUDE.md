# CLAUDE.md - 项目开发宪法

## 1. 核心原则 (Core Principles)
- **Code Logic**: 单文件行数 < 800行，单函数 < 30行，嵌套 < 3层。严禁写“上帝类”。
- **Architecture**: 必须遵循 `Feature-First` 结构。每个功能模块必须包含自己的 `README.md` (分形文档)。
- **State Management**: 本地状态优先，全局状态最小化。Electron IPC 通信必须在 `preload.js` 中显式声明。

## 2. 工作流 (Workflow)
1. **Plan Mode First**: 任何超过 1 个文件的修改，必须先使用 `--permission-mode plan` 生成计划。
2. **Checklist Update**: 每次修改代码后，必须更新 `.claude/plan.md` 中的进度。
3. **Docs Sync**: 修改代码后，**必须**检查并更新当前模块的 `README.md` 中的接口定义。如果不更新文档，视为任务未完成。

## 3. 分形文档结构 (Fractal Documentation)
AI 在进入任何目录时，必须优先读取该目录下的 `README.md`。
- **根目录**: 全局架构图，模块索引。
- **src/renderer**: 渲染进程架构，组件树。
- **src/main**: 主进程逻辑，IPC 通信清单。

## 4. 质量红线 (Quality Thresholds)
- **禁止**：在渲染进程直接使用 Node.js API (必须通过 ContextBridge)。
- **禁止**：硬编码样式 (必须使用 Tailwind 类名)。
- **强制**：所有异步操作必须有 `try-catch` 包裹。

## 5. 常用命令
- 启动: `npm start`
- 检查代码: `npm run lint`
- 格式化: `npm run format`