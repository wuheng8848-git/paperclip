---
id: exec-004-cursor-adapter-agent-config
status: 待审
ledger: ./任务执行台账.md
updated: "2004-05-13"
focus: Cursor Code 智能体 + CURSOR_API_KEY / 适配器类型对齐
note: |-
  需求方口述为「Cursor 适配器」；库里该智能体现为 adapter_type=qwen_local，
  CLI 报错却为 Cursor。两条线都要在产品与配置上对齐，见 §3.5。
---

# 任务 004 — 修复 Cursor 适配器及 Cursor Code 智能体配置错误

**返回：**[`任务执行台账.md`](任务执行台账.md)

---

## 1. 需求

### 背景（人话）

- 昨天起 **Cursor 路线**在用户侧体感异常。
- 公司里有智能体展示名：**「Cursor code」**，详情页上 **连着三条失败 Run**。
- 需针对指定 **Run Id** 把原因查清、归因、给出**可落地的修复**，再向你汇报。

### 要什么

1. 查看下列 **三段运行记录** 的：**状态、报错原文、`error_code`、摘录**。  
   - `3b18c307`、`b62490f1`、`3c2adcad`（前缀；库内全称见 §3）  
2. **归纳失败原因 → 上升到根因**（配置 / 环境 / 产品与边界）。  
3. **修复方案**：先给你可执行的人类侧步骤；需要改代码再在仓库开子项。

### 验收

- §3 对 **每一条 Run**：**现象 · 证据 · 根因 · 建议**。  
- **§3.5** 一段话可直接转发你方。

---

## 2. 执行方案（勾选用）

- [x] 在默认实例 Postgres 查询 `heartbeat_runs` ∪ `agents`（只读）。
- [ ] 按需补：`server.log` 同一时间窗、`heartbeat_run_events`。
- [ ] 人类侧：**核对 `qwen` / `agent` 实际二进制**、`CURSOR_API_KEY` 从哪里来（系统 env / Paperclip 启动脚本 / Agent 适配器 env）。

---

## 3. 执行回写（已落库查证部分）

### 3.1 元信息

| 字段 | 内容 |
|------|------|
| 查证日期 | 2004-05-13 |
| 实例 | `C:\Users\wuhen\.paperclip\instances\default`（PostgreSQL 端口以本机为准，本次查询 **54329**） |
| 智能体名称 | **Cursor code** |
| `agents.id` | `8cd9643e-49a2-41d8-b91f-918b604c1ed0` |
| **`adapter_type`（重要）** | **`qwen_local`**（≠ `cursor` / `cursor_local`） |

---

### 3.2 Run `3c2adcad-c9fa-4d4f-8436-4fd05c41f470`

| 字段 | 值 |
|------|-----|
| 时间（创建） | 2004-05-13 03:44:46 +08 |
| status | failed |
| error_code | adapter_failed |
| exit_code | 1 |

**现象：** 控制面会看到一条「适配器失败」类记录；摘录里带 **API Key 无效** 警告。

**证据（stderr 要点，已去 ANSI）：**  

- `Warning: The provided API key is invalid.`  
- `The API key was loaded from the CURSOR_API_KEY environment variable.`  
- 建议检查 key、换新 key，或 **不用 env 而用其它登录方式**。  

stdout 另有 Paperclip 正常提示：`Skipping saved session resume ... wake reason is issue_assigned`（本条 **不是失败根因**）。

**根因（归纳）：** 子进程以 **无效的 `CURSOR_API_KEY`** 启动；Cursor CLI 读了该变量后直接失败。

**修复建议：** 见 §3.6。

---

### 3.3 Run `b62490f1-7e12-449e-a95c-09df90144a21`

| 字段 | 值 |
|------|-----|
| 时间（创建） | 2004-05-13 03:44:48 +08 |
| status | failed |
| error_code | adapter_failed |
| exit_code | 1 |

