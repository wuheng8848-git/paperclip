# 5月17日 Cursor 助手对话 — 整理版

> 摘自同目录 **`5月17日 cursor助手对话记录.md`**，按主题归纳结论、决策与技术要点；细节与口语原文请以原稿为准。

---

## 一、产品与信息架构（侧栏 / 用语）

### 分区建议摘要

| 概念 | 要点 |
| --- | --- |
| 快捷控制区 | 高频跨模块入口（新建事务、搜索、工作台、收件箱）；与插件侧栏槽是否并列需约定 |
| 「工作区」用词 | 易与 Issues/Routines 等「工作」混淆；可区分「事务与例行」vs「项目工作区 / 仓库工作区」 |
| 项目区 | 对应 `SidebarProjects`，清晰 |
| 智能体区 | 对应 `SidebarAgents`，清晰 |
| 团队区 | 组织、技能、成本、活动、设置等打包合理；「成本/活动」偏观测属命名偏好 |
| 设置区 | 实例级（`instance/settings/...`）与公司级（`company/settings`）两套壳；侧栏若以公司设置为主，扩到实例须在导航上有明确归宿 |

### 编排观测项放哪？

- **按「观测归属团队维度」**：心跳任务、编排注入与成本、活动并列放团队区，心智一致。
- **按「干活时随手看」**：放工作区也可，但与 issues/routines 混桶语义略飘。
- 可选：**团队区内再分子区**（如「运行与观测」）拢齐心跳、编排、活动、成本。

---

## 二、权限与角色主轴

- **工作**：面向使用者（收件箱、事务、例行、目标等）；角色偏向成员 / 执行者 / PM。
- **观测**：面向编排者 / 运营（心跳、编排注入、成本、活动、审计排障）；角色偏向 owner / 管理员 / SRE。
- **侧栏形态可变**，权限上仍可按「观测包 vs 工作包」发证。
- **智能体区**：使用者与编排者抢同一入口；缓解靠详情页分层、按能力拆分权限（非整栏一刀切）、指派场景贴在事务详情；中长期可考虑「我的智能体」只读画廊 + 「管理智能体」等。

---

## 三、「编排注入」页：定位与和需求的关系

### 当前页解决什么？

- 绑定 **某次心跳 / 某次运行的 `adapter.invoke`**：看这轮实际拼了啥、`promptSections` 各块多长。
- 本质是 **事后验尸**，不是「某个智能体的静态配置 BOM」。

### 与「抽象智能体接单路径上的构件清单」

- **同方向、不同颗粒度**：事前看清「不接任务也能列默认构件 + 体量」可能要 dry-run assemble、占位符渲染、按块预估 token 等——**另一类产品入口**。
- **不必推倒重来**：现有 `promptSections` + 跑一次看一块是有用拼图；未来可叠加「智能体详情 / 新 Tab」等新视图。
- **产品形态**：从时间轴上是「最近运行 → 点某次」，落后于「接单前先看结构」，两扇门各有用途。

### 卡住的二分法（排障顺序）

1. **提示词拼装**：不该塞的是否塞进、顺序是否叠成山、哪块字数爆炸、中英混排段位；有 `promptSections` 时优先量化各块。
2. **适配器兼容**：CLI 参数、会话恢复、cwd、`stdin`/`--single`/`--append-system-prompt` 等与真实工具是否一致。
3. **两者会互相伪装**：例如看似巨长实为 stdin 未被正确消费并重试灌水——习惯 **先量化块 → 再核对调用形态**。

### 对齐需求时需拍板的点（节选）

展示粒度（空块是否显示）、分块 vs 整块 diff、排序与开发者向 `id`、字符数外加粗略 token、`--append-system-prompt` 等适配器特例、是否与公司配置页共用 id/标题。

---

## 四、文书落点（验尸 / 复盘）

- **验尸协作稿**：不往 `docs/` 对外树乱塞 → 优先 **`docs/项目计划/执行/`** 工单内「验证/证据」小节，或 **`探查/`** 未定责阶段，升格规则见 **`最佳实践/`**。
- **人肉分拆历史 `prompt`**：原文勿手改；附活动 id / run id / 时间 / 适配器 / 智能体名；推断与原文分段注明边界不确定——**推演非硬真值**。

---

## 五、已实现 UI / 适配器改动（本会话记载的）

### 原因说明

- 仅当 **`adapter.invoke` 含 `promptSections`** 时才走服务端分块 UI；大量历史仅有整块 `prompt` → 易只见标题栏「复制全文」。

### 行为摘要

1. **无 `promptSections`**：若按连续 `\n\n` 可拆出 **≥2 段**，用与同套 UI 折叠 + 段落级复制；`promptParagraphFallbackHint` 说明 **不等于真实组件边界**。
2. **仍只有一大段**：整段 `PromptBlock`，复制仍为标题栏一处。
3. **有 `promptSections`**：行为保持；复制按钮更可辨。
4. **适配器调用卡**：条目级复制调整后，收口为 **卡片标题行「复制」** 整块纯文本（含调用说明占位「无」等）；切换运行清「已复制」状态。
5. **运行卡片**：标题行复制 run 快照式纯文本字段；运行快照 / 唤醒载荷 JSON 可复制（格式见原对话）。
6. **`joinPromptSectionsLabeled`**：数组顺序即拼接顺序，空 trim 后丢弃；**跨适配器顺序以各 `execute.ts` 为准**（例：`codebuddy-local` 中 `bootstrap → wake → session_handoff → task_context → heartbeat_template`）。
7. **stdin 之外的肉**：如 CodeBuddy `--system-prompt-file` 走的 instructions **不一定出现在** `prompt` / `promptSections` 观测里。

