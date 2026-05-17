# 039 · ROU60 / ROU72 / 乱码扫描 — API 取证 JSON 归档

本地一次性从控制面导出或脚本写出的**只读证据**；便于与 `探查/`、`验尸报告/` 交叉对照。

**不包含**可执行脚本：根目录曾有的 `patch-issue.cjs`、`post-comment.cjs`、`scan-garbled-comments.cjs` 已删除（内嵌固定 `issueId` / `companyId`，易误跑）。

**文件名**保持英文 slug，便于 jq/对比；内容可能含当时租户 UUID，勿当通用样例对外散发。
