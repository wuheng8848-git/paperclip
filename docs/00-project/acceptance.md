# Acceptance Checklist

## Completion Standard

- [x] The requirement is clear.
- [ ] The implementation changed only the intended surface.
- [ ] The user-facing behavior is described.
- [ ] Verification evidence is recorded.
- [ ] Risks or skipped checks are listed.

## Verification Evidence

| Date | Command / Check | Result | Notes |
| --- | --- | --- | --- |
| 2026-05-14 04:45 | `requirements.md` filled | Pass | User, outcome, scope, open questions defined |
| 2026-05-14 04:45 | Routic skills installed | Pass | 7 skills, `init` + `doctor` ran successfully |
| 2026-05-14 04:52 | Static audit complete | Pass | Project/company/agent/adapter/command/skill all checked |
| 2026-05-14 05:05 | Fix 1: 4 missing AGENTS.md | Pass | 前端/研究/测试/归档 instructions created with role-specific content |
| 2026-05-14 05:05 | Fix 2: CTO extraArgs | Pass | `--max-turns 30,--effort medium` → `--max-turns 30 --effort medium` |
| 2026-05-14 05:05 | Fix 3: Skills binding | Partial | 6/8 agents bound (codebuddy_local/cursor ✅, qwen_local ⚠️ unsupported) |

## Residual Risk

- Fork NTFS 稳定性：`pnpm dev` 死锁、`vite build` 挂起，需用 `pnpm dev:once` 替代
- Hermes 外置化分支可能未完全稳定
- routic 公司的 agent 配置可能需要调整才能正常心跳
