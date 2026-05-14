---
title: 快速入门
summary: 在几分钟内让 Paperclip 运行起来
---

在5分钟内让 Paperclip 在本地运行起来。

## 快速开始（推荐）

```sh
npx paperclipai onboard --yes
```

这将引导您完成设置，配置您的环境，并让 Paperclip 运行起来。

如果您已经安装了 Paperclip，重新运行 `onboard` 会保留您当前的配置和数据路径。如果您想编辑设置，请使用 `paperclipai configure`。

稍后要再次启动 Paperclip：

```sh
npx paperclipai run
```

> **注意：** 如果您使用 `npx` 进行设置，请始终使用 `npx paperclipai` 来运行命令。`pnpm paperclipai` 形式仅在克隆的 Paperclip 仓库中有效（请参见下面的本地开发）。

## 本地开发

适用于正在开发 Paperclip 本身的贡献者。先决条件：Node.js 20+ 和 pnpm 9+。

克隆仓库，然后：

```sh
pnpm install
pnpm dev
```

这将在 [http://localhost:3100](http://localhost:3100) 启动 API 服务器和 UI。

无需外部数据库 — Paperclip 默认使用嵌入式 PostgreSQL 实例。

当从克隆的仓库工作时，您还可以使用：

```sh
pnpm paperclipai run
```

如果配置缺失，这将自动进行入门设置，运行带自动修复的健康检查，并启动服务器。

## 下一步

一旦 Paperclip 运行起来：

1. 在 web UI 中创建您的第一个公司
2. 定义公司目标
3. 创建 CEO 代理并配置其适配器
4. 使用更多代理构建组织结构图
5. 设置预算并分配初始任务
6. 点击开始 — 代理开始心跳，公司开始运行

<Card title="核心概念" href="/start/core-concepts">
  了解 Paperclip 背后的关键概念
</Card>