# 5月16日 codex主脑对话 — 整理版

> 日期：2026-05-16 17:27 ~ 17:40
> 参与者：吴衡（用户） + Codex（AI主脑）
> 主题：观测面设计 + 上游作者意图探查 + live digest 方向

---

## 一、主脑交接与定位

### 1.1 交接上下文

新窗口 Codex 主脑通过"董事会交接提示词"完整接手 5 月 15 日的全部共识，包括：
- Paperclip 执行控制面定位
- Qwen 高频执行工角色
- 技能系统设计方向
- Jarvis 降级策略
- 当前暴露问题清单
- 已落地文档/代码记忆

### 1.2 主脑工作原则

- 先做判断框架和派单边界，不动代码
- 不接管 Paperclip 执行面、不创建公司、不 push
- 需要读文件时先说明读什么、为什么
- 需要改代码、写文档、提交或起服务时等明确授权

---

## 二、观测面问题分析

### 2.1 当前观测三层断裂

| 层 | 现状 | 问题 |
|---|---|---|
| 心跳任务清单 | 已自建，看哪些 agent 配了心跳 | 不看"执行中做到哪了" |
| run transcript（原始/友好视图） | 信息最全 | 噪声高，像调试日志不像管理视图 |
| issue 评论区 | 最人类友好 | agent 执行中长时间静默时，董事会失明 |

**核心痛点**：智能体任务执行中没回来写评论，这段时间内完全没辙。

### 2.2 上游作者设计意图

通过 GitHub 上游仓库和文档查到：

| 来源 | 核心观点 |
|------|----------|
| PRODUCT.md | Paperclip 是 control plane not execution plane，agent 在各自 runtime 里跑并回传 |
| agents-runtime.md | heartbeat run 是执行窗口，不是常驻会话；adapter 持续捕获 stdout/stderr/事件 |
| Releases | "Run transcripts render markdown, fold command stdout, redact home paths, display humanized event labels" |
| PR #3079 | 核心 operator workflow 是 "reading issue threads, watching runs, and guiding agents"，旧 issue thread 像 log stream，需改成连续 chat 体验 |

**上游解决的问题**：呈现层可读性（issue chat thread、folded reasoning、rolling tool activity、timing metadata）

**上游没解决的问题**：执行中管理摘要（董事会可读的实时状态判断）

### 2.3 三种记录的定义

| 类型 | 定位 | 特征 |
|------|------|------|
| **transcript** | 事实日志 | 所有 CLI 活动的可审计原始证据，完整但不负责好读 |
| **live digest** | 实时仪表盘 | 从 transcript 事件流抽取"现在发生了什么"，不必完整但必须可判断 |
| **issue comments** | 正式工作记录 | agent 在关键 checkpoint 写给人看的阶段性结论，不是实时遥测 |

**不要混用**：不要把评论区改造成实时流，也不要指望 friendly transcript 直接解决问题。

---

## 三、Live Run Digest 方案

### 3.1 设计思路

digest 坐在 transcript 和 issue comments 中间：

```
transcript（事实证据） → live digest（运行中摘要） → issue comments（正式阶段记录）
```

### 3.2 第一版：规则抽取，不需要 LLM

从 run transcript 自动提炼，Qwen 不配合也能工作：

| 字段 | 内容 |
|------|------|
| 当前状态 | queued / running / waiting / stale / completed / failed |
| 最近动作 | 最近 3-5 个高价值事件：读了哪些文件、跑了什么命令、改了哪些文件、遇到什么错误 |
| 当前阶段推断 | 探查中 / 修改中 / 验证中 / 收口中 / 卡住疑似 |
| 最近更新时间 | 多久没产生日志 |
| 可疑信号 | 重复搜索、长时间无输出、命令挂起、run 属于已 terminal issue |

### 3.3 第二版：评论区变成正式 checkpoint

