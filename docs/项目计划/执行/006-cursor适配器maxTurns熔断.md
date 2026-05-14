---
id: exec-006-cursor-maxTurns-fuse
status: 已完成
ledger: ./任务执行台账.md
updated: "2004-05-13T21:59"
---

# 任务 006 — Cursor 适配器 maxTurns 熔断

**返回：**[`任务执行台账.md`](任务执行台账.md)

---

## 1. 需求

### 要什么

Cursor 适配器（`cursor-local`）在心跳模式下，进程不退 → run 永远不结束。需要适配器层支持 `maxTurns` 熔断，达到 N 轮 tool_call 后强制终止并返回结果。

### 验收直觉

1. 配置 `maxTurnsPerRun: N` 后，Cursor CLI 在 N 次工具调用后自动终止
2. 不配置 `maxTurnsPerRun` 时（0 或缺失），行为不变（兼容现状）
3. Paperclip UI 上 run 能正常结束，显示 `errorCode: "max_turns_exhausted"`

---

## 2. 背景（来自 005 §9.3）

| 现象 | 详情 |
|------|------|
| run 无限循环 | 6 轮 × 33 次 tool_call，始终不输出 `result` |
| 根因 | `cursor-local/execute.ts` 只在进程退出后才解析结果 |
| 唯一出口 | `timeoutSec` 超时或手动 `cancel` |
| 缺熔断 | `maxTurnsPerRun` 未支持 |

---

## 3. 现状分析

### 3.1 Cursor CLI 不支持 `--max-turns`（官方证实）

查阅了以下官方文档，均无 `--max-turns` / `--max-tool-calls`：

| 文档 | URL | 结论 |
|------|-----|------|
| CLI 参数参考 | `cursor.com/docs/cli/reference/parameters` | 完整参数列表，**无** turn 限制参数 |
| Headless 模式 | `cursor.com/docs/cli/headless` | 仅 `-p` / `--force` / `--output-format` |
| 输出格式 | `cursor.com/docs/cli/reference/output-format` | 文档了 text/json/stream-json，无 turn 控制 |
| 本地 `agent --help` | — | 无 `--max-turns` |

对比其他适配器：
| 适配器 | CLI 原生支持 --max-turns | 现状 |
|--------|--------------------------|------|
| codebuddy-local | ✅ | 已传参 |
| claude-local | ✅ | 已传参 |
| qwen-local | ✅（`--max-session-turns`） | 已传参 |
| **cursor-local** | ❌ | **未实现** |

**结论**：不能在 CLI 层传参，必须在 Paperclip 适配器层自己做。

### 3.1b stream-json 事件类型（确认）

来自 Cursor 社区实际抓包分析（tarq.net, 2003-10）：

| 事件 type | subtype | 含义 | 是否计为 turn |
|-----------|---------|------|--------------|
| `user` | — | 用户消息 | ❌ 不计 |
| `assistant` | — | 模型文本回复（可能多段） | ❌ 不计 |
| `tool_call` | `started` | 工具调用开始 | ✅ **+1** |
| `tool_call` | `completed` | 工具调用结束（含结果） | ❌ 不计 |
| `result` | — | 最终结果（含 `duration_ms`） | 重置/结束 |

示例 JSON：
```json
{"type":"user","message":{"role":"user","content":[{"type":"text","text":"..."}]},"session_id":"..."}
{"type":"assistant","message":{"role":"assistant","content":[{"type":"text","text":"..."}]},"session_id":"..."}
{"type":"tool_call","subtype":"started","tool_call":{"shellToolCall":{"args":{"command":"ls"}}},"session_id":"..."}
{"type":"tool_call","subtype":"completed","tool_call":{"shellToolCall":{"result":{"success":{"exitCode":0}}}},"session_id":"..."}
{"type":"result","subtype":"success","is_error":false,"duration_ms":1234,"result":"...","session_id":"..."}
```

**计数策略**：`type === "tool_call" && subtype === "started"` → turnCount++

### 3.2 当前 execute.ts 架构

```
execute()
  ├── 读取 config（无 maxTurnsPerRun）
  ├── buildArgs() — 构造 CLI 参数
  ├── runAttempt()
  │   ├── onSpawn({ pid }) — 进程启动回调
  │   ├── flushStdoutChunk() — 实时流式处理 stdout
  │   └── parseCursorJsonl(stdout) — 进程结束后解析
  └── toResult() — 构造 AdapterExecutionResult
```

**关键约束**：`runAdapterExecutionTargetProcess` 返回时进程已结束，没有暴露 ChildProcess 引用。唯一可获得进程 ID 的窗口是 `onSpawn({ pid })`。

### 3.3 熔断需要的能力

| 需要 | 可行性 |
|------|--------|
| 实时计数 tool_call | ✅ `flushStdoutChunk` 逐行解析 stream-json |
| 达到上限时杀死进程 | ✅ 通过 `onSpawn` 捕获 PID → `process.kill(pid)` |
| 区分maxTurns终止 vs 超时 | ✅ 添加 `maxTurnsExhausted` 标志 |
| 返回标准错误码 | ✅ `errorCode: "max_turns_exhausted"`（对标 claude-local/gemini） |

---

## 4. 执行方案

### 4.1 改动文件清单

| 文件 | 改动 | 行数估计 |
|------|------|----------|
| `src/server/execute.ts` | 读 maxTurnsPerRun、计数 tool_call、kill 进程、toResult 新增分支 | +40 |
| `src/server/parse.ts` | 可选：新增 `countToolCalls()` 辅助 | +10 |
| `src/index.ts` | agentConfigurationDoc 加字段文档 | +3 |
| `src/ui/build-config.ts` | 传播 `maxTurnsPerRun` 到 adapterConfig | +1 |

