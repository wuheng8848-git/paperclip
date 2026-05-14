---
id: exec-005-cursor-shell-composer2
status: 已完成
ledger: ./任务执行台账.md
updated: "2004-05-13T19:16"
---

# 任务 005 — 修复 Cursor 壳子，确认 Composer 2 可用

**返回：**[`任务执行台账.md`](任务执行台账.md)

---

## 1. 结论（一句话）

Cursor CLI 壳子已修复，Composer 2 Fast / Composer 2 均可用；根因（过期 CURSOR_API_KEY）已消除。**账号已从 wuheng8848 切换到 wang.zhi.lan8848**。

---

## 2. 当前状态实测（2004-05-13 18:25 最新）

| 检查项 | 状态 | 证据 |
|--------|------|------|
| `agent` CLI 版本 | ✅ `2026.05.09-0afadcc` | `agent --version` |
| `agent login` 订阅登录 | ✅ **`wang.zhi.lan8848@gmail.com`** | `agent status` |
| `composer-2-fast` | ✅ 可用 | `agent -p ... --model composer-2-fast` → success, 6.6s |
| `composer-2` | ✅ 模型列表首位 | `agent models`，cli-config 默认 |
| `CURSOR_API_KEY` 环境变量 | ✅ **已清除** | User/Machine 系统级均为空 |
| `adapter-plugins.json` | ✅ 无 cursor 外置条目 | 只有 codebuddy_local + qwen_local |
| Paperclip 内置 `cursor` 适配器 | ✅ 启动即注册 | 不需插件 |

### 账号对比

| 字段 | 旧账号 | 新账号 |
|------|--------|--------|
| email | `wuheng8848@gmail.com` | `wang.zhi.lan8848@gmail.com` |
| displayName | W W | 芝兰 王 |
| userId | 342911291 | 349950901 |
| authId | `user_01KKGBHQNSGVMDA5FS29H5HYMY` | `user_01KP5PNCEMGEFD0945AQ41Z2FR` |

---

## 3. cli-config.json 历史快照

路径：`~/.cursor/cli-config.json`

### 3a. 旧账号快照（2004-05-13 18:20）— 已失效

```json
{
  "version": 1,
  "authInfo": {
    "email": "wuheng8848@gmail.com",
    "displayName": "W W",
    "userId": 342911291,
    "authId": "google-oauth2|user_01KKGBHQNSGVMDA5FS29H5HYMY"
  },
  "serverConfigCache": {
    "backendUrl": "https://api2.cursor.sh",
    "authCacheKey": "auth:google-oauth2|user_01KKGBHQNSGVMDA5FS29H5HYMY",
    "agentUrlConfig": {
      "agentUrl": "https://agentn.global.api5.cursor.sh",
      "agentnUrl": "https://agentn.global.api5.cursor.sh"
    },
    "cliSandboxDefaultEnabled": false,
    "serverHttp2Config": 0,
    "updatedAt": 1778613237298
  },
  "selectedModel": {
    "modelId": "composer-2",
    "parameters": [{"id": "fast", "value": "true"}]
  },
  "hasChangedDefaultModel": true,
  "maxMode": false,
  "modelParameters": {
    "composer-2": [{"id": "fast", "value": "true"}],
    "gpt-5.1-codex-mini": [{"id": "reasoning", "value": "medium"}]
  },
  "permissions": {
    "allow": ["Shell(ls)", "Shell(pnpm)", "Shell(npm)", "Shell(node)", "Shell(npx)",
              "Shell(corepack)", "Shell(git)", "Shell(powershell)", "Shell(pwsh)",
              "Shell(cmd)", "Read(**)", "Write(**)"],
    "deny": ["Shell(rm)"]
  },
  "approvalMode": "allowlist",
  "sandbox": {"mode": "disabled", "networkAccess": "user_config_with_defaults"},
  "privacyCache": {"ghostMode": false, "privacyMode": 4},
  "attribution": {"attributeCommitsToAgent": true, "attributePRsToAgent": true},
  "editor": {"vimMode": false},
  "notifications": true, "hints": true, "rewind": false
}
```

### 3b. 新账号快照（2004-05-13 18:25）— 当前生效

