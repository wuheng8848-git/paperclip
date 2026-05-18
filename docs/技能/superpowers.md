---
title: Superpowers 技能包说明（使用顺序）
summary: 本机 ~/.cursor/skills 中 superpowers-zh 二十项技能，按典型工作流顺序说明；每项目录内仍有 SKILL.md 为真源。
---

以下为 **`superpowers-zh` 展开后的二十个技能目录**的阅读/调用顺序建议：从「先搞懂体系」到「收尾与本土习惯」，中间穿插调试与审查。实际干活不必每场都走满；**目录下的 `SKILL.md` 仍是细规则真源**，本文只做顺序与一句话用途，方便中文读者扫一遍。

---

### 1. `using-superpowers`

先读它：说明整套 superpowers 技能如何被调度、优先级和长什么样。适合作为入口，避免后面十几条名字看着晕。

### 2. `brainstorming`

在写第一行业务代码之前用：把需求、约束、方案掰开问清楚，产出能签字的设计片段。对应「先想清楚再动手」。

### 3. `using-git-worktrees`

设计认可后、开大改之前用：用 worktree 把特性隔在独立工作区/分支里，减少和主线互相弄脏。常和后面的计划、执行成一条龙。

### 4. `writing-plans`

在方案已定之后用：把设计落成可执行的实施计划（步骤足够小到能跟住）。是「执行计划 / 子代理开发」的上游。

### 5. `dispatching-parallel-agents`

当已有一批**彼此独立、无先后依赖**的任务时用：把活分给多个代理并行推进，而不是堆在一条串行链上。

### 6. `executing-plans`

手里已有书面计划、要在一次或多次会话里按计划推进时用：强调检查点、批式推进，适合人在关键点拍板。

### 7. `subagent-driven-development`

也是「按计划干活」的一条路线，偏**子代理接力、两段审查**的快迭代。与 `executing-plans` 二选一或混用，视团队习惯。

### 8. `test-driven-development`

在写实现细节时用：红—绿—重构，先测后码，避免「看起来写完其实没约束」。应贯穿实现阶段而不是最后补测。

### 9. `systematic-debugging`

一出问题就用：按阶段缩小范围、验证假设，再改代码。适合插在任何卡住的时刻，不限于编排在计划里第几步。

### 10. `verification-before-completion`

在敢说「做完了」之前用：用证据（测试、复现步骤、日志）确认现象消失，而不是凭感觉关门。

### 11. `requesting-code-review`

大块改动告一段落时用：主动拉起审查视角，对照计划和规范找差距。通常在任务之间或里程碑处。

### 12. `receiving-code-review`

当别人给你 review 意见时用：教我们怎么消化反馈——该较真的较真，该查证查证，而不是盲目「全改」或敷衍附和。

### 13. `chinese-code-review`

在国内团队语境下做 code review 时用（常需**显式**按文档调用）：语气、颗粒度、和面子的平衡，配合上条「接评论」一起看。

### 14. `finishing-a-development-branch`

功能与测试都站住之后用：收尾决策——合并、开 PR、保留或丢弃分支、清理 worktree 等，把尾巴收干净。

### 15. `chinese-git-workflow`

日常协作落在 Gitee、Coding、极狐等国内托管/Git 习惯时用：分支、权限、_MR/MR_习惯与平台差异，和收尾分支衔接。

### 16. `chinese-commit-conventions`

写提交说明前扫一眼：中文团队常见的 commit 约定、和工具链（含中英混排）对齐，减少历史记录将来没法读。

### 17. `chinese-documentation`

要写对外的中文技术文档、README、变更说明时用：排版、中英混排、术语一致性，减少「机翻味」。

### 18. `mcp-builder`

要给 AI 加「可调的外部工具」、做 MCP 服务时用：从技能侧约束怎么落一个能进生产节奏的 MCP，而不是玩具脚本。

### 19. `workflow-runner`

有多角色、多步骤的 YAML 工作流要在工具链里跑通时用：把「谁先做、谁后做」落成可执行编排（与单纯写计划不同，更偏执行器）。

### 20. `writing-skills`

你要**新增或改版技能包**时用：按社区约定写 `SKILL.md`、自省与测试方法，避免再堆一段没人加载的废话。

---

## 附：目录名速查（与上文顺序无关，仅便检索）

| 文件夹名 | 一句话 |
|---|---|
| `using-superpowers` | 元技能：怎么用语境里的 superpowers |
| `brainstorming` | 动手前先对齐需求和设计 |
| `using-git-worktrees` | 用 worktree 隔离特性开发 |
| `writing-plans` | 把设计落成可执行计划 |
| `dispatching-parallel-agents` | 多线并行分派 |
| `executing-plans` | 按计划推进，设检查点 |
| `subagent-driven-development` | 子代理 + 两轮审查式推进 |
| `test-driven-development` | TDD |
| `systematic-debugging` | 分阶段调试 |
| `verification-before-completion` | 声称完成前先验证 |
| `requesting-code-review` | 发起/组织代码审查 |
| `receiving-code-review` | 接住别人的 review |
| `chinese-code-review` | 国内语境下的 review 习惯 |
| `finishing-a-development-branch` | 分支收尾与合并选项 |
| `chinese-git-workflow` | 国内 Git 平台工作流 |
| `chinese-commit-conventions` | 国内提交信息习惯 |
| `chinese-documentation` | 中文文档与排版 |
| `mcp-builder` | 搭 MCP |
| `workflow-runner` | 跑多角色 YAML 工作流 |
| `writing-skills` | 写新 skill 的规范 |
