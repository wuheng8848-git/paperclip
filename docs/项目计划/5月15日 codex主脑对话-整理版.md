# 5月15日 codex主脑对话 — 整理版

> 日期：2026-05-15 01:04 ~ 03:43+
> 参与者：吴衡（用户） + Codex（AI主脑）
> 主题：Jarvis/Paperclip/Token/Hermes 系统架构决策 + Paperclip 首次实机调试

---

## 一、核心困境与架构决策

### 1.1 根本矛盾

> **"你想要一个 AI 公司替你推进 Token，但你又不能让这个 AI 公司变成另一个需要你每天照看的项目。"**

当前困境不是缺工具或缺项目，而是**缺稳定的执行组织形态**。手里每个能力块都像主控：
- Jarvis 可以像主控
- Paperclip 可以像主控
- Token 会反吸注意力
- 工具优化容易变成无限研究

### 1.2 三层架构原则

| 层级 | 名称 | 职责 | 决策者 |
|------|------|------|--------|
| **主权层** | 吴衡 + Jarvis | 决定今天做什么、保护注意力 | 吴衡 |
| **执行面** | Paperclip | 把已裁决任务拆给 AI 工人，记录 issue/run/result | Paperclip |
| **工人层** | Codex/Qwen/CodeBuddy/Hermes | 执行具体任务 | Agent |

**核心原则**：
1. Paperclip 只能接收已被 Jarvis/吴衡裁决过的任务
2. Paperclip 的输出只能以摘要回流 Jarvis
3. 任何对五仓真源的写入都必须带明确授权边界
4. **Paperclip 是工人账房和派工系统，不是第二个大脑**

### 1.3 氛围编程的毒性

两种坏状态：
- **高反馈高强度作战**：人被 AI 结果牵着跑，持续决策、纠错、切上下文
- **负反馈低脑力代理纠缠**：AI 没解决问题，却反复产出问题、解释、建议、半成品

**第一设计原则**：AI 不应该默认把结果实时甩给你，而应该进入**收件箱、摘要、固定检查点**。

---

## 二、五仓定位与角色

### 2.1 回形针侧口径

> **"Jarvis 管吴衡，Paperclip 管 AI 工人，Token 是工程真源。"**

| 仓 | 定位 | 真源内容 |
|----|------|----------|
| Token Bridge v2 | 工程真源 | 代码、工程文档、任务单、部署、验收证据 |
| Jarvis | 个人主控层 | 决定今天做什么、是否暂停、结果如何进入记忆 |
| Paperclip | 执行面控制面 | 执行账本和结果摘要 |
| Routic | 经营真源 | 公司与经营资料 |
| 工具优化 | 方法论 | 工具方法论和经验 |

### 2.2 三阶段落地

| 阶段 | 目标 | 关键动作 |
|------|------|----------|
| **A：执行链路 POC** | 跑通 issue → heartbeat → resultJson → QA → 摘要回流 | 建本地蜂群、选低风险任务、验证链路 |
| **B：受控开发** | 允许写代码但设边界 | 禁止 migration/计费/鉴权/生产，每 issue 写明边界 |
| **C：Jarvis 摘要集成** | Jarvis 读 Paperclip 摘要 | 只读状态/summary/risk/next_action/usage，不读完整 run log |

### 2.3 执行面验收前置条件

1. **修或验证 010 的派单/回收问题**：无 issue 不产生 run、issue done 后 run 可回收、避免重复派单
2. **把 016 的端到端成功链路沉淀成可复跑验收**：不只是"曾经跑过"，而是能重新跑最小 issue
3. **补出 026 的快速测试路径**：以后每次换适配器/调 heartbeat 都有最短验证序列

---

## 三、Jarvis 降级为 Paperclip 建设项目

### 3.1 降级理由

- Jarvis 没心跳、没裁决能力之前，让它当主控是空中楼阁
- Paperclip 已有心跳和工单系统，能承接"把 Jarvis 做活"的工程任务
- **过渡态**：吴衡 → Paperclip 里的 Jarvis 项目 → 工人
- **未来态**：吴衡 → Jarvis 主控 → Paperclip 执行面 → 工人

### 3.2 Jarvis 最小活口：每日裁决台

不是收件箱（Paperclip 也有），也不是完整主控（还没活），而是：

```
Jarvis v0 = 每日裁决台

只做 4 件事：
1. 今天候选：从手动输入、Paperclip 摘要、Token/Routic 状态拿候选
2. 今日只选 1-3 件：明确做什么，更重要是不做什么
3. 把任务派给执行面：生成 Paperclip issue 草案
4. 晚上收口：完成/阻塞/推迟/明天候选/进入记忆
```

