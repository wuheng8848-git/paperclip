---
status: 已完成
---

# 实践：乱码根因与修订方案（权威真值）

**定位：** 评论、事务标题/描述、interaction 等出现中文乱码时的**唯一权威文档**。涵盖根因判定、排障步骤、代码修订方案、agent 安全写入规则、历史数据处理与验收标准。后续 agent 与人类只维护本文，不再分散维护探查/执行专文。

**最后合订：** 2026-05-19（ROU-66～69 + 探查 014～017 + 工具优化《AI 编程工具乱码》《API 请求乱码》+ `skills/paperclip`）

---

## 1. 核心结论（先读）

### 1.1 通用原则（所有 AI 编程工具共用）

> **中文乱码通常不是模型「不会中文」，而是编码链路不一致。**

典型冲突（Windows 11 本地开发最常见）：

```
AI / Node / 现代 CLI（默认 UTF-8）
        ↓
Windows 终端（历史代码页 GBK/936，或 PowerShell 5 重定向 UTF-16）
        ↓
经 shell 写文件 / 写 HTTP body / 被父进程读 stdout
        ↓
下游按 UTF-8 读（IDE、Paperclip API、数据库）
        ↓
乱码（æˆ‘çˆ±ä¸­æ–‡ / ??? / U+FFFD）
```

**企业级止血原则：** 在 agent 实际工作的链路上 **统一 UTF-8（无 BOM）**——终端、重定向写文件、HTTP 客户端、IDE、仓库 `.editorconfig` 一致；不要假设「IDE 已是 UTF-8」就够用，**经终端写入的字节编码**才决定落盘/落库内容。

### 1.2 Paperclip 控制面（本仓库实例）

| 维度 | 结论 |
| --- | --- |
| **损坏发生位置** | **写入数据库之前** 文本已损坏；PostgreSQL、API 读取、前端 Markdown 渲染链路在 UTF-8 下**安全** |
| **根因条数** | **三条常见路径**（可叠加）：**A** 服务端读子进程 stdout 时 GBK 当 UTF-8；**B** agent 在 Windows shell 用 `curl -d` 内联中文 JSON 写 API；**C** agent 经终端命令写仓库文件（重定向/Out-File 默认非 UTF-8） |
| **不是根因** | UI i18n、数据库 collation、评论组件截断、「agent 模型不会中文」 |
| **历史数据** | 路径 A/B 写入 DB 的乱码均**不可逆**；仅可标记、人工重写或删除 |
| **止血顺序** | 开发机 **C + 终端 UTF-8**（立刻）→ **B**（安全 API 写入）→ **A**（服务端 `decodeChunk` 发版）→ 历史脏数据人工处理 |

---

## 2. 现象与分型

### 2.1 用户可见形态

| 形态 | 典型字符 | 对应路径 | 示例语义 |
| --- | --- | --- | --- |
| **替换符型** | ``（U+FFFD）、Hex `ef bf bd` | **路径 A** | 大段中文变菱形/空白；agent 名、heartbeat 摘要损坏 |
| **问号型** | 连续 `???`、ASCII `0x3F` | **路径 B** | 可猜原文为「更新了 API prompt」类短句，字母数字间夹问号 |
| **轻度** | 1～2 个 ``，多在 emoji/符号位 | 多为 **A** 边缘 | 正文可读，个别符号坏 |

### 2.2 谁正常、谁异常（对照表）

| 数据来源 | 编码路径 | 典型结果 |
| --- | --- | --- |
| 人类在 UI 发帖 | HTTP JSON body，UTF-8 | ✅ 正常 |
| 服务端代码生成标签/系统句 | 内存 UTF-8 字符串 | ✅ 正常 |
| Qwen `stream-json` → `resultJson` | CLI 输出 UTF-8 JSON，`JSON.parse` | ✅ 正常（ROU-58 已证实） |
| heartbeat 从 stdout 拼 summary → 自动评论 | `decodeChunk` / `String(chunk)` | ❌ 路径 **A** |
| agent 运行中 `curl -d '{"body":"中文"}'` | Windows CP936 管道 → API | ❌ 路径 **B** |
| 事务标题/描述含 agent 显示名 | 创建/更新时文本已坏 | ❌ 多为 **A** |
| agent `echo`/`>`/`Out-File` 改仓库源码 | 终端编码 ≠ UTF-8 | ❌ 路径 **C**（编译失败、diff 乱码，不一定进评论） |

