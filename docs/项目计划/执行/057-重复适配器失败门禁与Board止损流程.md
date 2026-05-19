---
id: exec-057-recurring-adapter-failure-governance-board-stop-loss
parent: ../00.项目任务清单.md
legacy_ref: "057"
status: 待办
updated: "2026-05-18"
---

# 057 — 重复适配器失败门禁与 Board 止损流程

**返回：**[`../00.项目任务清单.md`](../00.项目任务清单.md)

## 背景与动机

- 单次幽灵 run（适配器秒退、`stderr` 空、`exitCode≠0` 等）会牵动长时间静默观测；历史上易出现 **大量复盘子单噪声**。  
- **系统自动评估单归拢**：同一 heartbeat **`runId`** 的 **`stale_active_run_evaluation`** 已改为 **单母单复活**（复检不再新开编号），见 **recovery / `scanSilentActiveRuns`** 行为变更（与本需求相邻但不代替本条）。  
- **本条补缺**：人类侧的 **重复同类故障止损**——当 **同一「错误指纹」在短时间内重复出现** 时，授权 **Board（通常由董事/CEO 持有会话）** **关闭失控 run**、**可选暂停经办智能体**，避免损失与噪声扩大；运维接手排查属于 **组织流程**，产品与权限需边界清晰。

## 关联前置（已实现或进行中）

| 材料 | 说明 |
| --- | --- |
| [`032-agent-pause止损与heartbeat释放一致性.md`](032-agent-pause止损与heartbeat释放一致性.md) | pause / cancel / checkout / recovery 一致性 |
| [`033-控制面-issue-run观测与checkout应急操作.md`](033-控制面-issue-run观测与checkout应急操作.md) | 观测与「一键止损」能力缺口（可与本条合并验收或分拆 UI） |

## 现有能力（无需重复造轮子部分）

- **取消单次 heartbeat run**：Board：`POST /api/heartbeat-runs/:runId/cancel`（`assertBoard`）。  
- **暂停智能体**：`POST /api/agents/:agentId/pause`；恢复后继续调度（见 032 与需求说明「手动 pause」口径）。

## 需求边界（待细化后实现）

### 1. 错误指纹（Error fingerprint）

- **必须定义**：哪些字段参与指纹（建议最小集：`adapterType`、`errorCode`、归一化后的 `error` 或摘要哈希；可选并入 `invocationSource`）。  
- **必须定义**：归一化规则（脱敏、截断、去掉 run id 等噪声），避免「同根因而指纹不同」。  
- **计数粒度**：按 **智能体** + 指纹，还是按 **公司** + 指纹；窗口 **时间跨度**（如 24h / 7d）与 **计数阈值**（产品缺省「**2 次**」需确认）。

### 2. 门禁与授权

- 达到阈值后：**不落自动 kill**（默认），而是 **Board 可见的告警**（Inbox / issue 评论 / 运行详情横幅）+ **一键动作**：  
  - **取消当前（或列出候选）活跃 run**；  
  - **可选：暂停该智能体**（与人类确认的运维窗口对齐）。  
- **禁止**：未授权角色扩大取消范围（例如跨公司、批量误杀）。

### 3. 运维与 CEO/Board 分工（文书固化）

- **Board**：止损决策（cancel run、pause agent）、解除 pause、确认恢复调度。  
- **运维/开发**：CLI、实例、`adapter` 版本、宿主机环境取证（可与 [`020-实践-排障指南.md`](../最佳实践/020-实践-排障指南.md) 对齐）。  
- **「排除运维人员」**：若指 **权限隔离**（仅有运维角色的账号不能做 Board 止损），需单列 **RBAC** 子需求；若指 **流程上先由 CEO 止损再由运维修**，本单以 **Playbook 段落** 固化即可。

### 4. 非目标（本轮不写死）

- **自动**因重复失败而 **无确认地** cancel/pause（除非董事会另立实例级开关）。  
- **替代** 适配器自身退出码与日志改进（可归 [`047-适配器_stdout解析失败与结构化摘要.md`](047-适配器_stdout解析失败与结构化摘要.md)）。

## 验收标准（占位）

1. 指纹与阈值写入 SPEC 或本单「已定」段，并通过评审。  
2. Board 侧可观测：重复命中时有明确入口与审计（`activity_log` / issue 评论任选其一为真源）。  
3. 一键止损与 pause 路径 **幂等**、**公司边界**校验完备；Vitest 覆盖关键闸门。  
4. **test-co** 闭环验证后再迁入 routic（[`AGENTS.md`](../../../AGENTS.md) §5.17）。

## 开放问题（实现前需人类拍板）

- 指纹是否忽略 **`timeout` vs `adapter_failed`** 等壳层差异？  
- 阈值计数是否 **排除** 已由人类 cancel 的 run？  
- UI 放在 **运行详情**、**智能体页** 还是 **全局 Inbox**？
