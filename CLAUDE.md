# CLAUDE.md — paperclip-latest-20260512

> This is the generic development template. For non-dev projects, consider using
> a scenario-specific template instead: `routic init --guided --type <web|design|pm|data|dev>`.

Import the shared agent brief from `AGENTS.md`.

## Project Memory

- Current project overview: `docs/00-project/README.md`
- Requirements: `docs/00-project/requirements.md`
- Task queue: `docs/00-project/tasks.md`
- Acceptance checklist: `docs/00-project/acceptance.md`

## How To Work

1. Read `docs/00-project/README.md` first.
2. Read `docs/00-project/requirements.md` before changing product behavior.
3. Read `docs/00-project/tasks.md` before starting implementation.
4. Update `docs/00-project/acceptance.md` with evidence before claiming completion.

## Rules

- Do not rewrite the project structure without explicit approval.
- Prefer small, reviewable changes.
- Keep project decisions in `docs/00-project/`.
- Treat missing requirements as a question, not permission to guess.
- When checking local AI tool installs, prefer `routic doctor --tools` instead of inventing new filesystem search rules.

## Keep This File Short

Put changing details (architecture decisions, API docs, runbooks) in `docs/00-project/` or `docs/`. Reference them here.