### 编排注入代码位置（便于延续）

- 页面：`ui/src/pages/OrchestrationInjection.tsx`（解析、分段、分支逻辑）。
- 文案：`ui/src/lib/i18n.ts` → `orchestrationInjectionPage` 等。
- 后续议题：组件抽离复用、`\n\n` 兜底与语义误导、数据源是否只看首条 `adapter.invoke` 等。

---

## 六、上下文工程 vs 提示词工程

- **上下文工程**：本轮载荷/trace——wake、交接、`contextSnapshot`、`paperclipWake`、通道（stdin/system 文件）、控制面拼装、未进 `promptSections` 的部分；编排注入服务于 **可追溯投喂**。
- **提示词工程**：模版话术、中英文比例、措辞——落在模版与 instructions 迭代。
- 回形针把 **显式编排上下文** 摆上台面：**上下文（喂什么、顺序、通道、体积）与提示词（怎么写）都会落到编排者**，非二选一。

### 控制风险（口语归纳）

优先小步diff（只动 ui/、单适配器或模版）；以 `adapter.invoke` 对齐现象；执行平面 **`test-co` 再 routic**；慎动核心签出/心搏/公司边界。

### 产品北星（用户原句整理）

长时间、可控、不断流转的 AI 控制系统：**有状态可追溯、权限与上下文可见、工单签出交接循环**，非单次聊天。

---

## 七、一次具体验尸上下文（存档索引）

- 某次 **`heartbeat_timer`、状态 `cancelled`**；`CEO-CodeBuddy-DP4P`，`codebuddy_local`；实例工作区 UUID、Session 因 ~214 万 tokens 触发 rotation、`ROU-60` 等在审与子单状态、`request_confirmation` 等——**详情以运行 ID / 仓库内验尸 Markdown 为准**。
- **`docs/项目计划/验尸报告/1c326cc4-9dad-4168-b8ae-61a4a02ef28a.md`**：已做文首说明、handoff / Execution contract **英中对照**、运行快照 JSON 下中文提要；导出默认中英对照若在服务端/脚本则需另改。
- Git：若曾为单文件提交执行过 **`git restore --staged .`**，其他未提交改动需自行再 `git add`。

---

## 八、Execution contract 与 Skill；汉化原则

### contract vs skill

- **不同机制**：契约 = 本轮 Paperclip 运行时规则简报（编排语义）；skill = 可复用说明包。**好 skill 能减少重复话术，一般不替代契约**（落点不同、轮转与稳定性、服务端版本一致）。
- **汉化原则**：叙述可用中文；**API 路径、HTTP 动词、JSON 字段名、`kind`/状态枚举须保留英文原文**（反引号或双语对照）；汉化后以 **能否原样进 curl/JSON** 自检。

契约模板改动起点（对话提及）：`packages/adapter-utils/src/server-utils.ts` 内 `DEFAULT_PAPERCLIP_AGENT_PROMPT_TEMPLATE`、`server/src/onboarding-assets/default/AGENTS.md` 等——**实施需单独许可与范围**。

---

## 九、方法论转向：证据上 UI

- **从**：脚本扫库、零散 JSON、仓库验尸 Markdown 做主路径。
- **到**：面板固定入口可读，默认真源与 API 对齐，人机都省力。
- 下一粒度：选定 **阻塞原因 / run 快照 / 乱码风险 / 审批交互** 等优先级做 MVP 展示。

---

## 十、`promptCacheCorrelation` 落地纪要（已实现部分）

### 原则

- 界面展示的 stdin 内容与 **冷启动一整包 vs 续会话省略块** 要对齐；与 **计费侧 prompt cache** 区分——文案写明以用量回执为准。

### 技术摘要

- `adapter-utils`：`PromptCacheCorrelation` + `buildStdinPromptCacheCorrelation` → `AdapterInvocationMeta.promptCacheCorrelation`。
- **已接线适配器**：`claude-local`（含 `promptBundle.bundleKey`）、`codebuddy-local`、`codex-local`（特定路径下 `agent_instructions` 可能省略）、`cursor-local`。
- `OrchestrationInjection` 解析 `payload.promptCacheCorrelation` 单独展示；`i18n` 补文案。
- **用户拍板**：**暂不**把 correlation 铺满其余适配器。
- **顺手修**：`i18n` 重复键 `scheduledRetry`、`thinkingEffortOptions.forAdapter` 窄类型 `push` 问题。
- **未做 / 已知**：UI 全局 typecheck 其他历史错误；run 完结面并排 `cachedInputTokens` 等计费对照。
- **提交**（对话称）：本地 `feat(orchestration): adapter.invoke prompt cache correlation`，hash `4f2d1697`（以仓库实际日志为准）。

---

## 十一、可选用「延续句」

1. correlation 是否铺到 gemini、grok、qwen、cursor-cloud 等仍组 stdin 的适配器。  
2. run 完结视图并排用量字段，对照「真·缓存省钱」。  
3. 智能体详情「不接任务的 BOM + 量级」产品与入口形态。  
4. Execution contract 汉化：**适配器模板 / onboarding / 对齐**哪条先做。  

---

## 十二、术语速览

| 术语 | 简述 |
| --- | --- |
| `promptSections` | 服务端分段 id + body，分段顺序即 stdin 拼装顺序（同一次 invoke 内） |
| `\n\n` 兜底分段 | UI 友好复制用，非装配真值边界 |
| `promptCacheCorrelation` | invoke 侧冷/续、稳定键、本轮 stdin 故意省略的块 id |
| Execution contract | 运行时下发给会话的规则简报，与 skill 文件非同一挂载 |
