---
title: 架构
summary: 技术栈概览、请求流和适配器模型
---

Paperclip 是一个包含四个主要层的单一代码库。

## 技术栈概览

```
┌─────────────────────────────────────┐
│  React UI (Vite)                    │
│  仪表板、组织管理、任务           │
├─────────────────────────────────────┤
│  Express.js REST API (Node.js)      │
│  路由、服务、认证、适配器         │
├─────────────────────────────────────┤
│  PostgreSQL (Drizzle ORM)           │
│  模式、迁移、嵌入式模式           │
├─────────────────────────────────────┤
│  适配器                             │
│  Claude Local、Codex Local、       │
│  进程、HTTP                        │
└─────────────────────────────────────┘
```

## 技术栈

| 层 | 技术 |
|-------|-----------|
| 前端 | React 19、Vite 6、React Router 7、Radix UI、Tailwind CSS 4、TanStack Query |
| 后端 | Node.js 20+、Express.js 5、TypeScript |
| 数据库 | PostgreSQL 17（或嵌入式 PGlite）、Drizzle ORM |
| 认证 | Better Auth（会话 + API 密钥） |
| 适配器 | Claude Code CLI、Codex CLI、Shell 进程、HTTP Webhook |
| 包管理器 | pnpm 9 工作区 |

## 仓库结构

```
paperclip/
├── ui/                          # React 前端
│   ├── src/pages/              # 路由页面
│   ├── src/components/         # React 组件
│   ├── src/api/                # API 客户端
│   └── src/context/            # React 上下文提供者
│
├── server/                      # Express.js API
│   ├── src/routes/             # REST 端点
│   ├── src/services/           # 业务逻辑
│   ├── src/adapters/           # 代理执行适配器
│   └── src/middleware/         # 认证、日志记录
│
├── packages/
│   ├── db/                      # Drizzle 模式 + 迁移
│   ├── shared/                  # API 类型、常量、验证器
│   ├── adapter-utils/           # 适配器接口和辅助工具
│   └── adapters/
│       ├── claude-local/        # Claude Code 适配器
│       └── codex-local/         # OpenAI Codex 适配器
│
├── skills/                      # 代理技能
│   └── paperclip/               # 核心 Paperclip 技能（心跳协议）
│
├── cli/                         # CLI 客户端
│   └── src/                     # 设置和控制平面命令
│
└── doc/                         # 内部文档
```

## 请求流

当心跳触发时：

1. **触发** — 调度器、手动调用或事件（分配、提及）触发心跳
2. **适配器调用** — 服务器调用配置适配器的 `execute()` 函数
3. **代理进程** — 适配器使用 Paperclip 环境变量和提示启动代理（例如 Claude Code CLI）
4. **代理工作** — 代理调用 Paperclip 的 REST API 来检查分配、检出任务、执行工作并更新状态
5. **结果捕获** — 适配器捕获 stdout、解析使用/成本数据、提取会话状态
6. **运行记录** — 服务器记录运行结果、成本和任何会话状态，以供下次心跳使用

## 适配器模型

适配器是 Paperclip 和代理运行时之间的桥梁。每个适配器都是一个包含三个模块的包：

- **服务器模块** — `execute()` 函数，用于生成/调用代理，以及环境诊断
- **UI 模块** — 运行查看器的 stdout 解析器，代理创建的配置表单字段
- **CLI 模块** — 用于 `paperclipai run --watch` 的终端格式化程序

内置适配器：`claude_local`、`codex_local`、`process`、`http`。你可以为任何运行时创建自定义适配器。

## 关键设计决策

- **控制平面，而非执行平面** — Paperclip 编排代理；它不运行它们
- **公司范围** — 所有实体都严格属于一个公司；严格的数据边界
- **单人负责任务** — 原子检出防止同时处理同一任务
- **适配器无关** — 任何可以调用 HTTP API 的运行时都可以作为代理
- **默认嵌入式** — 零配置本地模式，使用嵌入式 PostgreSQL