```json
{
  "version": 1,
  "authInfo": {
    "email": "wang.zhi.lan8848@gmail.com",
    "displayName": "芝兰 王",
    "userId": 349950901,
    "authId": "google-oauth2|user_01KP5PNCEMGEFD0945AQ41Z2FR"
  },
  "serverConfigCache": {
    "backendUrl": "https://api2.cursor.sh",
    "authCacheKey": "auth:google-oauth2|user_01KKGBHQNSGVMDA5FS29H5HYMY",
    "agentUrlConfig": {
      "agentUrl": "https://agentn.global.api5.cursor.sh",
      "agentnUrl": "https://agentn.global.api5.cursor.sh"
    },
    "cliSandboxDefaultEnabled": false,
    "serverHttp2Config": 0,
    "updatedAt": 1778613237298
  },
  "selectedModel": {
    "modelId": "composer-2",
    "parameters": [{"id": "fast", "value": "true"}]
  },
  "hasChangedDefaultModel": true,
  "maxMode": false,
  "modelParameters": {
    "composer-2": [{"id": "fast", "value": "true"}],
    "gpt-5.1-codex-mini": [{"id": "reasoning", "value": "medium"}]
  },
  "permissions": {
    "allow": ["Shell(ls)", "Shell(pnpm)", "Shell(npm)", "Shell(node)", "Shell(npx)",
              "Shell(corepack)", "Shell(git)", "Shell(powershell)", "Shell(pwsh)",
              "Shell(cmd)", "Read(**)", "Write(**)"],
    "deny": ["Shell(rm)"]
  },
  "approvalMode": "allowlist",
  "sandbox": {"mode": "disabled", "networkAccess": "user_config_with_defaults"},
  "privacyCache": {"ghostMode": false, "privacyMode": 4},
  "attribution": {"attributeCommitsToAgent": true, "attributePRsToAgent": true},
  "editor": {"vimMode": false},
  "notifications": true, "hints": true, "rewind": false
}
```

**关键字段**：
- `authInfo.email`: `wang.zhi.lan8848@gmail.com`（Google OAuth2，当前）
- `authInfo.userId`: `349950901`
- `selectedModel`: `composer-2` + `fast: true` → 即 Composer 2 Fast
- `approvalMode`: `allowlist`（白名单审批，非 yolo）
- 后端：`api2.cursor.sh` / Agent: `agentn.global.api5.cursor.sh`
- **新旧账号非 authInfo 外的配置完全一致**（selectedModel / permissions / approvalMode 等未变）

---

## 4. adapter-plugins.json 当前状态

路径：`~/.paperclip/adapter-plugins.json`

```json
[
  {
    "packageName": "C:\\Users\\wuhen\\code\\paperclip-latest-20260512\\packages\\adapters\\codebuddy-local",
    "type": "codebuddy_local",
    "version": "0.1.0",
    "installedAt": "2004-05-12T03:30:45.549Z"
  },
  {
    "packageName": "C:\\Users\\wuhen\\code\\paperclip-latest-20260512\\packages\\adapters\\qwen-local",
    "type": "qwen_local",
    "version": "0.1.0",
    "installedAt": "2004-05-12T03:30:45.549Z"
  }
]
```

✅ 只有 2 个外置适配器，无 cursor 外置条目（cursor 由 Paperclip 内置启动）。

---

## 5. 完整模型清单（2004-05-13 18:20）

来自 `agent models`：

### 订阅池（Auto + Composer）—— 不消耗 API 池

| 模型 ID | 标签 | 备注 |
|---------|------|------|
| `auto` | Auto | 自动路由 |
| `composer-2-fast` | Composer 2 Fast **(default)** | 当前默认 |
| `composer-2` | Composer 2 **(current)** | 当前选中 |

### API 池模型（需 CURSOR_API_KEY 或消耗 API 配额）

<details>
<summary>展开完整 API 模型列表（70+）</summary>

**GPT-5.5 系列（1M 上下文）**：
| 模型 ID | 标签 |
|---------|------|
| `gpt-5.5-none` / `-fast` | GPT-5.5 1M None |
| `gpt-5.5-low` / `-fast` | GPT-5.5 1M Low |
| `gpt-5.5-medium` / `-fast` | GPT-5.5 1M / Fast |
| `gpt-5.5-high` / `-fast` | GPT-5.5 1M High / Fast |
| `gpt-5.5-extra-high` / `-fast` | GPT-5.5 1M Extra High / Fast |