### 3.3 Hermes 角色

**Hermes = 人和 Jarvis/Paperclip 之间的低摩擦通信层**

四件事：
1. **传达**：自然语言意图 → 整理成 Jarvis/Paperclip 可消费的任务草案
2. **提醒**：run 完成/失败/阻塞 → 只发摘要和链接，不贴完整日志
3. **收件**：临时想法 → 放进 Jarvis inbox，不消耗聊天上下文
4. **低摩擦确认**：是否批准任务？是否写入记忆？今天处理还是推迟？

### 3.4 Paperclip Inbox vs Jarvis Inbox

| | Paperclip Inbox | Jarvis Inbox |
|---|---|---|
| 服务对象 | AI 工人工作队列 | 吴衡注意力队列 |
| 关心什么 | 任务如何被机器执行 | 什么值得进入注意力 |
| 内容 | issue/run/recovery/block | 优先级/延后/跨域归并/记忆筛选 |

**Jarvis 必须比 Paperclip 多一层判断**：
- 这件事要不要打扰你
- 什么时候打扰你
- 需要什么级别的决定
- 不处理会不会损害 Token/Routic/个人节奏
- 是否只是 AI 执行面内部噪声

---

## 四、ROU-51/52 首次实机调试记录

### 4.1 任务：审计 Jarvis 现有收件箱与今日裁决能力

**目标**：确认 Jarvis 当前 UI/API/DB 中收件箱能力已实现到什么程度

**结果**：ROU-51 done，但执行过程暴露了多个问题

### 4.2 审计结论（ROU-51 产出）

#### 已有能力

| 能力 | 状态 |
|------|------|
| 收件箱系统 | ✅ 数据来源：记忆工程产物 → 正则解析 → SQLite，7 字段完整 |
| 今日待办视图 | ✅ 数据来源：Token P5 执行目录 Markdown 表格，10 秒刷新 |
| 任务看板 | ✅ 数据来源：docs/任务看板.md，SQLite 缓存 |
| 自动判断能力 | ✅ LLM 批量判断，置信度阈值 0.8，低置信度转人工 |

#### 真正缺口

| 缺口 | 状态 |
|------|------|
| Hermes/Paperclip 摘要导入 | ❌ 无任何代码实现 |
| 外部信号管线（L1-L5） | ❌ Stub 框架，未接入主线 |
| 每日裁决台心跳 | ❌ 有数据但无定时自动提取 |
| 优先级解释 | ❌ processing 是状态不是优先级，无 P0/P1/P2 |
| 脚本依赖断裂 | ❌ prune/intent 脚本跨项目未迁移 |

### 4.3 Qwen 适配器 401 问题

**现象**：
- Qwen CLI 能找到（v0.15.11），但模型调用返回 DashScope 401
- run status = succeeded，但 result_json.result 是 `[API Error: 401 Incorrect API key provided...]`
- usage_json token 全是 0

**根因**：
1. `cheap` profile 原来指向不存在的模型 `qwen3.6-coder`，而实际配置是 `qwen3-coder-plus`
2. Qwen 适配器把 API error 当成成功（只看 `subtype !== "success"` 和退出码）
3. recovery issue ROU-52 用了 `assignee_adapter_overrides: {"modelProfile": "cheap"}`，切到错误模型

**修复**：
- 更新 `qwen_local` 模型列表，对齐 `~/.qwen/settings.json` 中的 Coding Plan 模型
- `cheap` profile 改为 `qwen3-coder-plus`
- 提交：`f69feba`（文档）+ `d393ead`（代码）

**待修**：适配器仍需把 `[API Error:` / `Incorrect API key` 等识别为失败

### 4.4 ROU-52 recovery 问题

- ROU-52 标题：`Recover missing next step ROU-51`
- 状态：blocked → 后来改为 done
- **问题**：recovery 继续派给同一个 Qwen agent（"死人修死人"）
- **正确策略**：adapter/auth/provider/config 类失败 → human/ops/different agent

---

## 五、Qwen 适配器配置口径

### 5.1 模型列表（已对齐 Coding Plan 配置）

| 模型 | 用途 |
|------|------|
| qwen3.6-plus | 主模型 |
| qwen3.5-plus | 备用 |
| qwen3-coder-plus | cheap profile |
| qwen3-coder-next | 最新 |
| qwen3-max-2026-01-23 | - |
| glm-5 / glm-4.7 | - |
| kimi-k2.5 / MiniMax-M2.5 | - |

