# CLAUDE.md — paperclip-latest-20260512

> This is the generic development template. For non-dev projects, consider using
> a scenario-specific template instead: `routic init --guided --type <web|design|pm|data|dev>`.

Import the shared agent brief from `AGENTS.md`.

## Project Memory

- Working order & entry points: `docs/项目计划/README.md`
- Requirements (incl. open questions & residual risks): `docs/项目计划/01.项目需求说明.md`
- Task queue, acceptance criteria, rules: `docs/项目计划/00.项目任务清单.md` (per-task verification evidence lives in `docs/项目计划/执行/*.md`)

## How To Work

1. Read `docs/项目计划/README.md` first.
2. Read `docs/项目计划/01.项目需求说明.md` before changing product behavior.
3. Read `docs/项目计划/00.项目任务清单.md` before starting implementation.
4. Record verification evidence in the relevant `docs/项目计划/执行/*.md` task. When **acceptance-criteria** wording changes, edit `docs/项目计划/00.项目任务清单.md`. Put **residual risks** in `docs/项目计划/01.项目需求说明.md` — do not duplicate per-task evidence tables in `00` beyond the task links table.

## Rules

- Do not rewrite the project structure without explicit approval.
- Prefer small, reviewable changes.
- Keep project decisions in `docs/项目计划/`.
- Treat missing requirements as a question, not permission to guess.
- When checking local AI tool installs, prefer `routic doctor --tools` instead of inventing new filesystem search rules.

## Keep This File Short

Put changing details (architecture decisions, API docs, runbooks) in `docs/项目计划/` or `docs/`. Reference them here.
