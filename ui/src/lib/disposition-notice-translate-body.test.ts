import { describe, expect, it } from "vitest";

import { dispositionNotice } from "./i18n";

const RUN_FAILURE_WITHHELD =
  " Latest retry failure details were withheld from the issue thread; inspect the linked run for evidence.";

describe("dispositionNotice.translateBody stranded recovery templates", () => {
  it("translates stopped stranded-work recovery comment", () => {
    expect(
      dispositionNotice.translateBody(
        "Paperclip stopped automatic stranded-work recovery for this recovery issue.",
      ),
    ).toBe("回形针已停止对本恢复事务的自动滞留作业恢复。");
  });

  it("translates continuation retry escalated with withheld failure suffix", () => {
    const en =
      "Paperclip automatically retried continuation for this assigned `in_progress` issue after its live execution disappeared, but it still has no live execution path." +
      RUN_FAILURE_WITHHELD +
      " Moving it to `blocked` so it is visible for intervention.";
    expect(dispositionNotice.translateBody(en)).toBe(
      "回形针对该 `in_progress` 经办事务在其在线执行路径消失后自动重试了延续执行，但仍无在线执行路径。" +
        "最新重试失败详情未写入事务讨论串，请查看关联运行取证。" +
        "已将该事务标为阻塞（`blocked`），便于人工介入。",
    );
  });

  it("translates continuation retry escalated without withheld suffix", () => {
    const en =
      "Paperclip automatically retried continuation for this assigned `in_progress` issue after its live execution disappeared, but it still has no live execution path. Moving it to `blocked` so it is visible for intervention.";
    expect(dispositionNotice.translateBody(en)).toBe(
      "回形针对该 `in_progress` 经办事务在其在线执行路径消失后自动重试了延续执行，但仍无在线执行路径。" +
        "已将该事务标为阻塞（`blocked`），便于人工介入。",
    );
  });

  it("translates productive continuation repeated recovery path", () => {
    const en =
      "Paperclip automatically retried continuation for this assigned `in_progress` issue and the retry made progress, but it still has no live execution path. Moving it to `blocked` so it is visible for intervention.";
    expect(dispositionNotice.translateBody(en)).toBe(
      "回形针对该 `in_progress` 经办事务自动重试了延续执行，重试有进展但仍无在线执行路径。" +
        "已将该事务标为阻塞（`blocked`），便于人工介入。",
    );
  });

  it("translates continuation + recovery tail without markdown backticks (board-rendered body)", () => {
    const recoveryTail =
      "\n\n- Recovery issue: [ROU-64](https://example.invalid/i)" +
      "\n- Recovery owner: CEO" +
      "\n- Next action: the recovery owner should either restore a live execution path or record the manual resolution, then mark the recovery issue done.";
    const en =
      "Paperclip automatically retried continuation for this assigned in_progress issue after its live execution disappeared, but it still has no live execution path." +
      RUN_FAILURE_WITHHELD +
      " Moving it to blocked so it is visible for intervention." +
      recoveryTail;
    const out = dispositionNotice.translateBody(en);
    expect(out).toContain("回形针对该 `in_progress` 经办事务在其在线执行路径消失后自动重试了延续执行");
    expect(out).toContain("- 恢复事务:");
    expect(out).toContain("- 恢复负责人:");
    expect(out).toContain("- 建议下一步：");
    expect(out).toContain("恢复负责人应恢复在线执行路径");
  });
});