**排障第一问：** 同一条 issue 上，用户评论是否正常、agent 评论是否乱码？若「是」，优先查 **B** 与 **A**，不要查数据库字符集。若乱码在**源码文件**而非评论，优先查 **C** 与终端配置。

---

## 3. 路径 A：stdout/stderr 被误解码（U+FFFD）

### 3.1 机理

```
Agent 子进程（Windows，控制台代码页常为 CP936/GBK）
  → stdout 字节流为 GBK
  → Paperclip spawn 监听 "data"，用 chunk.toString("utf8") 或 String(chunk)
  → 无法识别的字节 → U+FFFD（UTF-8 为 ef bf bd）
  → 进入 resultJson / 日志 / buildHeartbeatRunIssueComment
  → issuesSvc.addComment / 写 title、description
  → DB 存的是已损坏的 Unicode 字符串
```

**环境背景：** 作者在 Linux/macOS 上开发时系统默认 UTF-8，子进程 stdout 天然 UTF-8；Windows 本地 agent（Qwen、CodeBuddy）常继承 **GBK**，服务端未做平台编码适配。

**为何 Qwen 的 resultJson 有时仍正常：** `-o stream-json` 行是 UTF-8 JSON，与控制台转码无关；**非 JSON 的 stdout 文本**、以及经错误解码后再进入评论拼接的字段仍会坏。

### 3.2 代码注入点（须统一修复）

| 优先级 | 文件 | 约行 | 现状 |
| --- | --- | --- | --- |
| **P0** | `packages/adapter-utils/src/server-utils.ts` | 2214–2227 `decodeChunk` | `chunk.toString("utf8")`，注释知 CP936 未实现回退 |
| **P0** | `server/src/services/workspace-runtime.ts` | 494、497 | `String(chunk)` 拼 stdout/stderr |
| **P0** | `server/src/services/workspace-runtime.ts` | 2098、2103 | `String(chunk)` 服务进程日志 |
| **P1** | `packages/adapter-utils/src/ssh.ts` | 243 | `String(chunk)` |
| **P2** | `packages/plugins/sandbox-providers/exe-dev/src/plugin.ts` | 533、536 | 沙箱 stdout（多 Linux，可后做） |
| **P2** | `packages/plugins/paperclip-plugin-fake-sandbox/src/plugin.ts` | 124、127 | 测试用 |

**主注入点：** `decodeChunk`（所有适配器 `runChildProcess` 共用）。

### 3.3 修订方案 A（服务端）

**依赖：** `iconv-lite`（加入 `packages/adapter-utils`）。

**策略：**

1. 仅 `process.platform === 'win32'` 启用 GBK 回退。
2. 先 `chunk.toString("utf8")`；若**不含** U+FFFD，直接返回（避免误伤真 UTF-8）。
3. 若含 U+FFFD，用 `iconv.decode(chunk, 'gbk')` 回退。
4. 在 `runChildProcess` 的 `spawn` 前，尽量注入 `CHCP` 环境变量（`chcp` 输出解析一次并缓存），供 `needsGbkFallback()` 判断代码页 936 / 54936。

**`decodeChunk` 参考实现：**

```typescript
import iconv from "iconv-lite";

function needsGbkFallback(): boolean {
  if (process.platform !== "win32") return false;
  const cp = process.env.CHCP ?? "";
  return cp === "936" || cp === "54936";
}

const _useGbk = needsGbkFallback();

export function decodeChunk(chunk: unknown): string {
  if (typeof chunk === "string") return chunk;
  if (Buffer.isBuffer(chunk)) {
    if (_useGbk) {
      const utf8 = chunk.toString("utf8");
      if (!utf8.includes("\uFFFD")) return utf8;
      return iconv.decode(chunk, "gbk");
    }
    return chunk.toString("utf8");
  }
  return String(chunk);
}
```

