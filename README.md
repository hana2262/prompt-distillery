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
# 🚀 Prompt Distillery (提示词蒸馏器)

<div align="center">

![GitHub release (latest by date)](https://img.shields.io/github/v/release/hana2262/prompt-distillery)
![Platform](https://img.shields.io/badge/platform-Windows-blue)
![License](https://img.shields.io/github/license/hana2262/prompt-distillery)
![Electron](https://img.shields.io/badge/Electron-28.0-47848F?logo=electron&logoColor=white)
![Vue](https://img.shields.io/badge/Vue.js-3.0-4FC08D?logo=vue.js&logoColor=white)

**一个专为个人开发者与 AI 创作者打造的现代化桌面应用。**
告别手动复制粘贴，让 AI 帮你清洗、查重、优化提示词。

[📥 下载最新版 (Windows)](https://github.com/hana2262/prompt-distillery/releases/latest) | [🐛 反馈问题](https://github.com/hana2262/prompt-distillery/issues)

</div>

---

## 📖 简介 | Introduction

在 AI 创作过程中，我们经常会遇到这样的问题：提示词（Prompt）散落在各种笔记软件、聊天记录里，版本混乱，重复劳动多，依赖于个人想法的临时迸发而不成体系。

**Prompt Distillery** 旨在解决这些痛点。它不仅仅是一个存储工具，更是一个“蒸馏器”——通过无感监听和 AI 辅助，帮你把杂乱的灵感提纯为高质量的生产力资产。

## ✨ 核心特性 | Features

### 📋 无感监听 (Clipboard Monitor)
- **自动捕获**：后台自动监听剪贴板，智能识别并捕获潜在的 Prompt。
- **意图识别**：自动过滤无关内容，只保留有价值的提示词片段。

### 🧠 AI 蒸馏 (AI Distillation)
- **智能查重**：本地算法快速比对，拒绝重复收藏。
- **语义合并**：调用大模型能力，将相似的提示词合并优化，提取精华。
- **版本对比**：直观展示优化前后的差异 (Diff)，保留每一次灵感迭代。

### 📝 分层管理 (Hierarchical Management)
- **多维度标签**：支持自定义标签体系，分类管理。
- **全生命周期**：从“草稿箱”的灵感碎片，到“生产级”的成熟模板，一站式管理。
- **变量支持**：支持模板变量（如 `{{keyword}}`），使用时动态替换。

### 🪟 三态窗口 (Responsive Window)
适应不同工作流的窗口模式：
- **Mini Mode**：小巧悬浮窗，不打扰主屏幕工作。
- **Standard Mode**：标准视图，快速浏览与搜索。
- **Editor Mode**：沉浸式编辑器，专注于提示词打磨。

### 🔒 隐私优先 (Privacy First)
- **本地存储**：所有数据默认存储在本地 (LocalStorage/IndexedDB)，不上云。
- **安全可控**：支持敏感词过滤，保障数据安全。

---

## 📸 截图展示 | Screenshots

> <img width="1171" height="883" alt="image" src="https://github.com/user-attachments/assets/722f675a-2e57-4593-ad15-6fccfaef46a3" />


---

## 📥 下载与安装 | Download

目前仅支持 **Windows (x64)** 系统。

请前往 [Releases 页面](https://github.com/hana2262/prompt-distillery/releases) 下载最新版本：

1. **安装版 (推荐)**：下载 `PromptDistillery-Setup.exe`，双击安装，支持自动更新。
2. **便携版 (绿色版)**：下载 `.zip` 压缩包，解压即用，适合放在 U 盘或非管理员环境。

---

## 🛠️ 开发构建 | Development

如果您是开发者，想要本地运行或贡献代码，请参考以下步骤：

### 环境要求
- Node.js >= 16.0.0
- npm 或 yarn

### 1. 克隆仓库
```bash
git clone https://github.com/hana2262/prompt-distillery.git
cd prompt-distillery
```

### 2. 安装依赖
```bash
npm install
# 或者
yarn install
```

### 3. 启动开发模式
```bash
npm start
```
这将同时启动 Electron 主进程和 Vue 渲染进程（支持热重载）。

### 4. 打包构建
```bash
# 生成 Windows 安装包 (Squirrel) 和 ZIP 包
npm run make
```
构建产物将位于 `out/` 目录下。

---

## 🏗️ 技术栈 | Tech Stack

- **Core**: [Electron](https://www.electronjs.org/)
- **Frontend**: [Vue 3](https://vuejs.org/) (Composition API)
- **UI Framework**: [Tailwind CSS](https://tailwindcss.com/)
- **Build Tool**: Electron Forge
- **Storage**: LocalStorage / Lowdb (Local JSON)

---

## 🗺️ 路线图 | Roadmap

- [x] **v1.0.0**: 基础功能完成，支持剪贴板监听、AI 查重、本地存储。
- [ ] **v1.1.0**: 支持云端同步 (WebDAV/Gist)。
- [ ] **v1.2.0**: 增加更多 AI 模型支持 (OpenAI / Claude / Local LLM)。
- [ ] **v2.0.0**: 跨平台支持 (macOS / Linux)。

---

## 📄 许可证 | License

本项目采用 [MIT License](LICENSE) 开源。

---

**Made with ❤️ by [hana2262](https://github.com/hana2262)**
