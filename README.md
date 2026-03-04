# Prompt Distillery V2

<p align="center">
  <img src="assets/icon.png" alt="Logo" width="128" height="128">
</p>

<p align="center">
  AI 驱动的 Prompt 整理工具 - 帮助用户高效管理和优化 AI 提示词
</p>

<p align="center">
  <a href="https://github.com/prompt-distillery/prompt-distillery-v2/releases">
    <img src="https://img.shields.io/github/v/release/prompt-distillery/prompt-distillery-v2" alt="GitHub release">
  </a>
  <a href="https://github.com/prompt-distillery/prompt-distillery-v2/releases">
    <img src="https://img.shields.io/github/downloads/prompt-distillery/prompt-distillery-v2/total" alt="Downloads">
  </a>
</p>

---

## 功能特性

### 核心功能
- **剪贴板监听** - 自动捕获剪贴板内容，支持敏感词过滤
- **模板管理** - 创建、编辑、删除 Prompt 模板，支持分类和标签
- **一键复制** - 快速复制生成结果到剪贴板
- **变量填充** - 支持占位符模板，填写变量后生成最终内容

### AI 智能分析
- **查重检测** - 与已有模板计算相似度，避免重复
- **自动标签** - 根据内容自动添加分类标签
- **版本历史** - 保存模板修改历史，支持恢复到历史版本
- **Diff 对比** - 原版与优化版并排展示，高亮差异

### 窗口模式
- **Mini 模式** (300x200) - 悬浮球模式，仅核心功能
- **Standard 模式** (800x600) - 标准窗口，完整功能
- **Editor 模式** (1200x800) - 编辑器模式，宽阔编辑空间

### 数据管理
- **数据导出** - 导出模板和设置到 JSON 文件
- **数据导入** - 从 JSON 文件导入模板（支持合并）
- **自动备份** - 应用启动时自动备份（默认开启）
- **手动备份** - 随时手动创建备份
- **备份保留** - 自动保留最近 10 个备份文件

---

## 快速开始

### 运行开发版本

```bash
# 安装依赖
npm install

# 启动开发模式
npm start
```

### 构建发布版本

```bash
# 打包应用
npm run package

# 或直接生成安装包
npm run make
```

构建产物位于 `out/` 目录下。

---

## 技术栈

| 技术 | 用途 |
|------|------|
| Electron | 桌面应用框架 |
| Vue 3 | 前端框架 (CDN) |
| Tailwind CSS | 样式框架 |
| localStorage | 本地数据存储 |

---

## 项目结构

```
prompt-distillery-v2/
├── assets/              # 应用图标等资源
├── src/
│   ├── main/           # Electron 主进程
│   │   ├── index.js    # 入口文件
│   │   └── preload.js  # 预加载脚本
│   └── renderer/       # 渲染进程
│       ├── index.html  # 入口 HTML
│       └── app.js      # Vue 应用
├── docs/               # 项目文档
├── package.json        # 项目配置
└── README.md          # 项目说明
```

---

## 版本历史

### v1.1.0 (2026-03-04)
- **新增** 数据导出/导入功能
- **新增** 自动备份功能（应用启动时自动备份）
- **新增** 手动备份功能
- **新增** 备份目录管理
- **优化** 备份文件兼容旧版本

### v1.0.0 (2026-02-25)
- 初始版本发布
- 剪贴板监听功能
- 模板管理 CRUD
- AI 查重和自动标签
- 三种窗口模式
- 系统托盘支持

---

## 许可证

ISC License

---

<p align="center">
  Made with ❤️ by Prompt Distillery Team
</p>
