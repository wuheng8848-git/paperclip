# AGENTS.md

为在本仓库工作的人类和 AI 贡献者提供的指引。

## 1. 用途

Paperclip 是面向 AI Agent 公司的控制平面。
当前实现目标为 V1，定义在 `doc/SPEC-implementation.md` 中。

## 2. 先读这里

变更代码前，按此顺序阅读（正文以中文为主；**路径文件名**保持英文以便工具与链接稳定）：

1. `doc/GOAL.md`（目标与愿景）
2. `doc/PRODUCT.md`（产品定义）
3. `doc/SPEC-implementation.md`（V1 实现契约）
4. `doc/DEVELOPING.md`（开发与本地运行）
5. `doc/DATABASE.md`（数据库与密钥相关）

`doc/SPEC.md`：长周期产品上下文。
`doc/SPEC-implementation.md`：具体 V1 构建契约。

## 3. 仓库结构

- `server/`：Express REST API 和编排服务
- `ui/`：React + Vite 看板 UI
- `packages/db/`：Drizzle schema、迁移、DB 客户端
- `packages/shared/`：共享类型、常量、校验器、API 路径常量
- `packages/adapters/`：Agent 适配器实现（Claude、Codex、Cursor 等）
- `packages/adapter-utils/`：共享适配器工具函数
- `packages/plugins/`：插件系统包
- `doc/`：运维和产品文档

## 4. 开发环境（自动数据库）

开发时不设置 `DATABASE_URL`，将使用内嵌的 PGlite。

```sh
pnpm install
pnpm dev
```

启动后：

- API：`http://localhost:3100`
- UI：`http://localhost:3100`（开发中间件模式下由 API 服务器提供）

快速检查：

```sh
curl http://localhost:3100/api/health
curl http://localhost:3100/api/companies
```

干净停止本地开发：在启动服务器的终端前台按 **Ctrl+C**，然后在仓库根目录执行 **`pnpm dev:list`** / **`pnpm dev:stop`**；如果端口 **3100** 仍被占用但注册表为空，请参阅 **`doc/DEVELOPING.md`**（*停止开发服务*章节）以及中文运维文档 **`docs/项目计划/运维-回形针本地.md`**（*停止与查看状态*）。

重置本地开发数据库：

```sh
rm -rf data/pglite
pnpm dev
```

## 5. 核心工程规则

1. **变更保持在公司范围内。**
每个领域实体都应归属于某个公司，路由/服务层必须强制执行公司边界。

2. **保持契约同步。**
如果更改了 schema/API 行为，需更新所有受影响的层：
- `packages/db` schema 和导出
- `packages/shared` 类型/常量/校验器
- `server` 路由/服务
- `ui` API 客户端和页面

3. **维护控制平面不变量。**
- 单一负责人任务模型
- 原子性 issue 签出语义
- 受管操作的审批门控
- 预算硬停自动暂停行为
- 变更操作的活动日志

4. **除非明确要求，不要整体替换战略文档。**
优先增量更新。保持 `doc/SPEC.md` 和 `doc/SPEC-implementation.md` 一致。

5. **仓库计划文档保持日期化和集中化。**
在仓库中创建计划文件时，新计划文档应放在 `doc/plans/` 目录下，使用 `YYYY-MM-DD-slug.md` 文件名格式。这不替代 Paperclip issue 计划：如果 Paperclip issue 要求提供计划，请按 `paperclip` skill 更新 issue 的 `plan` 文档，而不是创建仓库 markdown 文件。

## 6. 数据库变更流程

修改数据模型时：

1. 编辑 `packages/db/src/schema/*.ts`
2. 确保新表从 `packages/db/src/schema/index.ts` 导出
3. 生成迁移：

```sh
pnpm db:generate
```

4. 验证编译：

```sh
pnpm -r typecheck
```

注意：
- `packages/db/drizzle.config.ts` 从 `dist/schema/*.js` 读取编译后的 schema
- `pnpm db:generate` 会先编译 `packages/db`

## 7. 交接前的验证

默认的本地/Agent 测试路径：

```sh
pnpm test
```

这是低成本的默认选项，仅运行 Vitest 测试套件。浏览器测试套件默认不启用：

```sh
pnpm test:e2e
pnpm test:release-smoke
```

仅在变更涉及浏览器测试或明确需要验证 CI/发布流程时才运行浏览器测试套件。

对于常规 issue 工作，优先运行最小范围的相关验证。不要在每次检查时默认执行仓库级别的 typecheck/build/test，更窄范围的检查足以证明变更正确性时就用窄范围检查。

在 PR 就绪交接前声明仓库工作完成时，或变更范围足够广、针对性检查不足以覆盖时，运行完整检查：

```sh
pnpm -r typecheck
pnpm test:run
pnpm build
```

如果有任何检查未能运行，需明确报告哪些未运行及原因。

## 8. API 和认证预期