**不列入**：OAuth 硬编码模型（已废弃）、DashScope 标准端点其它模型、OpenRouter/Fireworks/Ollama

### 5.2 配置优先级

| 配置位置 | 用途 | 是否放密钥 |
|----------|------|------------|
| `C:\Users\wuhen\.qwen\settings.json` | 用户级真源（modelProviders、baseUrl、auth） | ✅ 可以 |
| Paperclip agent env（adapter_config.env） | BAILIAN_CODING_PLAN_API_KEY | ✅ 必须 |
| `C:\Users\wuhen\code\jarvis\.qwen\settings.json` | 项目级兜底（非密配置） | ❌ 不要 |

### 5.3 心跳配置建议

| 参数 | 初始值 | 稳定后 |
|------|--------|--------|
| 最小间隔 | 300s | 600s |
| 最大并行 | 1 | 1 |
| 自动接续 | 关或 1 | 2 |
| 接续等待 | 60s | 60s 或 120s |

**不建议**：最小间隔 10s + 接续等待 1s（太像调试档，会反复烧模型）

---

## 六、技能库分配原则

### 6.1 Code Agent 不应加载全部公司技能库

三层分配：
1. **必带**：paperclip 协作协议、repo 开发规则、issue checkout/heartbeat
2. **按需带**：paperclip 技能（curl 安全写法、API 调用）、代码风格规范、测试规范
3. **不带**：CEO/管理/经营/记忆/部署等非执行技能

### 6.2 自带技能库按角色分配

- **CEO/Manager**：任务拆分、审批流、预算、recovey 策略
- **Code Engineer**：代码规范、测试、git、CI
- **QA Reviewer**：验收规则、回归测试、风险检查
- **Memory Archivist**：摘要格式、记忆索引、Jarvis 回流协议

---

## 七、待办事项

### 7.1 Paperclip 侧

| 任务 | 优先级 | 状态 |
|------|--------|------|
| Qwen smoke issue（30 秒凭据验证） | P0 | 待做 |
| 修 Qwen 适配器 API error 判定 | P0 | 待做 |
| ROU-51 标记 done | P0 | ✅ 完成 |
| ROU-52 标记 done | P0 | ✅ 完成 |
| 开发 Qwen agent maxConcurrentRuns 改为 1 | P0 | ✅ 完成 |
| 心跳配置调为推荐值 | P1 | 待做 |
| Jarvis 项目创建 + 第一批 issue | P1 | 待做 |

### 7.2 Jarvis 侧（作为 Paperclip issue）

| Issue | 目标 |
|-------|------|
| ROU-52+：Jarvis 定时心跳最小骨架 | 可手动触发、可定时注册、可记录状态 |
| 后续：Paperclip 摘要导入 Jarvis | 定义摘要对象导入入口 |
| 后续：Hermes 消息进入候选池 | 短消息进入 Jarvis inbox |
| 后续：今日裁决台最小页面 | 5 个区块：候选/建议/拍板/推迟/收口 |
| 后续：优先级字段与裁决规则 | domain/impact/urgency/blocker/energy/risk |
| 后续：晚间收口摘要 | 完成/阻塞/推迟/明天候选/记忆 |

### 7.3 原则冻结

- ✅ 不再扩写四仓/五仓定位文档
- ✅ 分析文档已过量，下一步是执行
- ✅ Token 暂不大规模托管，等执行闭环稳定
- ✅ 新 agent 上真实任务前先跑 30 秒 smoke issue
- ✅ 低成本模型用窄任务 + 文件白名单 + 收口指令

---

## 八、Paperclip 收口协议缺陷（ROU-49/54/55 事件）

### 8.1 ROU-49 时间线

| 时间 (UTC+8) | 事件 |
|---|---|
| 02:05:44 | ROU-49 创建，todo，未指派 |
| 04:08:12 | 人类指派给 Qwen，触发 Run 1（succeeded, 11min） |
| 04:19:47 | Paperclip liveness 判断 plan_only → 自动接续 Run 2（succeeded, 1h45min） |
| 06:05:18 | 再次 liveness continuation → Run 3（succeeded, 23min） |
| 06:28:50 | 系统评论 "needs a disposition"，创建 corrective handoff Run 4 |
| 06:29:33 | Qwen 评论写 "最终处置: done"，但 Paperclip 未识别为正式状态变更 |
| 06:30:03 | 升级 recovery → ROU-53 blocks ROU-49，两者都 blocked |

**关键发现**：4 次 run 都 succeeded，但 Qwen 只在评论里写 done，没有调用 API 正式改 issue 状态。

### 8.2 ROU-54 探查：Qwen 收口能力缺口