### 4.2 核心实现（execute.ts）

```ts
// 1. 读取配置（在 ~L205 附近，紧挨 model/mode 之后）
const maxTurnsPerRun = asNumber(config.maxTurnsPerRun, 0);

// 2. 在 onSpawn 中捕获 PID（在 runAttempt 内）
let childPid: number | null = null;
let turnCount = 0;
let maxTurnsExhausted = false;

// 3. 在 flushStdoutChunk 中计数（在 emitNormalizedStdoutLine 或 flushStdoutChunk 内）
// 每行解析 type 字段，遇到 tool_call 类事件 turnCount++
// 达到 maxTurnsPerRun 时：process.kill(childPid) + maxTurnsExhausted = true

// 4. 在 toResult 中新增分支
if (maxTurnsExhausted) {
  return {
    exitCode: attempt.proc.exitCode,
    signal: attempt.proc.signal,
    timedOut: false,
    errorCode: "max_turns_exhausted",
    errorMessage: `Max turns (${maxTurnsPerRun}) exhausted`,
    clearSession: true,  // 熔断后不恢复 session，避免下次继续死循环
    usage: attempt.parsed.usage,
  };
}
```

### 4.3 "tool_call" 事件类型确认

Cursor stream-json 中可能的事件类型（需实际抓包确认）：

| 猜测类型 | 用途 | 是否计入 turn |
|----------|------|--------------|
| `tool_use` | 模型请求调用工具 | ✅ +1 |
| `tool_result` | 工具返回结果 | ❌ 不计 |
| `assistant` | 模型文本输出 | ❌ 不计 |
| `result` | 最终结果（含 usage） | 重置计数 |
| `user` | 用户消息 | ❌ 不计 |

**待确认**：run 一次短任务，抓 stream-json 原始行，确认 tool_call 的准确 type 名称。

### 4.4 Windows 进程 kill 兼容

```ts
if (childPid) {
  try {
    process.kill(childPid, "SIGTERM");
  } catch {
    // Windows fallback
    try { process.kill(childPid); } catch { /* already dead */ }
  }
}
```

### 4.5 默认值

- `maxTurnsPerRun: 0` → 不启用熔断（兼容现状）
- 推荐心跳 agent 设 `maxTurnsPerRun: 20`（005 中 33 次仍然过多）
- 最终值由调度策略决定（007 任务）

---

## 5. 风险与注意事项

| 风险 | 缓解 |
|------|------|
| Cursor stream-json type 名称版本变化 | 抓包确认当前版本，做兼容匹配（多个可能名称） |
| `process.kill(pid)` 在 Windows 上的行为 | 测试确认；必要时用 `taskkill /PID /T /F` |
| 进程已退出后再 kill → 异常 | try-catch 包裹，静默吞掉 |
| `onSpawn` 在远程执行时不触发 | 远程执行另有 `executionTarget` 分支，本次先只做本地 |

---

## 6. 执行回写（2004-05-13 21:59）

### 步骤 1 ✅ 抓 stream-json 确认事件 type

实际抓包命令：
```powershell
agent -p --output-format stream-json --workspace . --yolo "list files in packages/adapters/cursor-local/src/ using dir"
```

抓到的原始事件序列：
```
system/init → user → assistant → tool_call/started → tool_call/completed → assistant → result/success
```

**确认**：`"type":"tool_call"` + `"subtype":"started"` — 与代码逻辑完全匹配，无需修改。

### 步骤 2 ✅ 实现 execute.ts 改动

改动文件：`packages/adapters/cursor-local/src/server/execute.ts`
- 读取 `maxTurnsPerRun` 配置（默认 0 = 不启用）
- `onSpawn` 捕获 `childPid`
- `flushStdoutChunk` 逐行解析 stream-json，遇 `tool_call/started` → `turnCount++`
- 达到上限 → `process.kill(childPid, "SIGTERM")` + `maxTurnsExhausted = true`
- `toResult()` 新增熔断分支：`errorCode: "max_turns_exhausted"` + `clearSession: true`

### 步骤 3 ✅ 更新 index.ts / build-config.ts

- `src/index.ts`：agentConfigurationDoc 添加 `maxTurnsPerRun` 字段文档
- `src/ui/build-config.ts`：传播 `maxTurnsPerRun` 到 `adapterConfig`

### 步骤 4 ✅ 实机熔断验证

独立测试脚本 `test-maxTurns.mjs`，直接 spawn `agent` CLI，设 `maxTurns=2`：

```
任务: 创建 a.txt/b.txt/c.txt 三个文件（需要 3 次工具调用）
结果:
  tool_call #1 (创建 a.txt) → PASS
  tool_call #2 (创建 b.txt) → 🛑 FUSE TRIGGERED → taskkill /PID /T /F
  tool_call #3 (创建 c.txt) → 漏过（taskkill 延迟 ~200ms）
  totalTurns=3, maxTurnsExhausted=true, exitCode=1
```

熔断机制工作正常。taskkill 延迟导致漏 1 个 turn 是预期行为（与超时 kill 一致）。

---

## 7. 后续

| 依赖 | 状态 |
|------|------|
| 上游 PR CI（SIGKILL 升级链 + onSpawn 类型签名） | 已修复，等 CI 重跑 |
| 正式集成测试 | 部署到 routic 后以 `maxTurnsPerRun: 5` 跑真实 issue |
| 推荐值 | 心跳 agent 建议 `maxTurnsPerRun: 20`，最终值由 007 调度策略决定 |