**Claude Opus 4.7 系列（1M 上下文）**：
| 模型 ID | 标签 |
|---------|------|
| `claude-opus-4-7-low` / `-fast` | Opus 4.7 1M Low |
| `claude-opus-4-7-medium` / `-fast` | Opus 4.7 1M Medium |
| `claude-opus-4-7-high` / `-fast` | Opus 4.7 1M High |
| `claude-opus-4-7-xhigh` / `-fast` | Opus 4.7 1M / Fast |
| `claude-opus-4-7-max` / `-fast` | Opus 4.7 1M Max |
| `claude-opus-4-7-thinking-*` | Opus 4.7 Thinking（low→max 各档） |

**Claude Opus 4.6 系列（1M 上下文）**：
| 模型 ID | 标签 |
|---------|------|
| `claude-4.6-opus-high` | Opus 4.6 1M |
| `claude-4.6-opus-max` | Opus 4.6 1M Max |
| `claude-4.6-opus-high-thinking` / `-fast` | Opus 4.6 1M Thinking |
| `claude-4.6-opus-max-thinking` / `-fast` | Opus 4.6 1M Max Thinking |

**Claude Sonnet 4.6**：`claude-4.6-sonnet-medium` / `-thinking`

**GPT-5.4 系列**：`gpt-5.4-low` / `-medium` / `-high` / `-xhigh`（含 fast 变体）

**GPT-5.3 Codex 系列**：`gpt-5.3-codex-{low/standard/high/xhigh}`（含 fast 变体）+ Spark Preview 系列

**GPT-5.2 Codex 系列**：`gpt-5.2-codex-{low/standard/high/xhigh}`（含 fast 变体）

**GPT-5.1 Codex Max 系列**：`gpt-5.1-codex-max-{low/medium/high/xhigh}`（含 fast 变体）

**GPT-5.2**：`gpt-5.2` 单条

**Grok**：`grok-4.3`（Grok 4.3 1M）

</details>

---

## 6. 根因回顾

003 号任务中的 3 连失败：
- `CURSOR_API_KEY` 被 Paperclip 进程继承，值为无效/过期 key
- Cursor CLI 检测到该变量后走 API 计费路线，key 无效 → 直接拒绝
- 2004-05-13 已从 `adapter-plugins.json` 删掉 cursor 外置条目（见 003 文档）
- 现在本机环境已无无效 key，CLI 走 `agent login` 订阅路线 → 正常

**计费判定逻辑**（来自 `cursor-local` 适配器）：
- 有 `CURSOR_API_KEY` 或 `OPENAI_API_KEY` → **API 计费**
- 无上述变量 → **订阅计费**（agent login）

Composer 2 模型走 **Auto + Composer 合并池**（订阅路线），不走 API 池。

---

## 7. Paperclip manifest 中配置 cursor 智能体（模板）

在 `manifest.json` 的 `agents` 数组中添加：

```json
{
  "slug": "cursor-worker",
  "name": "Composer 2 Worker",
  "path": "agents/cursor-worker.md",
  "role": "engineer",
  "title": "Cursor Composer 2 Fast",
  "capabilities": "通过 Cursor CLI 执行代码任务，使用 Composer 2 Fast 模型。消耗 Auto+Composer 池。",
  "reportsToSlug": "ceo",
  "adapterType": "cursor",
  "adapterConfig": {
    "model": "composer-2-fast",
    "cwd": "C:\\path\\to\\workspace",
    "timeoutSec": 600,
    "graceSec": 15,
    "env": {}
  },
  "runtimeConfig": {},
  "permissions": {},
  "budgetMonthlyCents": 2000,
  "metadata": {
    "heartbeat_interval_minutes": 10
  }
}
```

**关键字段说明**：

| 字段 | 值 | 原因 |
|------|-----|------|
| `adapterType` | `"cursor"` | 使用内置 cursor 适配器（不是 `cursor_cloud`） |
| `model` | `"composer-2-fast"` | Composer 2 Fast，消耗 Auto+Composer 池 |
| `model` 备选 | `"composer-2"` | Composer 2 标准档，同样 Auto+Composer 池 |
| `model` 备选 | `"auto"` | 自动路由，可能跑到 GPT 走 API 池 |
| `env` | `{}`（空） | **不设 `CURSOR_API_KEY`**，走 subscription 登录 |

**注意**：
- **绝对不能**在 `env` 里设 `CURSOR_API_KEY` —— 会切到 API 计费路线，Composer 2 不可用
- Composer 2 模型只在订阅路线下可用

---

## 8. 账号切换记录

