import type { ReactNode } from "react";
import { LayoutDashboard } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { orchestrationInjectionPage } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import type { PromptBlockStatus } from "@/lib/run-detail/prompt-blocks";

export function PropertyRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <span className="shrink-0 text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 text-right text-sm">{value}</span>
    </div>
  );
}

export function StatCell({
  label,
  value,
  valueClassName,
  size = "lg",
}: {
  label: string;
  value: ReactNode;
  valueClassName?: string;
  size?: "lg" | "md";
}) {
  return (
    <div className="px-4 py-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div
        className={cn(
          "mt-1 tracking-tight",
          size === "lg" ? "text-lg font-semibold tabular-nums" : "text-sm font-medium",
          valueClassName,
        )}
      >
        {value}
      </div>
    </div>
  );
}

export function MetricStrip({ children, columns = 4 }: { children: ReactNode; columns?: 2 | 3 | 4 }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-md border border-transparent sm:grid sm:divide-x sm:divide-y sm:divide-transparent",
        columns === 2 && "sm:grid-cols-2",
        columns === 3 && "sm:grid-cols-2 lg:grid-cols-3",
        columns === 4 && "sm:grid-cols-2 lg:grid-cols-4",
      )}
    >
      {children}
    </div>
  );
}

export function BlockStatusBadge({ status }: { status: PromptBlockStatus }) {
  if (status === "省略") {
    return (
      <Badge variant="outline" className="font-normal text-muted-foreground line-through opacity-70">
        省略
      </Badge>
    );
  }
  if (status === "指针") {
    return (
      <Badge variant="secondary" className="font-normal">
        指针
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="font-normal">
      带入
    </Badge>
  );
}

export function NarrativeCard({
  id,
  title,
  description,
  icon: Icon,
  headerActions,
  children,
  footer,
}: {
  id: string;
  title: string;
  description: string;
  icon?: React.ComponentType<{ className?: string }>;
  headerActions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <Card id={id} className="scroll-mt-4 gap-0 py-0 shadow-none">
      <div className="flex flex-wrap items-end gap-x-2 gap-y-0 border-b px-6 py-3">
        {Icon ? (
          <Icon className="mb-px h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
        ) : null}
        <CardTitle className="shrink-0 text-sm font-medium leading-none">{title}</CardTitle>
        <CardDescription className="min-w-0 flex-1 pb-px text-xs leading-none">{description}</CardDescription>
        {headerActions ? (
          <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2 pb-px">{headerActions}</div>
        ) : null}
      </div>
      <CardContent className={cn("space-y-3 px-6 pt-3", footer && "pb-3")}>{children}</CardContent>
      {footer ? (
        <CardFooter className="flex flex-wrap gap-2 border-t px-6 py-3 [.border-t]:pt-3">{footer}</CardFooter>
      ) : null}
    </Card>
  );
}

export function OverviewCard({
  headerActions,
  children,
}: {
  headerActions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card id="outcome" className="scroll-mt-4 gap-0 py-0 shadow-none">
      <div className="flex flex-col gap-3 border-b px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-0">
          <LayoutDashboard className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <CardTitle className="shrink-0 text-base font-medium leading-none">
            {orchestrationInjectionPage.overviewTitle}
          </CardTitle>
        </div>
        {headerActions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2">{headerActions}</div>
        ) : null}
      </div>
      <CardContent className="space-y-3 px-6 pb-3 pt-3">{children}</CardContent>
    </Card>
  );
}

export function DataTable({
  columns,
  rows,
  monoColumns = [],
}: {
  columns: string[];
  rows: ReactNode[][];
  monoColumns?: number[];
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr className="border-b border-border bg-accent/20">
            {columns.map((col) => (
              <th key={col} className="px-3 py-2.5 text-left font-medium text-muted-foreground">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-b border-border transition-colors last:border-b-0 hover:bg-accent/20"
            >
              {cells.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={cn(
                    "px-3 py-2.5 align-top",
                    cellIndex === 0 ? "text-sm font-medium" : "text-sm",
                    monoColumns.includes(cellIndex) && "font-mono text-xs text-muted-foreground",
                  )}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
