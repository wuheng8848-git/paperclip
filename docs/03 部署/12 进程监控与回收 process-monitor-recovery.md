# 进程监控与回收

> 配合 [11 本地运维](11%20本地运维%20local-instance-ops.md)。本文讲 **怎么看进程、怎么按阶梯收尾**；`dev:stop` / `dev:nuke` 命令细节仍以 11 为准。  
> **`pnpm dev:nuke` 是最后手段**——日常优先结束 **认得的、与当前实例相关的** 进程，避免 `taskkill /F /IM node.exe` 一类「清全场」。

---

## 1. 为什么要分层看

本地开发时进程可能来自 **多条链路**，彼此 **没有统一父进程**：

| 来源 | 典型进程 | 登记方式 |
| --- | --- | --- |
| 受管 dev | `node` / `tsx` 跑 `server`、`vite` | `pnpm dev:list` 注册表 |
| 事务 run | 适配器 `spawn` 的 CLI 子进程 | UI / DB 里 run 的 **`processPid`**（多为 **直接子进程**） |
| 适配器 CLI 常驻 | 某些工具的 daemon / 后台 worker | **通常不在** Paperclip 注册表里 |
| 数据库 | 内嵌 `postgres.exe` 或 Docker 容器 | Compose / 内嵌实例目录 |

**结论：** 不能只盯一种视图——Board 上的 run 已结束，CLI 子树或端口监听仍可能还在。

---

## 2. 监控：先看什么

| 层级 | 命令 / 入口 | 用途 |
| --- | --- | --- |
| 受管 dev | `pnpm dev:list` | 当前登记的开发服 pid |
| 端口 | `netstat -ano \| findstr :4100`（API）等 | 发现 **未登记** 的孤儿监听 |
| 事务 run | Board 或 API：`heartbeat run` → **`processPid`** | 确认某次 invoke 是否仍占子进程 |
| OS | 任务管理器 / `Get-CimInstance Win32_Process` | 核对 **命令行** 再结束，勿盲杀 |

**预览候选泄漏（不杀）：** `pnpm dev:nuke -- -DryRun`（见 [11 本地运维](11%20本地运维%20local-instance-ops.md)）。

**适配器 CLI 自有工具（示例）：** 若岗位使用 CodeBuddy，可用 `codebuddy ps` / `codebuddy kill` 管理 **CLI 侧**会话——与 Paperclip `processPid` 可能不一致；配置与分层见 [15 CodeBuddy 配置分层](../适配器/15%20CodeBuddy%20配置分层与项目设置%20codebuddy-config-layers.md)，本机 CLI 摘录见 [011-摘录-CodeBuddy本机调研回写](../探查/011-摘录-CodeBuddy本机调研回写.md)。

---

## 3. 收敛并发（运营侧）

减少「收不干净」的概率，比事后 nuke 更省事：

- **同时活跃的智能体**：Board 上避免多个无头 agent 同一时刻都在跑 issue；routine / 唤醒错开。
- **单次 run 上限**：智能体配置里设合理的 **`timeoutSec`**、**`maxTurnsPerRun`**，避免单次 run 无限拉长。
- **CLI 常驻与 invoke 混用**：若本机另开了某适配器的 **daemon / 后台 worker**，与 Paperclip **`spawn` 单次会话** 并行时，进程数会叠加——开发机习惯上 **二选一**，或收工统一停 CLI 侧会话。

---

## 4. 回收阶梯（推荐顺序）

1. **前台终端**：对跑着 API 的窗口 **Ctrl+C**。
2. **仓库根**：`pnpm dev:stop`（结束 **已登记** 的 dev）。
3. **仍活跃的 run / CLI**：Board **暂停 / 终止** 对应智能体（API 会取消 run 并尽量结束登记子进程）；若适配器还有更深子树，用该 CLI 自带命令或按 **PID + 命令行** 核对后结束。
4. **端口孤儿**（如 4100 仍被占、`dev:list` 已空）：见 [11 本地运维](11%20本地运维%20local-instance-ops.md)「停止与查看状态」— **核对命令行** 再 `Stop-Process`。
5. **仅当仍无法恢复、且可承受副作用**：`pnpm dev:nuke`（可先 `-DryRun`；需保留某 CLI 时用 `-KeepCodebuddy` 等，见 11）。

**与 Board「暂停 / 终止」的关系：** 看板操作走 API 取消当前 heartbeat run；**未登记** 的适配器子进程仍可能需要上表第 3–5 步。

---

## 5. 杀进程与数据库

强力结束进程可能：

- 打断 **内嵌 Postgres**，留下 `postmaster.pid` / 端口占用；
- 对外链库造成 **半关闭连接**。

若杀进程后库异常，按 [11 本地运维](11%20本地运维%20local-instance-ops.md) 数据库与锁章节处理。

---

## 6. 延伸阅读

- 进程泄露根因探查：[009-探查-回形针进程泄露根因](../探查/009-探查-回形针进程泄露根因.md)
- 排障总索引：[020-实践-排障指南](../项目计划/最佳实践/020-实践-排障指南.md)

---

*2026-05-20*
