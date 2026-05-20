# 长期需求 · Agent 控制面 API 一等公民调用通路（MCP 或默认脚本）

**状态：** 待实现  
**建档：** 2026-05-20  
**触发：** ROU-6 等心跳 run 结尾反复出现「写 `paperclip-*.json` → `curl --data-binary` → `rm`」；模型把 Bash 当唯一 HTTP 客户端，既慢又易在 Windows 链路上踩 UTF-8 坑。

**返回：** [`README.md`](README.md)

---

## 1. 问题陈述

当前本地适配器（CodeBuddy、Claude Code、Cursor 等）在心跳里调用 Paperclip **控制面**（checkout、PATCH issue、发评论、建子单等）时，常见路径是：

1. 模型用 **Bash** 手写 `cat > paperclip-comment.json` / `paperclip-patch.json`
2. `curl` + `Authorization` + `X-Paperclip-Run-Id`
3. `rm` 临时文件

这不是 API 协议要求，而是 **技能示例 + 仅有 shell 工具** 下的权宜之计。副作用包括：

- 每轮关单/评论多 2～3 次无意义工具调用（写文件、删文件）
- 纯 ASCII 的 `{"status":"done"}` 也走同一模板，显得笨拙
- 仍可能写错路径（`/tmp` vs `$TEMP`）、漏删文件、或误用 `curl -d` 内联中文导致乱码（见 [`021-实践-乱码根因与修订方案.md`](../最佳实践/021-实践-乱码根因与修订方案.md)）

**目标：** 对「回形针系统调用」给模型 **一等公民** 通道——**默认脚本** 和/或 **MCP 工具**——而不是每次让模型即兴拼 curl。

---

## 2. 产品目标（可验收）

| # | 目标 | 验收口径 |
|---|------|----------|
| G1 | **心跳高频写路径默认不走手写 JSON** | 关单、发完成评论、checkout 等 TOP N 操作，技能/适配器文档第一示例为 **脚本或 MCP**，不是 `cat > …json` |
| G2 | **适配器启动时自动可用** | 本地 run 注入的 `PAPERCLIP_*` 下，无需模型自行发现仓库路径即可调用（PATH、`PAPERCLIP_CLI_*`、或预置 MCP） |
| G3 | **中文与多行正文仍安全** | 任意通路均 UTF-8 端到端；禁止把「安全写入」责任推回 `curl -d` 内联 JSON |
| G4 | **审计头不变** | 凡修改事务的请求仍带 `X-Paperclip-Run-Id`；脚本/MCP 从环境变量读取，模型不可省略 |
| G5 | **与现有技能降级兼容** | MCP/脚本不可用时，技能仍允许 curl+文件，但标为 **降级路径** |

---

## 3. 方案选项（实现时二选一或组合）

### 3.1 默认脚本（仓库内第一方，优先落地成本低）

已有雏形：

- [`scripts/paperclip-issue-update.sh`](../../../scripts/paperclip-issue-update.sh) — PATCH issue、stdin 多行评论
- 可扩展：`paperclip-issue-comment.sh`、`paperclip-checkout.sh` 或统一 `paperclip-cli` 子命令

**适配器侧：**

- 心跳子进程 `PATH` 含仓库 `scripts/`，或注入 `PAPERCLIP_SCRIPTS_DIR`
- `skills/paperclip/SKILL.md` 示例改为：`scripts/paperclip-issue-update.sh --issue-id "$PAPERCLIP_TASK_ID" --status done`

### 3.2 MCP（长期更干净）

包 [`@paperclipai/mcp-server`](../../../packages/mcp-server/README.md) 已存在（见 `releases/v2026.416.0.md`）。

**适配器侧：**

- 按 agent 模版在 `codebuddy` / `claude` / `cursor` 配置里 **默认挂载** Paperclip MCP（读 `PAPERCLIP_API_URL` + run JWT）
- 工具面覆盖：checkout、PATCH status、POST comment、inbox-lite 等心跳高频 API

**取舍：**

| 维度 | 默认脚本 | MCP |
|------|----------|-----|
| 落地速度 | 快（扩脚本 + 改技能） | 中（配 MCP + 工具清单） |
| 模型体验 | 仍经 Bash 一层 | 结构化 tool call，少 shell 编码问题 |
| 运维 | 依赖 bash/node 在 PATH | 依赖 MCP 进程与适配器配置 |

**建议分期：** **P0 脚本 + 技能改示例** → **P1 适配器默认挂载 MCP** → **P2 废弃技能里的 curl 手写 json 示例**（保留降级段）。

---

## 4. 非目标（本需求不做）

- 不替代领域工作（写代码、翻译文件）的工具链
- 不要求 Board UI 改交互
- 不在此需求内实现「全 API 覆盖」；只覆盖心跳标准流程（见 `skills/paperclip/SKILL.md` §心跳标准流程）

---

## 5. 关联文档与执行拆分

| 关联 | 说明 |
|------|------|
| [`执行/052-Agent互操作权限与UTF-8写中文安全通路.md`](../执行/052-Agent互操作权限与UTF-8写中文安全通路.md) | **G2** 子集：UTF-8 产品化；本 **28** 为母本（一等公民通路） |
| [`skills/paperclip/SKILL.md`](../../../skills/paperclip/SKILL.md) | 实现后须改「中文与多行正文安全写入」优先级与示例 |
| [`packages/adapter-utils/src/server-utils.ts`](../../../packages/adapter-utils/src/server-utils.ts) | 注入 AGENTS 的执行契约可指向脚本/MCP |
| [`021-实践-乱码根因与修订方案.md`](../最佳实践/021-实践-乱码根因与修订方案.md) | 乱码根因；新通路须满足其验收 |
| [`04 回形针配置与验证-IDE-CLI-AI分工`](04%20回形针配置与验证-IDE-CLI-AI分工%202026-05-14.md) | IDE/CLI 分工与「脚本 + API」套路 |

**落地时建议拆执行单（尚未建档）：** 例如 `056-控制面默认脚本与技能示例收口`、`057-适配器默认挂载Paperclip-MCP`（取号以 `00.项目任务清单.md` 为准）。

---

## 6. 实现与需求对齐（完成后填写）

| 项 | 状态 |
|----|------|
| P0 脚本 + 技能 | ☐ |
| P1 适配器 MCP | ☐ |
| P2 降级文档 | ☐ |
