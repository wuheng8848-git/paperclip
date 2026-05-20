import type { HeartbeatRun } from "@paperclipai/shared";
import type { ParsedEffectiveTrigger } from "../wake-attribution";
import { orchestrationInjectionPage, formatWakeupTriggerDetailZh, formatCommonApiSlugZh } from "../i18n";
import { asRecord, asString } from "./json-utils";

function wakeAttributionSourceLabel(source: string): string {
  const labels = orchestrationInjectionPage.wakeAttributionSourceLabels;
  return source in labels ? labels[source as keyof typeof labels] : source;
}

function wakeAttributionReasonLabel(reason: string): string {
  const labels = orchestrationInjectionPage.wakeReasonLabels;
  return reason in labels ? labels[reason as keyof typeof labels] : reason;
}

function runWakeReason(run: HeartbeatRun): string {
  const context = asRecord(run.contextSnapshot);
  return asString(context?.wakeReason) ?? run.invocationSource;
}

export type RunSourceNarrative = {
  /** 一段 HTML-safe 纯文本叙事；null 表示需展示「等待后端」占位 */
  paragraph: string | null;
  /** 派工原因行（PropertyRow） */
  dispatchReason: string | null;
  /** 是否来自 effectiveTrigger v1 */
  fromEffectiveTrigger: boolean;
};

function formatTriggerDetail(detail: string | null): string | null {
  if (!detail) return null;
  return formatWakeupTriggerDetailZh(detail);
}

export function buildRunSourceNarrative(
  run: HeartbeatRun,
  agentName: string,
  effectiveTrigger: ParsedEffectiveTrigger | null,
): RunSourceNarrative {
  if (effectiveTrigger) {
    const { winning } = effectiveTrigger;
    const source = wakeAttributionSourceLabel(winning.source);
    const reason = wakeAttributionReasonLabel(winning.reason);
    const absorbedNote =
      effectiveTrigger.absorbed.length > 0
        ? `（另有 ${effectiveTrigger.absorbed.length} 路触发被合并吸收）`
        : "";
    const detailRaw = winning.triggerDetail;
    const detail = formatTriggerDetail(detailRaw);
    const detailSuffix = detail ? `，${detail}` : "";
    return {
      paragraph: `本次由${source}触发：${reason}，指派至 ${agentName} 后启动本轮运行${detailSuffix}${absorbedNote}。`,
      dispatchReason: `${source} · ${reason}${detail ? ` · ${detail}` : ""}`,
      fromEffectiveTrigger: true,
    };
  }

  const wakeReason = runWakeReason(run);
  const reasonLabel = wakeAttributionReasonLabel(wakeReason);
  const hasKnownReason = wakeReason in orchestrationInjectionPage.wakeReasonLabels;
  const triggerDetail = run.triggerDetail ? formatTriggerDetail(String(run.triggerDetail)) : null;

  if (hasKnownReason || triggerDetail) {
    const reasonText = hasKnownReason ? reasonLabel : wakeReason;
    return {
      paragraph: `本次运行由 ${reasonText} 产生，执行智能体为 ${agentName}。`,
      dispatchReason: triggerDetail ?? reasonText,
      fromEffectiveTrigger: false,
    };
  }

  return {
    paragraph: null,
    dispatchReason: run.invocationSource ? formatCommonApiSlugZh(run.invocationSource) : null,
    fromEffectiveTrigger: false,
  };
}