**workspace-runtime：** 所有 `String(chunk)` 改为调用上述 `decodeChunk`（或同包导出），避免逻辑分叉。

**风险：** 纯 UTF-8 内容若本身含 U+FFFD 可能误触发 GBK 回退——仅 Windows + 高乱码率场景可接受；发版前用 T1–T3 单测覆盖。

### 3.4 Windows 开发机：终端与写文件（路径 C，与 A 同源）

**机理：** Codex / Qwen / CodeBuddy 等工具往往 **不直接调编辑器 API**，而是 **生成 shell 命令 → 终端执行 → 写文件**。终端编码错，文件即坏；与路径 A「父进程读子进程 stdout」同属 **Windows 终端 GBK/UTF-16 vs 工具 UTF-8** 冲突。

| 写法 | 常见实际编码 | 结果 |
| --- | --- | --- |
| `echo 中文 > file.txt` | 随控制台代码页 / UTF-16 | ❌ |
| `Out-File` / `>`（PowerShell 5） | 默认 **UTF-16 LE** | ❌ IDE 按 UTF-8 打开即乱码 |
| `Set-Content` 未指定 `-Encoding` | 不稳定 | ❌ |
| Git Bash / cmd 重定向 | 常 CP936 | ❌ |
| 编辑器/Node `fs.writeFile(..., 'utf8')` | UTF-8 | ✅ |
| `Set-Content -Encoding utf8`（PS 7+） | UTF-8 | ✅ |

**推荐配置（开发机一次性，优先级从高到低）：**

| 优先级 | 动作 | 说明 |
| --- | --- | --- |
| **必须** | 安装并用 **PowerShell 7**（`pwsh`） | `winget install --id Microsoft.Powershell`；`$PSVersionTable.PSEdition` 应为 `Core` |
| **必须** | Windows Terminal 默认配置文件 = **pwsh** | 勿默认 `powershell.exe`（5.x）或 `cmd.exe` |
| **必须** | `$PROFILE` 强制 UTF-8 | 见下方片段 |
| **推荐** | IDE：`files.encoding` = `utf8`，必要时 `autoGuessEncoding: false` | VS Code / IDEA Global·Project UTF-8 |
| **推荐** | 仓库 `.editorconfig`：`charset = utf-8` | 与 `.gitattributes` 中 `working-tree-encoding=UTF-8` 对齐 |
| **推荐** | agent prompt 约束 | 禁止 UTF-16/GBK；禁止 `\uXXXX` 代替中文；写文件必须 UTF-8 |
| **进阶** | WSL 链路：`WSL_UTF8=1` | bash 与 Windows 混用时 |

**PowerShell Profile 参考（写入 `$PROFILE`）：**

```powershell
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$PSDefaultParameterValues['Out-File:Encoding'] = 'utf8'
$PSDefaultParameterValues['Set-Content:Encoding'] = 'utf8'
$PSDefaultParameterValues['Add-Content:Encoding'] = 'utf8'
```

**验证：**

```powershell
[Console]::OutputEncoding   # 应含 UTF-8
Set-Content test-utf8.txt "你好" -Encoding utf8
# 用 IDE 打开 test-utf8.txt 应正常
```

**与 Paperclip 关系：** 路径 C 主要伤 **仓库源码与构建**；路径 A 伤 **heartbeat 捕获的 stdout/评论**；路径 B 伤 **API 写入的评论/interaction**。同一台 Windows 机器上应 **一并**做终端 UTF-8，否则 agent 仍会间歇性乱码。

---

## 4. 路径 B：shell 内联 JSON 写 API（问号）

### 4.1 机理