| 时间 | 操作 | 结果 |
|------|------|------|
| 18:20 | 初次检查 | `wuheng8848@gmail.com`（旧） |
| 18:25 | 用户执行 `agent login` 切换 | `wang.zhi.lan8848@gmail.com`（新）✅ |
| 18:25 | 验证新账号 Composer 2 Fast | success, 6.6s, 47 tokens |

切换命令：
```powershell
agent logout
agent login
# 浏览器完成 Google OAuth2 → wang.zhi.lan8848@gmail.com
```

---

## 9. 端到端测试（2004-05-13 18:52）

### 9.1 测试步骤

| 步骤 | 操作 | 结果 |
|------|------|------|
| 1 | `POST /api/companies/.../agents` 创建 cursor 智能体 | ✅ agentId=`dfe107e2` |
| 2 | 适配器注册确认（registry.ts 写死导入） | ✅ 内置 cursor，无外置覆盖 |
| 3 | `POST /api/agents/.../heartbeat/invoke` 触发心跳 | ✅ runId=`59998500` 入队 |
| 4 | 进程启动，`agent -p --model composer-2-fast` | ✅ PID 34980，正常启动 |

### 9.2 通过的检查项

| 检查项 | 证据 |
|--------|------|
| `apiKeySource` | `"login"` — 订阅登录，走 Auto+Composer 池 ✅ |
| `model` | `Composer 2 Fast` — 模型正确 ✅ |
| `cwd` | `C:\Users\wuhen\code\paperclip-latest-20260512` — 正确 ✅ |
| Paperclip skills 注入 | 9 个 skills → `~/.cursor/skills` ✅ |
| stream-json 输出产线 | 109 行 / ~294KB，stdout/stderr 双流正常 ✅ |
| env 无 CURSOR_API_KEY | 账号级已清除，agent 级别 `env: {}` ✅ |

### 9.3 问题：心跳无限循环不退出

**现象**：run 从 18:40 开始到 18:52 被手动取消，模型从未发出结束信号。

**日志统计**：
| 指标 | 数值 |
|------|------|
| `result` 消息 | **0** |
| `thinking` 完成 | 6 轮 |
| `tool_call` 启动 | 33 次 |
| 循环模式 | `think → tool_call × 2~8 → think → tool_call × 2~8 → …`（6 轮） |

**根因链**：
1. **触发条件**：心跳 prompt 是开放式的「继续在 Paperclip 上工作」，无分配 issue，无具体任务边界
2. **模型行为**：Composer 2 认为「还有事可做」→ 不断读代码、调 API、探索仓库，永远不输出 `result`
3. **适配器缺陷**：`cursor-local` 的 `execute.ts` 只在**进程退出后**才解析结果，进程不退 = 永远不结束
4. **缺少熔断**：适配器不支持 `maxTurnsPerRun`，无法在 N 轮后强制终止
5. **唯一出口**：`timeoutSec=600`（10 分钟）或手动取消（`cancel` API）

**改进项**：
| 优先级 | 改进 | 说明 |
|--------|------|------|
| **P0** | 心跳前必须分配 issue | Paperclip 调度层职责：无任务不让 agent 空跑 |
| **P0** | 适配器加 `maxTurns` 熔断 | `--max-turns N` 传给 CLI，或适配器层按 `tool_call` 次数终止 |
| **P1** | 适配器支持 `result` 超时 | 最后一条 tool_call 后 N 秒无 result → kill |
| P2 | `--yolo` 自动添加 | 文档 10 提到默认补 `--yolo`，本次 allowlist 模式可能有审批阻塞（但日志未体现） |

**教训**：应该在跑心跳前先跑 `test-environment` 自检（文档 10 第 4 节），以及**确保分配了 issue**。空跑心跳没有任务边界，任何开放式 agent 都会陷入探索循环。

---

## 10. 后续

- [x] ~~确认 CLI 账号是否需要切换~~ → 已切到 wang.zhi.lan8848@gmail.com
- [x] ~~在 Paperclip 中新建一个 `adapterType: "cursor"` 的测试智能体~~ → agentId=`dfe107e2`
- [x] ~~跑一次心跳确认端到端~~ → 产线通，但无限循环被取消（见 §9.3）
- [x] ~~迁移到 routic 公司 + 统一命名规范~~ → 8 个 agent 全部就位（见 §11）
- [ ] **适配器加 maxTurns 熔断**（P0，见 §9.3）
- [ ] **心跳调度层：无 issue 不触发**（P0，见 §9.3）
- [ ] 按选型方案决定哪个角色用 Cursor Composer 2
- [ ] 监控新账号 Auto+Composer 池消耗

