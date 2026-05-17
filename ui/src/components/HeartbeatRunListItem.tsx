import { Link } from "@/lib/router";
import type { HeartbeatRun } from "@paperclipai/shared";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Timer,
  Loader2,
  Slash,
} from "lucide-react";
import { agentDetailUi } from "../lib/i18n";
import { cn, formatTokens, relativeTime } from "../lib/utils";
import { runMetrics } from "../lib/heartbeatRunMetrics";

export const runStatusIcons: Record<string, { icon: typeof CheckCircle2; color: string }> = {
  succeeded: { icon: CheckCircle2, color: "text-green-600 dark:text-green-400" },
  failed: { icon: XCircle, color: "text-red-600 dark:text-red-400" },
  running: { icon: Loader2, color: "text-cyan-600 dark:text-cyan-400" },
  queued: { icon: Clock, color: "text-yellow-600 dark:text-yellow-400" },
  scheduled_retry: { icon: Clock, color: "text-sky-600 dark:text-sky-400" },
  timed_out: { icon: Timer, color: "text-orange-600 dark:text-orange-400" },
  cancelled: { icon: Slash, color: "text-neutral-500 dark:text-neutral-400" },
};

export const sourceLabels: Record<string, string> = {
  timer: agentDetailUi.sourceTimer,
  assignment: agentDetailUi.sourceAssignment,
  on_demand: agentDetailUi.sourceOnDemand,
  automation: agentDetailUi.sourceAutomation,
};

type HeartbeatRunListItemBase = {
  run: HeartbeatRun;
  isSelected: boolean;
  /** 公司级列表：在每条顶部显示智能体名称 */
  agentLine?: string | null;
};

type HeartbeatRunListItemLink = HeartbeatRunListItemBase & {
  variant: "link";
  agentRouteId: string;
};

type HeartbeatRunListItemButton = HeartbeatRunListItemBase & {
  variant: "button";
  onSelect: () => void;
};

export type HeartbeatRunListItemProps = HeartbeatRunListItemLink | HeartbeatRunListItemButton;

export function HeartbeatRunListItem(props: HeartbeatRunListItemProps) {
  const { run, isSelected, agentLine } = props;
  const statusInfo = runStatusIcons[run.status] ?? { icon: Clock, color: "text-neutral-400" };
  const StatusIcon = statusInfo.icon;
  const metrics = runMetrics(run);
  const summary = run.resultJson
    ? String(
        (run.resultJson as Record<string, unknown>).summary
          ?? (run.resultJson as Record<string, unknown>).result
          ?? "",
      )
    : run.error ?? "";

  const rowClassName = cn(
    "flex flex-col gap-1 w-full px-3 py-2.5 text-left border-b border-border last:border-b-0 transition-colors",
    isSelected ? "bg-accent/40" : "hover:bg-accent/20",
  );

  const content = (
    <>
      {agentLine ? (
        <div className="truncate text-xs font-medium text-foreground">{agentLine}</div>
      ) : null}
      <div className="flex items-center gap-2">
        <StatusIcon
          className={cn("h-3.5 w-3.5 shrink-0", statusInfo.color, run.status === "running" && "animate-spin")}
        />
        <span className="font-mono text-xs text-muted-foreground">{run.id.slice(0, 8)}</span>
        <span
          className={cn(
            "inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-medium shrink-0",
            run.invocationSource === "timer"
              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
              : run.invocationSource === "assignment"
                ? "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300"
                : run.invocationSource === "on_demand"
                  ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/50 dark:text-cyan-300"
                  : "bg-muted text-muted-foreground",
          )}
        >
          {sourceLabels[run.invocationSource] ?? run.invocationSource}
        </span>
        <span className="ml-auto text-[11px] text-muted-foreground shrink-0">
          {relativeTime(run.createdAt)}
        </span>
      </div>
      {summary ? (
        <span className="text-xs text-muted-foreground truncate pl-5.5">{summary.slice(0, 60)}</span>
      ) : null}
      {(metrics.totalTokens > 0 || metrics.cost > 0) && (
        <div className="flex items-center gap-2 pl-5.5 text-[11px] text-muted-foreground tabular-nums">
          {metrics.totalTokens > 0 ? <span>{formatTokens(metrics.totalTokens)} tok</span> : null}
          {metrics.cost > 0 ? <span>${metrics.cost.toFixed(3)}</span> : null}
        </div>
      )}
    </>
  );

  if (props.variant === "link") {
    return (
      <Link
        to={isSelected ? `/agents/${props.agentRouteId}/runs` : `/agents/${props.agentRouteId}/runs/${run.id}`}
        className={cn(rowClassName, "no-underline text-inherit")}
      >
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={props.onSelect} className={cn(rowClassName, "cursor-pointer font-inherit text-inherit bg-transparent")}>
      {content}
    </button>
  );
}