只要求 agent 在关键节点写评论：
- 接单后：确认边界
- 探查后：报告方案
- 修改后：报告改动
- 验证后：报告结果
- 收口时：交付结论

**不要求每一步都评论**，否则烧 token 且污染 issue。中间状态由 live digest 负责。

### 3.4 第三版：控制塔视图

聚合页，不是每个 issue 点进去看：

- 正在运行的 run
- 对应 issue / agent / company
- 最后活动时间
- 当前摘要
- 是否疑似 stale
- 快捷动作：打开 issue、打开 transcript、cancel、pause heartbeat

### 3.5 分阶段实现

| 阶段 | 内容 |
|------|------|
| 1. 只读探查 | run transcript 数据结构、UI 友好视图渲染方式 |
| 2. 只读探查 | issue 详情页和运行页入口、心跳任务页之间现有 UI 结构 |
| 3. 方案草案 | live run digest MVP：字段、事件分类规则、stale 判定、UI 展示位置 |
| 4. 实现 | 只做观察，不改执行语义；加运行摘要组件或 API 聚合层 |

**核心原则**：不要同时修 heartbeat/cancel/auto continuation，避免混在一起。

### 3.6 与 Jarvis 能力的关系

| | Jarvis | Paperclip live digest |
|---|---|---|
| 抽取对象 | 完整会话 | 增长中的 transcript |
| 用途 | 事后复盘、阶段结转、计划回写 | 当前状态判断 |
| 时机 | 会话结束后 | 执行进行中 |

第一版甚至不需要 LLM。等规则版跑通，再考虑用小模型把最近 N 条 transcript 压成一句"当前进展"。

---

## 四、后续执行事项

### 4.1 主脑要判断的事情

| 事项 | 优先级 |
|------|--------|
| 控制面语义优先级：terminal issue、stale run、heartbeat、cancel、pause、auto continuation | P0 |
| Qwen 默认角色协议写进哪里：adapter system prompt / 角色 instruction / skill / 派单模板 | P0 |
| 技能最小集：探查、收口、验证、状态回写的边界 | P0 |
| 结转机制：Paperclip → Token/Jarvis 项目计划的周期、责任人、格式 | P1 |
| 观测与验收口径：什么算"完成" | P1 |
| 执行面迁移顺序：先修控制面 bug 还是先补 Qwen 纪律 | P0 |

### 4.2 可派给 Paperclip/Qwen 的执行事项

| 任务 | 范围 | 禁止 |
|------|------|------|
| 只读探查：运行状态语义现状 | 查 issue terminal、run 状态、heartbeat、auto continuation 实现 | 不改代码 |
| 只读探查：Qwen adapter prompt 链路 | 查 prompt 拼接、instruction/skill 读取、PAPERCLIP_API_URL 使用 | 不改代码 |
| 起草技能草案 | 写四个技能职责、禁止事项、收口格式草案 | 暂不落盘 skills/ |
| Paperclip 观测 API 只读检查 | /api/health、companies、issues、runs | 不改状态 |
| 最小修复方案设计 | terminal issue 后 run 失效、UI 展示、heartbeat 停 | 先不写代码 |

### 4.3 当前判断

- **不要现在派"实现修复"给 Qwen**
- 先派两个只读探查任务，拿到控制面状态机和 Qwen prompt 链路
- 再由主脑定语义
- 否则 Qwen 可能从局部代码出发，补出一个能过测试但语义继续含糊的 patch

---

## 五、关键判断

> "不要把问题理解为'评论区不够实时'，也不要只修 friendly transcript。真正该补的是：基于 run transcript 的 live digest 层。"

> "transcript = 事实日志；live digest = 实时仪表盘；issue comments = 正式工作记录。不要混用。"

> "上游解决的是呈现层可读性，不是董事会实时摘要。我们应该从'人类化 transcript'升级成'董事会可读观测面'。"

> "第一版甚至不需要 LLM。可以先用规则抽，等跑通再用小模型压缩。"
