# 编排控件一览

**读者：** 董事会、主控——先知道「能拧什么」，再去看 [实例开关与阶段零](实例开关与阶段零%20instance-switches.md) 里 **现在开没开**。

---

## 1. 三类控件

| 类型 | 在哪拧 | 例子 |
| --- | --- | --- |
| **环境变量** | 仓库根 `.env`、实例 `.env`；改后 **重启 API** | 关滞留回收、关复盘单 |
| **实例实验设置** | Board 或 `PATCH /api/instance/settings/experimental` | 默认 timer 心跳、图 liveness |
| **智能体配置** | 每个 agent 的 heartbeat / pause / wakeOnDemand | 定时扫 inbox、按需唤醒 |

还有 **行为型控件**（不单独一个开关，但算编排）：指派、checkout、评论唤醒档位、手动 wakeup、interaction 里 `wake_assignee`。

---

## 2. 自动化控件（env，人话）

| 控件 | 变量（简写） | 开着会怎样 | 阶段零默认 |
| --- | --- | --- | --- |
| 滞留事务回收 | `PAPERCLIP_STRANDED_ISSUE_RECOVERY_ENABLED` | 自动造回收/交接类子单 | **关** |
| 生产力复盘 | `PAPERCLIP_PRODUCTIVITY_REVIEWS_ENABLED` | 自动复盘衍伸单 | **关** |
| 事务图自愈 | `PAPERCLIP_ISSUE_GRAPH_LIVENESS_ENABLED` | 图 liveness 自动恢复 | **关** |
| 静默 run 看门狗 | `PAPERCLIP_SILENT_ACTIVE_RUN_WATCHDOG_ENABLED` | 对「不出声」的 run 自动评估 | **关** |
| 孤儿 run 收割 | `PAPERCLIP_ORPHAN_RUN_REAP_ENABLED` | 启动/周期清孤儿 run | **关** |
| 预约重试提升 | `PAPERCLIP_SCHEDULED_RETRY_PROMOTION_ENABLED` | 到点自动重试排队 | **关** |

完整变量名与表见 [实例开关与阶段零](实例开关与阶段零%20instance-switches.md)。

---

## 3. 实例实验设置（JSON）

| 字段 | 开着会怎样 | 阶段零默认 |
| --- | --- | --- |
| `enableTimerHeartbeatByDefaultForEligibleRoles` |  eligible 角色默认开 timer | **false** |
| `timerHeartbeatEligibleAgentRoles` | 哪些角色吃 timer | **[]** |
| `enableIssueGraphLivenessAutoRecovery` | 与 env 图 liveness 叠加 | **false** |

---

## 4. 智能体侧

| 控件 | 字段 / 操作 | 说明 |
| --- | --- | --- |
| 定时心跳 | `runtimeConfig.heartbeat.enabled` | 阶段零 **全员 false**，除非董事会单点授权 |
| 按需唤醒 | `heartbeat.wakeOnDemand` | false 时只能靠指派/评论/checkout 等路径 |
| 暂停 | Board `pause` / `resume` | pause 会 cancel 当前 run；**agent key 不能替别人 resume** |
| 并发上限 | `maxConcurrentRuns` 等 | 与 timer 退让并排时有「让路」语义 |

---

## 5. 仍保留的「人主动」行为（阶段零刻意不关）

| 行为 | 谁触发 |
| --- | --- |
| 指派事务 | 董事会 / Board |
| 手动唤醒、invoke | 人点或 `heartbeat run` |
| 评论唤醒（带档位） | 人在子单评论；档位见长期需求「评论唤起」母本 |
| 正常 run 结束 | succeeded / failed，**不**自动造交接单 |
| 人标 blocked | 不替换成 recovery 子单 |

---

## 6. Board 用语（写文档、派活时统一）

| 别说 | 应该说 |
| --- | --- |
| 编排注入（当页面名） | **运行清单**（路由 `/{前缀}/runs`） |
| run 成功 = 任务完成 | **分开验**：run 终态 + 事务 `done` + 回写 |

口径详表仍见 `docs/项目计划/最佳实践/023-…`（链接阶段未迁）。

---

## 7. 和查库、排障的分工

- **看开关有没有生效：** 启动日志、experimental GET、agent PATCH 回读。  
- **看出没出怪 run：** [`docs/部署/13 数据面查证`](../部署/13%20数据面查证%20data-forensics.md)  
- **看出没出怪进程：** [`docs/部署/12 进程监控与回收`](../部署/12%20进程监控与回收%20process-monitor-recovery.md)

---

*2026-05-20 · 合并旧 025 §3、023 编排用语*