### 已创建的测试智能体（Local Swarm POC）

| 字段 | 值 |
|------|-----|
| agentId | `dfe107e2-5521-43c8-8d85-c60c7bf0f363` |
| 公司 | Local Swarm POC (`62c3ba97`) |
| role | engineer |
| adapterType | `cursor`（内置） |
| model | `composer-2-fast` |
| env | `{}`（空，不设 CURSOR_API_KEY） |
| timeoutSec | 300 |
| budget | $20/月（订阅池内） |
| 状态 | 已创建，心跳已跑过一次（被手动取消） |

---

## 11. routic 公司正式部署（2004-05-13 19:10）

### 11.1 统一命名规范

```
{职能}-{壳子}-{模型}
```

- **高管**用缩写：CEO、CTO
- **通用开发**用中文职能：开发、前端、研究、测试、归档
- **壳子**：CodeBuddy、Qwen、Cursor
- **模型**：glm5.1、qwen3.6plus、composer2fast、kimi2.6 等

### 11.2 修复历史 agent

| 原名称 | 问题 | 改名后 |
|--------|------|--------|
| `Cursor code` | 名字误导（实际是 qwen adapter） | `开发-Qwen-qwen3.6plus` |

注：原 `Cursor code` 的 adapter 就是 `qwen_local`、model 是 `qwen3.6-plus`，只是名字起错了，无需改配置。

### 11.3 补全公司模板角色

按 [`公司模板-最小可行公司/company.md`](../公司模板-最小可行公司/company.md) 8 角色补全，routic 原有 4 个（CEO、CTO、开发-Qwen、开发-Cursor），新创建 4 个：

| # | 名称 | 壳子 | 模型 | budget/月 | reportsTo |
|---|------|------|------|-----------|-----------|
| 5 | 前端-CodeBuddy-kimi2.6 | codebuddy_local | kimi-k2.6 | $20 | CTO |
| 6 | 研究-Qwen-glm5.0 | qwen_local | glm-5.0 | $15 | CEO |
| 7 | 测试-CodeBuddy-glm5.1 | codebuddy_local | glm-5.1 | $20 | CEO |
| 8 | 归档-CodeBuddy-glm5.1low | codebuddy_local | glm-5.1 (ask) | $10 | CEO |

### 11.4 routic 完整 agent 架构

```
CEO (codebuddy_local, GLM-5.1)
├── CTO-火山GLM5.1 (codebuddy_local, DeepSeek-V4-Pro)
│   ├── 开发-Qwen-qwen3.6plus    (qwen_local, Qwen 3.6 Plus)
│   ├── 开发-Cursor-composer2fast (cursor, Composer 2 Fast)
│   └── 前端-CodeBuddy-kimi2.6    (codebuddy_local, Kimi K2.6)
├── 研究-Qwen-glm5.0              (qwen_local, GLM-5.0)
├── 测试-CodeBuddy-glm5.1         (codebuddy_local, GLM-5.1)
└── 归档-CodeBuddy-glm5.1low      (codebuddy_local, GLM-5.1 ask)
```

### 11.5 routic 公司信息

| 字段 | 值 |
|------|-----|
| companyId | `cc098628-d91e-4e10-b4e4-000a6c822946` |
| name | Routic |
| slug | routic |
| agent 总数 | 8 |
| CTO agentId | `d29997ac-3569-415c-b580-fc05fe4be2ad` |
| CEO agentId | `2543471f-454b-4b3c-98eb-9398130af314` |

### 11.6 与模板的差异

| 模板角色 | 模板壳子 | 模板模型 | routic 实际 | 原因 |
|----------|----------|----------|-------------|------|
| Frontend Engineer | codebuddy_local | Doubao Seed 2.0 | Kimi K2.6 | Kimi 已从月暗直购转到火山池，可用 |
| Researcher | qwen_local | GLM-5.0 | GLM-5.0 | ✅ 一致 |
| QA Reviewer | codebuddy_local | GLM-5.1 | GLM-5.1 | ✅ 一致 |
| Archivist | codebuddy_local | GLM-5.1 (low) | GLM-5.1 ask | ask 模式等同 low |
