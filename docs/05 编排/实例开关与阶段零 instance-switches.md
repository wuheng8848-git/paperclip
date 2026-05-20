# 实例开关与阶段零

**定位：** Routic / 4100 **当前默认**：先把 upstream「自愈、复盘、定时扫」关掉，收成 **人派活 → agent 干 → 回写 → done**；痛点了再 **单开一条** 自动化。

**为何：** 我们没有 upstream 那套调好的 agent 池 + 强模型二线；默认编排容易 **衍伸单风暴**，Board 中文也读不懂。

---

## 1. 目标心智（阶段零）

```text
人派活（指派 / 手动唤醒 / 有意识的评论）
    → checkout → run → 评论摘要 + done 或 blocked
    → 卡住：人看「运行清单」，不自动复盘三轮
```

**默认不要发生：** 滞留回收子单、生产力复盘、成功 run 自动交接再 wake、monitor 造子单、CEO/CTO 定时扫 inbox。

---

## 2. 关断清单（4100）

### 2.1 环境变量（写入后重启 API）

仓库根 `.env`（`PORT=4100`）并同步 `%USERPROFILE%\.paperclip\instances\default\.env`。

```env
PAPERCLIP_STRANDED_ISSUE_RECOVERY_ENABLED=false
PAPERCLIP_ORPHAN_RUN_REAP_ENABLED=false
PAPERCLIP_ISSUE_GRAPH_LIVENESS_ENABLED=false
PAPERCLIP_SILENT_ACTIVE_RUN_WATCHDOG_ENABLED=false
PAPERCLIP_PRODUCTIVITY_REVIEWS_ENABLED=false
PAPERCLIP_SCHEDULED_RETRY_PROMOTION_ENABLED=false
```

| 关掉后少什么 |
| --- |
| 滞留回收 / handoff / monitor recovery 链 |
| 生产力复盘衍伸单 |
| 图 liveness 自动恢复 |
| 静默 run 自动评估单 |
| 孤儿 run 周期收割 |
| 预约重试自动提升 |

控件含义总表：[编排控件一览](编排控件一览%20orchestration-controls.md)

### 2.2 实例实验设置

`GET/PATCH /api/instance/settings/experimental`：

```json
{
  "enableTimerHeartbeatByDefaultForEligibleRoles": false,
  "timerHeartbeatEligibleAgentRoles": [],
  "enableIssueGraphLivenessAutoRecovery": false
}
```

### 2.3 智能体

- **全部** `runtimeConfig.heartbeat.enabled = false`，除非董事会单点开某角色 timer。  
- 漏网例：某 QA 岗仍为 `true` 会定时 wake——须 PATCH 关掉。  
- 阶段零配合 **Pause + 按需 invoke**（见 [派单与能力表](派单与能力表%20dispatch-and-roles.md)）。

### 2.4 仍会发生（刻意保留）

指派、手动唤醒、评论唤醒（带档位）、run 正常结束、人标 `blocked`。

---

## 3. 改完怎么验（约 2 分钟）

```powershell
pnpm dev:stop
pnpm dev:once
curl.exe http://127.0.0.1:4100/api/health
curl.exe http://127.0.0.1:4100/api/instance/settings/experimental
```

**通过：** health `ok`；experimental 里 timer 角色为空数组；48h 内无莫名衍伸单。

**仍冒衍伸单：** 记 `identifier` / 标题关键词 → 查 [`部署/13`](../部署/13%20数据面查证%20data-forensics.md)，补漏网 automation。

启停细节：[`部署/11 本地运维`](../部署/11%20本地运维%20local-instance-ops.md)

---

## 4. 按需再开（顺序强制）

1. 简单编排 **已跑顺**（派活 → run succeeded → 中文摘要 → done）。  
2. 记下 **重复人工步骤**（例：每次 assign 后都要再点唤醒）。  
3. **只开一条**（一个 env 或一个 experimental 项）。  
4. 用 [结单与回写](结单与回写%20completion-and-writeback.md) 验 **一条事务** + 观察 48h。  
5. 记入 [编排改进与演进](编排改进与演进%20orchestration-improvement.md) 启用表。

**不要：** 因 upstream changelog 整包 merge 默认编排。

---

## 5. 启用记录（空白）

| 日期 | 痛点 | 开启项 | 验收事务 | 结果 |
| --- | --- | --- | --- | --- |
| （待填） | | | | |

---

*2026-05-20 · 源：最佳实践 025*