- 基础路径：`/api`
- 看板访问视为完全控制操作者上下文
- Agent 访问使用 Bearer API 密钥（`agent_api_keys`），存储时进行哈希处理
- Agent 密钥不得访问其他公司数据

添加端点时：

- 应用公司访问检查
- 强制执行参与者权限（看板 vs Agent）
- 为变更操作写入活动日志
- 返回一致的 HTTP 错误码（`400/401/403/404/409/422/500`）

## 9. UI 预期

- 保持路由和导航与可用 API 接口一致
- 公司范围页面使用公司选择上下文
- 清晰展示错误；不要静默忽略 API 错误

## 10. Pull Request 要求

创建 Pull Request 时（通过 `gh pr create` 或其他方式），**必须**阅读并填写 [`.github/PULL_REQUEST_TEMPLATE.md`](.github/PULL_REQUEST_TEMPLATE.md) 的每个章节。不要编写临时 PR 描述——使用模板作为 PR 描述的结构。必需章节：

- **思考路径** — 从项目上下文到此次变更的推理过程（示例见 `CONTRIBUTING.md`）
- **变更内容** — 具体变更的要点列表
- **验证方式** — 审阅者如何确认变更有效
- **风险** — 可能出现的问题
- **使用的模型** — 产生或辅助此次变更的 AI 模型（提供商、精确模型 ID、上下文窗口、能力）。如未使用 AI 则写"无——人工编写"
- **检查清单** — 所有项目已勾选

## 11. 完成定义

当以下全部满足时，变更才算完成：

1. 行为符合 `doc/SPEC-implementation.md`
2. Typecheck、测试和构建通过
3. db/shared/server/ui 间的契约已同步
4. 行为或命令变更时文档已更新
5. PR 描述遵循 [PR 模板](.github/PULL_REQUEST_TEMPLATE.md)，所有章节已填写（包括使用的模型）

## 12. Fork 特定说明：HenkDz/paperclip

这是 `paperclipai/paperclip` 的 fork，包含生活质量改进补丁，以及在 `feat/externalize-hermes-adapter` 分支上的**纯外部** Hermes 适配器方案（[分支树](https://github.com/HenkDz/paperclip/tree/feat/externalize-hermes-adapter)）。

### 分支策略

- `feat/externalize-hermes-adapter` → 核心**不**依赖 `hermes-paperclip-adapter`，也**不**内置 `hermes_local` 注册。通过适配器插件管理器安装 Hermes（`@henkey/hermes-paperclip-adapter` 或 `file:` 路径）。
- 较旧的 fork 分支可能仍记录内置 Hermes；以此文件作为外部化分支的权威说明。

### Hermes（仅限插件）

- 通过 **Board → 适配器管理器** 注册（与 Droid 相同）。包加载后类型仍为 `hermes_local`。
- UI 使用包中的通用 **config-schema** + **ui-parser.js** — `server/` 或 `ui/` 源码中无 Hermes 导入。
- 可选：在 `~/.paperclip/adapter-plugins.json` 中添加 `file:` 条目用于适配器仓库的本地开发。

### 本地开发

- Fork 运行在端口 3101+（如果 3100 被上游实例占用则自动检测）
- `npx vite build` 在 NTFS 上会挂起 — 改用 `node node_modules/vite/bin/vite.js build`
- `pnpm dev` 在 NTFS 上会死锁 — `tsx watch`（chokidar）因 `fs.watch` 不稳定而无限挂起。改用 `pnpm dev:once`（跳过文件监听，同一服务器，变更时不自动重启）
- 启动前杀掉所有 paperclip 进程：`pkill -f "paperclip"; pkill -f "tsx.*index.ts"`
- Vite 缓存在 `rm -rf dist` 后仍保留 — 需同时删除：`rm -rf ui/dist ui/node_modules/.vite`

### Fork 生活质量改进补丁（不在上游）

这些是 fork UI 中的本地修改。如果重新复制源码，需要重新应用：

1. **stderr_group** — `RunTranscriptView.tsx` 中 MCP 初始化噪声的琥珀色手风琴组件
2. **tool_group** — 连续非终端工具（write、read、search、browser）的手风琴组件
3. **Dashboard 摘要** — `LatestRunCard` 去除 markdown 格式，显示前 3 行/280 字符

### 插件系统

PR #2218（`feat/external-adapter-phase1`）添加了外部适配器支持。完整详情见根目录 `AGENTS.md`。

- 适配器可通过 `~/.paperclip/adapter-plugins.json` 作为外部插件加载
- 插件加载器应**零**硬编码适配器导入 — 纯动态加载
- `createServerAdapter()` 必须包含所有可选字段（尤其是 `detectModel`）
- 内置 UI 适配器可能覆盖外部插件解析器 — 完全外部化时需移除内置
- 参考外部适配器：Hermes（`@henkey/hermes-paperclip-adapter` 或 `file:`）和 Droid（npm）