```
Agent 在 heartbeat 内执行 curl -d '{"comment":"中文"}'
  → Windows cmd/PowerShell/Git Bash 按 CP936 处理命令行参数
  → curl 发出的 HTTP body 字节已错
  → express.json() 按 UTF-8 解码 → 非法字节变 ? (0x3F)
  → 写入 comments.body / interaction payload
```

**与路径 A 的区分：** 路径 B 多为 **`?`**，不是 ``；`body-parser` 对坏字节用 `?` 替换。

**ROU-58 铁证：** 同一 run 的 `resultJson.summary` 中文正常，评论 id `479f333f…`、`0434ebbf…` 已乱码 → 评论来自 agent **主动 curl 写回**，不是 stdout 汇总链 alone。

### 4.2 修订方案 B（agent 与 prompt，无需等发版）

**强制规则（所有 Paperclip agent）：**

- **禁止** `curl -d '{"body":"…中文…"}'`、`curl -d '{"comment":"…"}'` 及任何把中文 JSON 塞进 shell 参数行的写法。
- **允许** API 写中文；坏的是**传参方式**，不是 API。

**安全写法（按优先级）：**

1. Node/tsx 脚本或 Paperclip 专用脚本：`fetch` + `JSON.stringify`，body 从 UTF-8 文件读入。
2. `curl`：**先**写 UTF-8 文件，再 `curl --data-binary @payload.json`，并设 `Content-Type: application/json; charset=utf-8`。
3. PowerShell：`Invoke-RestMethod` + `ConvertTo-Json`（注意 PS 5.1 默认可能非 UTF-8，复杂正文仍优先 UTF-8 文件）。
4. 暂无安全通道：只输出正文草案，**不要**冒险写入。

**示例（Bash，heredoc + 文件）：**

```bash
cat > /tmp/paperclip-comment.json <<'JSON'
{"body": "这里放中文或多行 Markdown。"}
JSON
curl -sS -X POST "$PAPERCLIP_API_URL/api/issues/$ISSUE_ID/comments" \
  -H "Authorization: Bearer $PAPERCLIP_API_KEY" \
  -H "X-Paperclip-Run-Id: $PAPERCLIP_RUN_ID" \
  -H "Content-Type: application/json; charset=utf-8" \
  --data-binary @/tmp/paperclip-comment.json
```

**SKILL / prompt 补强：**

- `skills/paperclip/SKILL.md` 已含「中文与多行正文安全写入」；须审计全文，**删除或改写**仍示范 `curl -d '…中文…'` 的示例。
- 在 `DEFAULT_PAPERCLIP_AGENT_PROMPT_TEMPLATE`（`server-utils.ts`）末尾追加一行：中文写入禁止 shell 内联 JSON，须 UTF-8 文件或 `Invoke-RestMethod`。
- Qwen 适配器 `renderPaperclipApiAccessNote()` 已含 PowerShell 示例；与 SKILL 保持一致，避免 curl 示例更醒目导致 agent 照抄。

**外部工具实践：** Windows 下重复三次以上的 API 取证应用 `scripts/` + `pnpm`（Node `fetch`），禁止教人手写含中文 body 的一行 curl（与排障流水线一致）。

### 4.3 HTTP/API 客户端编码（路径 B 的规范写法）

路径 B 的本质是：**请求体字节在到达 Paperclip 之前已错**。无论 `curl`、Java、`fetch`、PowerShell，须保证 **线上传输的字节是 UTF-8**，且 **不要把中文放在 shell 参数里拼 JSON**。

#### 4.3.1 Paperclip REST（`application/json`）

| 位置 | 要求 |
| --- | --- |
| **Body** | UTF-8 字节序列；`Content-Type: application/json; charset=utf-8` |
| **Node `fetch`** | `JSON.stringify(obj)` + `Content-Type` 头（**不要**手拼含中文的 JSON 字符串进 shell） |
| **curl** | `--data-binary @file`，文件以 UTF-8 保存；**禁止** `-d '{"body":"中文"}'` |
| **PowerShell** | 优先 UTF-8 文件 + `Invoke-RestMethod`；若 `-Body ( @{...} \| ConvertTo-Json )`，须在 **PS 7 + Profile UTF-8** 下，复杂正文仍优先文件 |
| **签名** | 若网关要求「签名用原始值、传输用编码值」，先按网关文档 UTF-8 `urlEncode` 再签名；Paperclip 自带 JWT 无此步骤 |

