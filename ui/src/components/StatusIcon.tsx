import { useState } from "react";
import type { IssueBlockerAttention } from "@paperclipai/shared";
import { cn } from "../lib/utils";
import { issueStatusIcon, issueStatusIconDefault } from "../lib/status-colors";
import { formatBlockedAttentionLabel, formatIssueStatus } from "../lib/i18n";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

const allStatuses = ["backlog", "todo", "in_progress", "in_review", "done", "cancelled", "blocked"];

function statusLabel(status: string): string {
  return formatIssueStatus(status);
}

interface StatusIconProps {
  status: string;
  blockerAttention?: IssueBlockerAttention | null;
  onChange?: (status: string) => void;
  className?: string;
  showLabel?: boolean;
}

export function StatusIcon({ status, blockerAttention, onChange, className, showLabel }: StatusIconProps) {
  const [open, setOpen] = useState(false);
  const isCoveredBlocked = status === "blocked" && blockerAttention?.state === "covered";
  const isStalledBlocked = status === "blocked" && blockerAttention?.state === "stalled";
  const isAttentionBlocked = status === "blocked" && blockerAttention?.state === "needs_attention";
  const hasCoveredBlockedWork = isAttentionBlocked && (blockerAttention?.coveredBlockerCount ?? 0) > 0;
  const colorClass = isCoveredBlocked
    ? "text-cyan-600 border-cyan-600 dark:text-cyan-400 dark:border-cyan-400"
    : isStalledBlocked
      ? "text-amber-600 border-amber-600 dark:text-amber-400 dark:border-amber-400"
      : issueStatusIcon[status] ?? issueStatusIconDefault;
  const isDone = status === "done";
  const ariaLabel = status === "blocked" ? formatBlockedAttentionLabel(blockerAttention) : statusLabel(status);
  const blockerAttentionState = isCoveredBlocked
    ? "covered"
    : isStalledBlocked
      ? "stalled"
      : isAttentionBlocked
        ? "needs_attention"
        : undefined;

  const circle = (
    <span
      className={cn(
        "relative inline-flex h-4 w-4 rounded-full border-2 shrink-0",
        colorClass,
        onChange && !showLabel && "cursor-pointer",
        className
      )}
      data-blocker-attention-state={blockerAttentionState}
      aria-label={ariaLabel}
      title={ariaLabel}
    >
      {isDone && (
        <span className="absolute inset-0 m-auto h-2 w-2 rounded-full bg-current" />
      )}
      {isCoveredBlocked && (
        <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background bg-current" />
      )}
      {hasCoveredBlockedWork && (
        <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border border-background bg-cyan-600 dark:bg-cyan-400" />
      )}
      {isStalledBlocked && (
        <span className="absolute inset-0 m-auto h-1.5 w-1.5 rounded-full bg-current" />
      )}
    </span>
  );

  if (!onChange) return showLabel ? <span className="inline-flex items-center gap-1.5">{circle}<span className="text-sm">{statusLabel(status)}</span></span> : circle;

  const trigger = showLabel ? (
    <button className="inline-flex items-center gap-1.5 cursor-pointer hover:bg-accent/50 rounded px-1 -mx-1 py-0.5 transition-colors">
      {circle}
      <span className="text-sm">{statusLabel(status)}</span>
    </button>
  ) : circle;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent className="w-40 p-1" align="start">
        {allStatuses.map((s) => (
          <Button
            key={s}
            variant="ghost"
            size="sm"
            className={cn("w-full justify-start gap-2 text-xs", s === status && "bg-accent")}
            onClick={() => {
              onChange(s);
              setOpen(false);
            }}
          >
            <StatusIcon status={s} />
            {statusLabel(s)}
          </Button>
        ))}
      </PopoverContent>
    </Popover>
  );
}