**目标**：只读探查 Qwen 为什么无法正式收口 issue

**结论**：
- Qwen 探查报告已生成（`探查-ROU54-Qwen-issue-收口能力缺口.md`）
- Qwen 声称 "无 PAPERCLIP_API_URL / PAPERCLIP_API_KEY"
- 但 run event 显示 Paperclip **确实注入了这些环境变量**
- **真因**：Qwen 运行过程中没有正确感知/使用注入的 env
- ROU-54 同样没收口 → 创建 ROU-55 → 再次复现

### 8.3 ROU-55：Qwen 调用公网 API 问题

**根因**：Qwen 旧 session 固化了 `https://api.paperclip.ai`，没有使用注入的 `PAPERCLIP_API_URL=http://127.0.0.1:3100`

**修复**（execute.ts）：
1. 明确提示 Qwen 必须使用注入的 `PAPERCLIP_API_URL`，禁止替换为公网地址
2. 对 Paperclip issue/收口类唤醒强制开新 Qwen session（`--fresh`），不再 `-c` 复用旧 session
3. 清掉残留进程，重启服务

**遗留问题**：旧会话在修复后仍有价值，"总是 fresh" 是止血手段，最终应改为"污染检测后 fresh"

### 8.4 Cursor adapter reconnect loop 问题

**现象**：ROU-55 被派给 Cursor，但 Cursor CLI 进入连接恢复死循环

```
connection reconnecting → retry starting → resuming → reconnected → （循环）
Failed to run step, exceeded max retries
```

**根因**：不是 Paperclip 调用错，而是 Cursor CLI 内部连接不稳定。Paperclip adapter 没有把 `exceeded max retries` 识别为快速失败。

**建议**：
- Cursor adapter 识别 reconnect loop 快速失败
- Cursor 暂不接 recovery 类任务
- 先用低风险短任务验证无头稳定性

---

## 九、心跳观测面板 UI

### 9.1 新增"心跳任务"页面

**位置**：左侧一级栏目"工作" → "心跳任务"

**展示内容**：
- 已启用心跳的 agent 数 / 已配置的 agent 数 / 当前运行中的 heartbeat run 数
- 每个 agent 的心跳开关、间隔、冷却、最大并行、自动接续等待/次数、上次心跳、最近一次运行

**改动文件**：
- `ui/src/pages/HeartbeatTasks.tsx`（新页面）
- `ui/src/App.tsx`（路由接入）
- `ui/src/components/Sidebar.tsx`（左侧导航入口）
- `ui/src/lib/i18n.ts`（文案）

### 9.2 心跳观测面板设计原则

**最关键 4 个信号**：
1. wakeReason：为什么醒
2. sessionMode：新会话还是旧会话
3. postRunDisposition：run 完后系统认为有没有有效处置
4. nextWake：系统下一步会不会继续叫它

**原则**：不要先改心跳机制，先改观测面。现在最大痛点是人类看不到"判断链"。

---

## 十、Token 项目执行计划与 Paperclip 的关系

### 10.1 真源划分

| | Token 项目 `docs/03-项目执行计划/` | Paperclip 数据库 |
|---|---|---|
| 内容 | 阶段章程、看板源、候选池、人类事项、关闭证据、封板口径 | issue、agent、heartbeat、run、评论、阻塞关系 |
| 角色 | 长期真源 / 战略与阶段计划 / 证据归档 | 运行时镜像 / 执行派单 / 控制面观测 |
| 更新频率 | 低频 | 高频 |

### 10.2 执行协议

1. **任务开始时只带最小上下文**：Paperclip issue 里只放摘好的目标、范围、完成定义
2. **执行过程中只写 Paperclip**：agent 只回写 Paperclip 评论和状态，不强制同步项目文档
3. **项目文档批量回写**：每天/每批任务结束后由董事会低频整理，把已完成/阻塞/迁移回写
4. **只有关键任务才要求项目文档回写**：阶段封板、架构决策、生产变更、密钥真源

**结论**：Paperclip 是执行账本 + 定期结转，不是双写系统。

---

## 十一、技能系统设计

### 11.1 Paperclip 技能加载机制

| 触发方式 | 现状 |
|---|---|
| 公司级技能 | 不会全量默认给 agent，只带 `required: true` 的内置技能 |
| heartbeat 时 | 公司技能库作为候选池传给适配器 |
| 永久安装 | Agent 技能页配置 `desiredSkills`，同步到 CLI skills 目录 |
| 临时追加 | issue 标题/描述/评论中 `/` 插入 `/skills/<skill-id>` 链接 |
| 角色自动映射 | ❌ 目前不存在 |