#### 4.3.2 Query / Path / Header（通用 API 网关经验）

适用于自建脚本调 **外部** API；调 Paperclip 时 query 较少中文，但 agent 手写 URL 时同样适用。

| 位置 | 编码 |
| --- | --- |
| **Query 参数值** | `encodeURIComponent` / `URLEncoder.encode(value, "UTF-8")`；`+`、`&`、中文、emoji 均需编码 |
| **Path 段** | 含中文或特殊字符时先 UTF-8 urlEncode 再拼 path |
| **Header 值** | 标准 HTTP 头多为 ASCII；个别网关要求 header value 做 UTF-8→ISO-8859-1 透传时再按网关文档处理（Paperclip Bearer JSON **通常不需要**） |
| **application/x-www-form-urlencoded** | `UrlEncodedFormEntity(..., "UTF-8")` 且 `charset=UTF-8` |
| **原始 String body** | `new StringEntity(body, "UTF-8")` 或等价 |
| **emoji** | 先 UTF-8 urlEncode 再参与签名/发送，避免网关按错误码页解析 |

**反例（Java 思路，勿在 shell 里等价手搓）：**

```java
// Query 中文
URLEncoder.encode(queryValue, "UTF-8");
// JSON body
new StringEntity(jsonBody, "UTF-8");
// Form
new UrlEncodedFormEntity(pairs, "UTF-8");
```

**Node 对照：**

```javascript
const url = `${base}/api/issues/${id}/comments`;
await fetch(url, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${apiKey}`,
    "Content-Type": "application/json; charset=utf-8",
    "X-Paperclip-Run-Id": runId,
  },
  body: JSON.stringify({ body: "中文评论" }),
});
```

#### 4.3.3 与路径 B 症状的对照

| 现象 | 常见原因 |
| --- | --- |
| 评论 `body` 全是 `?` | shell 内联 JSON / body 非 UTF-8 字节 |
| `æˆ‘çˆ±` 类 mojibake | UTF-8 被当 Latin-1/GBK 读（较少见于 Paperclip JSON，多见于文件） |
| 仅 agent 写入坏、UI 正常 | 客户端编码问题，非 DB/UI |
| gateway 签名校验失败且含 emoji | 未先 UTF-8 urlEncode |

---

## 5. 已排除的根因（勿再浪费轮次）

| 误判 | 为何排除 |
| --- | --- |
| PostgreSQL 非 UTF-8 | 库 `UTF8`；同库其他中文评论正常 |
| 前端 Markdown 渲染 | API `GET …/comments` 的 `body` 字段**已是**乱码 |
| 整条 API 响应编码错 | 同响应内用户评论正常 |
| 仅 UI i18n | 原始 JSON 已坏 |
| agent「输出就是问号」 | 同 run 的 stream-json 中文正常 |
| SQL_ASCII / `safeForLegacyEncoding` | 只影响读取截断，不解释写入前 `?` / `` |
| 评论 body 长度截断 | UTF-16 按字符截断，不会截断多字节中间产生大面积 `?` |

**探索教训：** 先对比「用户评论 vs agent 评论」「resultJson vs comment body」，再读 `decodeChunk`；勿在未验证时反复 grep `addComment`。

---

## 6. 排障与查找方式

### 6.1 快速判定流程

```
1. GET /api/issues/{id}/comments
   → 记下乱码 commentId 与正常 commentId
2. GET /api/heartbeat-runs/{runId}（关联 run）
   → resultJson.summary / result 是否正常？
3. 若 resultJson 正常且评论乱码
   → 路径 B：查 run 日志 / 活动是否含 curl POST/PATCH
