# 提示词与上下文

**定位：** 无头跑时 **哪一层在占 token**、**改哪里最有效**、**怎么验变瘦**——给改 prompt / 技能 / 配置的人看，不是 adapter 源码导读。

---

## 1. 先建立尺子

| 你看到的 | 实际量的是什么 | 常见误会 |
| --- | --- | --- |
| 运行清单 `promptChars` | 回形针 **拼进 stdin** 的字 | ≠ 模型总 context |
| `usageJson.input_tokens` | 厂商 CLI **会话累计** | ≠ 本轮日志字数 |
| 导出 run 日志 | CLI **stdout 流** | 长 tool 结果常不全显示 |
| 厂商 system / 工具表 | CLI 内置 | **多数不进** 运行清单 |

**一句话：** 运行清单主要看 **回形针注入**；账单看 **厂商+多轮历史**。

---

## 2. 五层叠在一起（无头常态）

| 层 | 从哪来 | 运行清单能看到吗 |
| --- | --- | --- |
| A 厂商底稿 | CodeBuddy/Qwen 内置 | 片段 |
| B 用户/软件配置 | `~/.codebuddy`、`models.json` | 部分 |
| C 仓库/技能 | `AGENTS.md`、`.codebuddy`、`SKILL.md` | 常只见「读了某路径」 |
| D 回形针 stdin | wake、task_context、heartbeat_template… | **主量这层** |
| E 续跑历史 | `--resume` 上轮对话 | **几乎不进** 本轮指标 |

**改 prompt 优先动 D**；减 C 与 D 的 **重复规程**；B 用项目/用户 settings；A/E 很难「关掉」，靠 **切 session** 减负。

---

## 3. 三套「技能/上下文」别混谈

| 管道 | 谁管 | 编排杠杆 |
| --- | --- | --- |
| **回形针技能管线** | desiredSkills、@技能、公司技能表 | 收敛本跑选中集、去重 |
| **CLI 自带 skills** | 工具 global home | **独立 home / 干净 worktree** |
| **仓库说明** | AGENTS、rules | **单一真源**，别在公司技能再抄一遍 |

三套技能/上下文分工：本文 §3；全文见 [参考/技能上下文三层](参考/技能上下文三层%20skill-context-layers.md)。

---

## 4. 怎么改（务实顺序）

1. **对账分表** — 运行清单看 D；`usageJson` 看 A+E；别用一个数骂三层。  
2. **减 Paperclip 重复** — wake 与 heartbeat 模板别复述同一规程；评论唤起用 **minimize** 档（045 落地）。  
3. **会话切分** — 长任务定期 **新 session**，比指望日志显示全量 context 有效。  
4. **改 settings 分层** — 项目 `.codebuddy/settings.json` 压无头噪音；密钥勿进仓库（见适配器文档）。  
5. **Windows** — UTF-8、别 shell 内联中文 JSON（乱码见最佳实践 021）。

---

## 5. 改完怎么验

| 步骤 | 看什么 |
| --- | --- |
| 1 | 运行清单 **输入编排** 各块字数是否下降 |
| 2 | 同一事务 **run succeeded** 且行为未退化 |
| 3 | `usageJson` 多 turn 是否仍暴涨（若涨，查 E 层续跑） |
| 4 | 与 [结单与回写](结单与回写%20completion-and-writeback.md) 一起做 P0 闭环 |

详解全文：[无头提示词叠层详解](参考/无头提示词叠层详解%20prompt-layering-detail.md) · 单 run 深挖：最佳实践 018 · CLI 计量：015

---

## 6. 产品债（可选，改代码时）

CodeBuddy 续跑时 **heartbeat_template 仍全文** → 可与 cursor-local 对齐：有 wake 增量则省略模板（减 D 层重复，不动仓库 rules）。

---

*2026-05-20 · 源：022 + 编排/02*
