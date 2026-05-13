# paperclip-latest-20260512 Project Brief

## What This Project Is

Paperclip 是"可复制的软件公司"三层架构中的执行平面——贾维斯管策略、赫尔墨斯管路由、Paperclip 管执行。当前工作区是 fork（HenkDz/paperclip，端口 3101+），上游是 paperclipai/paperclip（端口 3100）。目标是让 routic 公司的 agent 通过心跳自动拉任务执行，跑通完整的 issue→run→done 链路。

## Current Stage

- Stage: 探索验证期 — 让 Paperclip 在当前环境中可靠运转
- Main goal: 端到端跑通一次完整任务执行（创建 issue → agent 心跳拉取 → 执行 → 完成）
- Current blocker: 待确认——agent 进程状态、僵尸 run 清理、Hermes 外置化分支稳定性

## Important Links

- Requirements: `requirements.md`
- Tasks: `tasks.md`
- Acceptance: `acceptance.md`

## AI Working Rule

AI agents should read this folder before implementation and keep decisions traceable here.
