---
id: exec-008-cursor-role-selection
status: 已完成
ledger: ./任务执行台账.md
updated: "2026-05-14"
---

# 任务 008 — Cursor Composer 2 角色选型

**返回：**[`任务执行台账.md`](任务执行台账.md)

---

## 1. 需求

### 要什么

决定 routic 公司中哪些角色使用 Cursor Composer 2（主策略/辅助策略），并落实到 agent 配置。

### 验收直觉

1. 明确 Cursor Composer 2 的主战场角色
2. 明确辅助/替补使用场景
3. 对应 agent 配置调整到位

---

## 2. 背景

routic 当前 8 个 agent，3 种壳子（CodeBuddy、Qwen、Cursor），4 类模型来源：
- 火山方舟池：GLM-5.1、Kimi K2.6、DeepSeek-V4-Pro
- 阿里百炼池：Qwen 3.6 Plus、GLM-5.0
- Cursor 订阅池：Composer 2 Fast
- DeepSeek 自研端点：按量计费

Composer 2 Fast 特点：消耗 Auto+Composer 订阅池，不走 API 计费，$20/月封顶。

---

## 3. 执行方案（已决）

**时间策略：**完整「谁主用 / 谁替补 Composer 2」的矩阵 **推迟到当前 Cursor 订阅到期之后**再评估；到期前不为此投入多角色分拆与对照实验。

**当前唯一 Cursor 执行位（订阅期内）：**

- **Agent：**`开发-Cursor-composer2fast`（routic 树下 **CTO** 线，adapter `cursor`，model **`composer-2-fast`** / Composer 2 Fast）。
- **含义：**凡需走 Cursor 订阅池（Auto+Composer）的执行，**只**经该 agent；其它职能继续用既有 CodeBuddy / Qwen 等配置，**不因本单**新增第二个 Cursor 角色或改绑 model。

**配置动作：**沿用 [`005-cursor壳子修复可用composer2.md`](005-cursor壳子修复可用composer2.md) §11 已落位的架构，**不**要求本轮再 PATCH 多个 agent；决策即「维持现状至订阅末期再议」。

---

## 4. 执行回写

**验证证据（2026-05-14）：**

- 人类当轮拍板：**订阅到期后再做**完整 Cursor 选型；**目前仅** **Composer 2 Fast** 作为唯一 Cursor **执行位**（`开发-Cursor-composer2fast`）。
- 本单原验收项「多角色主次划分 + 对应配置大改」按 **范围推迟** 关闭；到期前以本条为真值，另开新单承接到期前评估亦可。
