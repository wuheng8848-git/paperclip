# 任务执行与接力

**定位：** 子单 **指派出去之后**，谁先动、用什么 API、**pause / heartbeat / wakeOnDemand** 怎么同框——减少「父单批了但 CTO 没跑」。

---

## 1. 词先对齐

| 口语 | 意思 |
| --- | --- |
| **审阅** | 人读 diff / 评论，**不是**系统门禁 |
| **审批** | 预算/门控类 **硬闸门** |
| **经办** | 当前 `assigneeAgentId` 的责任人 |
| **接力** | 改 assignee / 子单 / 评论里写清下一棒 —— 要留在 Board 上 |

多人并行：拆 **子 issue**；单 issue 多角色抢终态 → 先对齐 [派单与能力表](派单与能力表%20dispatch-and-roles.md)。

---

## 2. 硬规则（必记）

| 规则 | 人话 |
| --- | --- |
| 可变更加 run 头 | 改事务/评论/checkout 等，带 **`X-Paperclip-Run-Id`**（agent 发起时） |
| pause / resume | **只有 Board** 能 resume 别人；CEO agent key **不能** 解冻 CTO |
| 代唤醒 | Board 可 `POST /agents/{id}/wakeup`；agent **只能叫自己** |
| checkout | 认领事务；非「经办自己当前 run」再 checkout 时，可能 **assignment wakeup** |

---

## 3. 开跑前对表（经办 agent）

| 条件 | 不满足怎么办 |
| --- | --- |
| `status !== paused` | Board **resume** |
| `heartbeat.enabled` | 只能靠 wakeup / 评论 / checkout 等按需路径 |
| `wakeOnDemand !== false` | 否则先改配置或走评论/checkout |

---

## 4. 标准剧本：父批 → 子单 → 叫醒 CTO

1. （可选）父单 comment 留子单指针。  
2. **建子单**：`assigneeAgentId` = CTO，`status: todo`。  
3. CTO **paused** → Board **resume**。  
4. **叫醒**（按需组合）：  
   - Board **checkout** 子单给 CTO → 可能 assignment wakeup  
   - Board **`/wakeup`**（勿用 CEO key 叫 CTO）  
   - **评论唤醒**（档位合规）  
   - **interaction** + `continuationPolicy: "wake_assignee"`  
5. CTO 在自己 run 里继续改事务，**同一 runId**，别让 CEO 乱 PATCH agent 配置。

---

## 5. 反模式

- CEO 在长 run 里 **PATCH CTO 的 heartbeat** → 易 403/422，配置乱。  
- **正路：** Board resume / wakeup / 评论 / interaction；配置级改动 Board PATCH agent。

---

## 6. 和开关的关系

- 阶段零 **timer 关**：执行靠 **人派 + invoke + checkout + 评论**，不靠 inbox 自扫。  
- 见 [实例开关与阶段零](实例开关与阶段零%20instance-switches.md)。

关单后 run 仍跑：查 [`部署/13`](../部署/13%20数据面查证%20data-forensics.md) 僵尸 run 节。

---

*2026-05-20 · 源：014 + 017*