**现象 / 证据 / 根因：** 与 **§3.2 相同**——同一套 **`CURSOR_API_KEY` invalid** 文案。

**修复建议：** 同 §3.6。

---

### 3.4 Run `3b18c307-c088-4241-ba3c-9c26b2e0de44`

| 字段 | 值 |
|------|-----|
| 时间（创建） | 2004-05-13 03:44:51 +08 |
| status | failed |
| error_code | adapter_failed |
| exit_code | 1 |

**现象 / 证据 / 根因：** **同上**，三连失败本质是 **同一种错误打一宿屏**。

**修复建议：** 同 §3.6。

---

### 3.5 向你汇报的根因（人话）

1. **三笔不是三种病，是一种病刷了三次：** 机器上跑着的东西在读 **`CURSOR_API_KEY`**，这个值 **不对或过期的无效的**，Cursor 侧 CLI **直接 refusing**，所以三次都挂。  
2. **名字和档案对不上号：** 智能体叫「Cursor code」，但数据库里 **`adapter_type` 记的是 `qwen_local`**，配置里也是 **Qwen 模型 `qwen3.6-plus`**。可是 **报错又是典型 Cursor CLI**（提 `CURSOR_API_KEY`）。这说明至少有一边没对齐：要么 **实际调用的可执行文件还是 Cursor 系 Agent**，要么 **Paperclip/系统环境把 Cursor 的 key 灌进了 Qwen 进程**。无论哪种，**当前状态 =「以为 Qwen 配置 + 实际吃到 Cursor 的 key 逻辑」**，排障时很容易误以为「只修 Cursor 适配器包」就够了。  
3. **和「昨天 Cursor 适配器坏了」是否同一事件：** 从这三条记录看，**直接可证的是 key 无效**；若全公司还有 **`cursor` 适配器**别的问题，需要另拉 **adapter_type = cursor** 的失败 run 再对，不要和这三条混为一谈。

---

### 3.6 修复方案（按优先级）

**A. 立刻能试（环境 / 配置）**

1. **找出 `CURSOR_API_KEY` 是谁设的：** Windows 用户环境变量、启动 Paperclip 的终端/服务、或 **该智能体 `adapter_config.env`**。  
2. **二选一：**  
   - 换成 **Cursor 后台有效的 API Key**；或  
   - **删掉/清空** 该无效变量（若走 `agent login` 等本机登录，不需要这个 env）。  
3. 改完后对 **同一智能体** 再触发一次 **最小运行**（或适配器「测试环境」），确认 stderr 不再出现 invalid key。

**B. 把「智能体档案」和真实路线对齐（避免以后再误解）**

- 若你们 **就是要走 Cursor Agent CLI：** 在 Paperclip 里把该员工智能体 **.adapter_type 改为 Cursor 系（`cursor` / `cursor_local` 以你实例版本为准）**，并按 Cursor 适配器文档配 **command、model、env**。  
- 若 **就是要 Qwen CLI：** 确认 PATH 上的 **`qwen` 不是 Cursor 的壳**；并考虑在 **Qwen 适配器启动 env 里显式去掉 `CURSOR_API_KEY`**（避免误继承），这一项若要做成产品行为需 **仓库改代码**，可单开子任务。

**C. 产品与文档（中长期）**

- **详情页三套相同报错**：本质是 **同源失败**，UI 可考虑合并/归因提示「环境变量密钥无效」，减少「三个不同错」的视觉噪音。  

---

### 3.7 未完项（按需补）

- [ ] 在用户机器上执行 `where qwen` / `where agent`，确认 **实际二进制**。  
- [ ] `server.log` 同秒级对齐（若 stderr 不足以说服业务方）。

---

### 3.8 任务单状态

- **查证与归因**：已完成（本节）。  
- **人类侧 env / agent 适配器类型是否已改正**：待你执行后把结果补写 §3.1「关闭日期」。  