4. 若 resultJson 与评论均乱码，或标题/agent 名坏
   → 路径 A：查 stdout 捕获与 decodeChunk
5. 禁止先改 UI、i18n、数据库 collation
```

### 6.2 API 取证命令（只读）

```powershell
# 评论正文（看 body 是否已坏）
curl -sS -H "Authorization: Bearer $env:PAPERCLIP_API_KEY" `
  "$env:PAPERCLIP_API_URL/api/issues/ROU-58/comments"

# 同 run 的 resultJson（对照）
curl -sS -H "Authorization: Bearer $env:PAPERCLIP_API_KEY" `
  "$env:PAPERCLIP_API_URL/api/heartbeat-runs/{runId}"
```

### 6.3 自动扫描（检测规则）

对 `title`、`description`、`comment.body` 做：

| 规则 | 含义 |
| --- | --- |
| U+FFFD 出现次数 > 5 | 路径 A 疑似 |
| 连续 `?` ≥ 3 且非代码块 | 路径 B 疑似 |
| 含 `锟斤拷` 等 | GBK 双重转换经典痕迹 |
| U+FFFD > 50 | **严重**，需人工重写 |
| U+FFFD 1～2 | **轻度**，可忽略或人工修 |

可将扫描逻辑落为 `scripts/mark-garbled-comments.cjs`（只读标记，输出 `garbled-audit-report.json`），**不自动改库**。

### 6.4 历史扫描规模（2026-05-17 实例快照）

| 指标 | 数值 |
| --- | --- |
| 扫描事务 | 50 |
| 扫描评论 | 221 |
| 乱码条目 | 46（评论 38 + 标题 3 + 描述 5） |
| 严重（大段中文全损） | 7 |
| 中度 | 19 |
| 轻度 | 20 |
| 乱码评论占比 | 约 17.2% |

**主样本 issue：** ROU-58（评论 `479f333f-eaf9-4548-bf49-78499aa3594a`、`0434ebbf-d146-483b-be7f-5d9878f4ac2f`）。

**受影响适配器：** `qwen_local`（A+B）、`codebuddy_local`（A 为主）。

---

## 7. 历史数据与修复策略

| 类型 | 处理 |
| --- | --- |
| 严重（7） | 人工重写或删除；**禁止**自动替换 |
| 中度（19） | 人工按上下文修正 |
| 轻度（20） | 可忽略；可选把 U+FFFD 删空（须 `--dry-run` + 董事会确认） |
| 批量清理 | 默认 **标记 + 人工**；`clean-light-garbled` 仅预览，执行前确认 API 是否支持 PATCH 评论 |

**原则：** 乱码不可逆，任何自动写库都是不可逆赌博。

---

## 8. 实施清单与优先级

| # | 项 | 优先级 | 说明 |
| --- | --- | --- | --- |
| C-1 | 开发机 PowerShell 7 + Terminal 默认 pwsh | **立即** | 降路径 C + 减轻 B |
| C-2 | `$PROFILE` UTF-8 与 `Set-Content -Encoding utf8` | **立即** | 见 §3.4 |
| C-3 | `.editorconfig` / IDE UTF-8 | **推荐** | 仓库已有则复核 |
| B-0 | agent 遵守安全写入（SKILL + prompt） | **立即** | 不改服务端即可减少新坏数据 |
| A-1 | `decodeChunk` + iconv-lite | **P0** | 发版到 test-co 验证后再 routic |
| A-2 | workspace-runtime 494/497 | **P0** | 与 A-1 同 PR |
| A-3 | workspace-runtime 2098/2103 | **P0** | 与 A-1 同 PR |
| A-4 | ssh.ts | **P1** | 远程编码另议 |
| A-5 | spawn 注入 CHCP | **P1** | 注意 `chcp` 同步开销，可启动时缓存 |
| B-1 | 审计 SKILL 内 curl 示例 | **P1** | 文档 |
| B-2 | prompt 模板一行提醒 | **P1** | 一行 |
| A-6 | 沙箱插件 String(chunk) | **P2** | 可后做 |

**建议执行顺序：**

1. C-1～C-2（终端 UTF-8，防写文件与 shell 传参）
2. B-0 / B-1 / B-2（防 API 评论乱码）
3. A-1～A-3 发版 → Windows CP936 上手测中文评论
4. 跑标记脚本 → 人工处理历史
5. 补单测 T1–T6（见下）

---

## 9. 测试与验收

| 编号 | 内容 | 类型 |
| --- | --- | --- |
| T1 | GBK Buffer 在 Win 回退解码为「你好」 | 单元 |
| T2 | UTF-8 Buffer 不误触发 GBK | 单元 |
| T3 | GBK+ASCII 混合 | 单元 |
| T4 | POST 中文评论 → GET 一致 | 集成 |
| T5 | emoji 评论端到端 | 集成 |
| T6 | 超长中文评论 | 集成 |

**手动验收：**

1. Windows CP936 控制台起 Paperclip，跑一轮 heartbeat，检查新评论中文与 agent 名。
2. PowerShell `Invoke-RestMethod` 发中文评论。
3. `curl --data-binary @utf8.json` 发中文评论。

**回归关注：** `issue-comment-reopen-routes`、`MarkdownBody`、`multilineTextSchema`、`buildHeartbeatRunIssueComment`。

---

## 10. 人工确认闸门

| 操作 | 须确认 |
| --- | --- |
| A-1～A-4 服务端改动 | 是（review + test-co） |
| 新增 iconv-lite | 是（许可证） |
| 历史数据批量修改 | **必须**（不可逆） |
| 轻度 U+FFFD 批量删除 | **必须** |

---

## 11. Agent 速查（报错时怎么做）

1. **看到乱码评论：** 先查该条是否 agent 写入；对照同 issue 用户评论与 `resultJson`。
2. **正在写中文评论：** 用 UTF-8 文件 + `--data-binary` 或脚本 `fetch`，**Never** `curl -d '…中文…'`。
3. **正在改源码文件：** 禁止 `echo … >`、`Out-File` 无 `-Encoding utf8`；用编辑器 API 或 `Set-Content -Encoding utf8` / Node `fs`。
4. **开发机：** 确认 `pwsh` + Profile UTF-8（§3.4）；不是 AI 模型问题。
5. **怀疑服务端：** 查 `decodeChunk` 与 Windows；不要在 Linux-only 环境否定路径 A。
6. **不要** 先改 UI、i18n、数据库。
7. **本文即准：** 无需再打开已归档的探查/执行专文。

---

## 12. Windows 开发机检查清单（合订工具优化文档）

| 检查项 | 通过标准 |
| --- | --- |
| 默认 Shell | Windows Terminal → **PowerShell 7**（`pwsh`） |
| `[Console]::OutputEncoding` | UTF-8 |
| 写中文测试文件 | `Set-Content t.txt "你好" -Encoding utf8`，IDE 打开正常 |
| VS Code `files.encoding` | `utf8` |
| 仓库 `.editorconfig` | `charset = utf-8` |
| agent 写 API | `fetch` / `--data-binary @utf8.json`，无内联中文 JSON |
| agent 写评论后取证 | `GET …/comments` 的 `body` 与发送前一致 |

**一句话：** Windows 上 AI 工具乱码 = **终端/传参编码** 与 **UTF-8 工具链** 冲突；Paperclip 上再叠加 **服务端 stdout 解码（A）** 与 **不安全 curl（B）**。

---

## 13. 修改记录

| 日期 | 摘要 |
| --- | --- |
| 2026-05-19 | 初版：合订 ROU-66～69、探查 014～017、012 UTF-8 流水线、`skills/paperclip` 安全写入；定为乱码唯一权威文档。 |
| 2026-05-19 | 增补：工具优化《AI 编程工具乱码》（终端 PS7/Profile/写文件路径 C）、《API 请求乱码》（query/body/header UTF-8 规范 §4.3）。 |