### 11.2 技能分配策略

**分层**：
- `baseSkills`：每个 agent 都带，极少量，稳定规则
- `roleSkills`：按 agent 角色固定带（dev / researcher / qa / ops）
- `taskSkills`：由 issue 标签、项目、文件路径、adapterType 动态挂载
- `forbiddenSkills`：明确禁止某些角色使用

**Qwen 开发 agent 推荐技能包**：
- 默认：Paperclip 协作协议、当前 repo AGENTS、基础开发验证规则、Qwen 本地适配器运行说明
- 临时：adapter 任务 → create-agent-adapter；UI 任务 → design-guide；文档任务 → doc-maintenance

### 11.3 技能系统核心目标

> **把人类临场写高质量提示词这件事产品化、自动化、低成本化。**

- 技能不是越多越好，每个高频执行角色只挂 2-4 个核心技能
- 技能要替代的是"你每次都要说的话"：别重复搜索、先确认事实、做完必须更新状态
- 技能不是给强模型补脑，是给弱/中模型装护栏
- 角色默认技能 + 任务临时技能

---

## 十二、模型定位与分工

### 12.1 Cursor / Composer

| 维度 | 判断 |
|------|------|
| 模型能力 | 强，基于真实 IDE 编程数据深度优化 |
| IDE 体验 | 目前排名第一的 AI IDE，人在场时高效 |
| Paperclip 无头适配器 | 不稳定（reconnect loop / process_lost） |
| 定位 | 快速局部实现 / 前端 UI / 汉化 / 小重构 / 配置修正 |
| 禁止 | recovery / missing disposition / 控制面自愈 / 无人值守长心跳 |

### 12.2 Qwen

| 维度 | 判断 |
|------|------|
| 执行能力 | 已恢复，能连续处理 Jarvis 主控任务，自动排序推进 |
| 裸跑探查 | 会广撒网、重复 grep、烧 token |
| 收口能力 | 有 API 能力，但 prompt 未教会正式改 issue 状态 |
| 定位 | 高频开发/探查/执行工人 |
| 需要技能 | 代码探查纪律、任务收口协议、最小验证纪律、Paperclip 状态回写 |

### 12.3 Codex

| 维度 | 判断 |
|------|------|
| 适合角色 | CEO/CTO/审计脑 |
| 适合任务 | 拆任务、判断优先级、验收、异常恢复 |
| 不适合 | 普通开发执行面主力 |
| 风险 | 额度烧得快，收口协议不够硬时被拖累 |

---

## 十三、主脑 / 董事会职责

**6 件事**：
1. **判断**：什么该做，为什么
2. **路由**：谁来做，带什么技能
3. **约束**：做到哪里算完成、禁止扩展什么、遇到阻塞怎么报
4. **验收**：是否真的完成、是否伪完成、是否产生新风险
5. **沉淀**：反复出现的问题沉淀为角色默认指令、技能、派单协议
6. **收口**：把混乱输入变成可执行任务，把执行结果收成可靠状态

**核心原则**：主脑不是高频打工人，而是低频高判断的调度和裁决层。

---

## 十四、Git 提交纪律

**风险**：多执行者并发工作（人 + Qwen + Cursor），不及时提交会：
- 人和 AI 改动混在一起，无法判断谁改的、为什么改
- 无法回滚到稳定点
- 执行者误判脏工作区上下文
- 调试证据丢失

**规则**：
1. 适配器修复，必须提交
2. UI 观测面，单独提交
3. 文档协议，单独提交
4. Qwen 做的大批汉化，单独提交
5. 每天睡前或切换任务前至少做一次本地 checkpoint commit

---

## 十五、关键金句

> "心跳先于智能。节律先于主控。输出先于复杂判断。"

> "如果 Jarvis 只是收 Paperclip 的任务，它没价值；如果 Jarvis 管你的注意力，它就不可替代。"

> "先让 Paperclip 成为可靠的工人账房和派工系统，而不是让它成为你的第二个大脑。"

> "别让一个死人来修理死人。" — 关于 recovery 不应继续派给同一个故障 agent

> "技能不是越多越好，而是要有少量高价值技能自动挂到合适角色上。"

> "技能的核心目标就是把你的高质量提示词沉淀成可复用执行协议，让你从反复纠偏里解放出来。"

> "主脑负责把混乱输入变成可执行任务，把任务交给合适执行者，把执行结果收成可靠状态，并把踩坑变成下一轮的默认能力。"

> "不要现在改 Paperclip 运行机制。不要要求每次执行都回写项目文档。不要让 agent 多轮重读项目执行计划。"
