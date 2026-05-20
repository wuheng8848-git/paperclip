---
id: exec-064-routines-i18n
status: 已完成
updated: "2026-05-20"
parent: ROU-8
board: ROU-20
---

# 执行任务单 #064 — 例行任务页 Routines / RoutineDetail 汉化

## 可复用打法

**[011-实践-回形针UI页面汉化流程.md](../最佳实践/011-实践-回形针UI页面汉化流程.md)**

## 范围

- `ui/src/pages/Routines.tsx`
- `ui/src/pages/RoutineDetail.tsx`
- `ui/src/components/RoutineList.tsx`（列表行文案）
- 字典：`ui/src/lib/i18n.ts` → `routinesShared` / `routinesPage` / `routineDetailPage` / `routineListRow`

**排除：** API 枚举原值、testid、插件托管名、动态用户/项目名；`RoutineHistoryTab` / `RoutineRunVariablesDialog` / `ManagedRoutinesList` 留后续批。

## 验收

```bash
pnpm exec vitest run ui/src/pages/Routines.test.tsx
```

| 日期 | 结果 |
|---|---|
| 2026-05-20 | **6/6 passed** |

## 分支

`feat/i18n-064-routines`（改前已从 `master` 切出；**未 commit**）

## Board

[ROU-20](http://127.0.0.1:4100/ROU/issues/ROU-20) — 执行-汉化-064-例行任务页Routines与RoutineDetail
