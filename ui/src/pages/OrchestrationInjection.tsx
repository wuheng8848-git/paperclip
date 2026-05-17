import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, Braces, FileText, Terminal, Workflow } from "lucide-react";
import type { Agent, HeartbeatRun, HeartbeatRunEvent } from "@paperclipai/shared";
import { agentsApi } from "../api/agents";
import { heartbeatsApi } from "../api/heartbeats";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "../components/EmptyState";
import { PageSkeleton } from "../components/PageSkeleton";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { useCompany } from "../context/CompanyContext";
import { queryKeys } from "../lib/queryKeys";
import { agentUrl, formatDateTime, relativeTime } from "../lib/utils";
import { Link } from "@/lib/router";
import { nav, orchestrationInjectionPage } from "../lib/i18n";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function prettyJson(value: unknown) {
  if (value === null || value === undefined) return orchestrationInjectionPage.noData;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function firstAdapterInvokeEvent(events: HeartbeatRunEvent[] | undefined) {
  return (events ?? []).find((event) => event.eventType === "adapter.invoke") ?? null;
}

function runTimeLabel(run: HeartbeatRun) {
  const value = run.startedAt ?? run.createdAt;
  return value ? relativeTime(value) : orchestrationInjectionPage.noData;
}

function runReason(run: HeartbeatRun) {
  const context = asRecord(run.contextSnapshot);
  return asString(context?.wakeReason) ?? run.invocationSource;
}

function JsonBlock({ value }: { value: unknown }) {
  return (
    <pre className="max-h-[340px] overflow-auto whitespace-pre-wrap break-words border border-border bg-muted/20 p-3 font-mono text-xs leading-relaxed">
      {prettyJson(value)}
    </pre>
  );
}

function PromptBlock({ prompt }: { prompt: string | null }) {
  if (!prompt) {
    return (
      <div className="border border-dashed border-border p-3 text-sm text-muted-foreground">
        {orchestrationInjectionPage.promptUnavailable}
      </div>
    );
  }

  return (
    <pre className="max-h-[520px] overflow-auto whitespace-pre-wrap break-words border border-border bg-muted/20 p-3 font-mono text-xs leading-relaxed">
      {prompt}
    </pre>
  );
}

function MetricPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="border border-border px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-medium tabular-nums">{orchestrationInjectionPage.chars(value)}</div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="grid gap-1 sm:grid-cols-[8rem_1fr]">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="break-all text-sm">{value || orchestrationInjectionPage.noData}</div>
    </div>
  );
}

export function OrchestrationInjection() {
  const { selectedCompanyId } = useCompany();
  const { setBreadcrumbs } = useBreadcrumbs();
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);

  useEffect(() => {
    setBreadcrumbs([{ label: nav.work }, { label: nav.orchestrationInjection }]);
  }, [setBreadcrumbs]);

  const agentsQuery = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });

  const runsQuery = useQuery({
    queryKey: selectedCompanyId ? [...queryKeys.heartbeats(selectedCompanyId), "orchestration-injection"] : ["heartbeats", "none", "orchestration-injection"],
    queryFn: () => heartbeatsApi.list(selectedCompanyId!, undefined, 80),
    enabled: Boolean(selectedCompanyId),
    refetchInterval: 30_000,
  });

  const selectedRun = useMemo(() => {
    const runs = runsQuery.data ?? [];
    if (selectedRunId) return runs.find((run) => run.id === selectedRunId) ?? runs[0] ?? null;
    return runs[0] ?? null;
  }, [runsQuery.data, selectedRunId]);

  useEffect(() => {
    if (!selectedRunId && selectedRun?.id) setSelectedRunId(selectedRun.id);
  }, [selectedRun?.id, selectedRunId]);

  const eventsQuery = useQuery({
    queryKey: selectedRun ? queryKeys.runEvents(selectedRun.id) : ["heartbeat-run", "none", "events"],
    queryFn: () => heartbeatsApi.events(selectedRun!.id, 0, 200),
    enabled: Boolean(selectedRun),
    refetchInterval: selectedRun && ["queued", "running"].includes(selectedRun.status) ? 5000 : false,
  });

  const agentsById = useMemo(() => {
    const map = new Map<string, Agent>();
    for (const agent of agentsQuery.data ?? []) map.set(agent.id, agent);
    return map;
  }, [agentsQuery.data]);

  const adapterEvent = firstAdapterInvokeEvent(eventsQuery.data);
  const payload = asRecord(adapterEvent?.payload);
  const context = asRecord(payload?.context);
  const promptMetrics = asRecord(payload?.promptMetrics);
  const prompt = asString(payload?.prompt);
  const commandNotes = Array.isArray(payload?.commandNotes)
    ? payload.commandNotes.filter((item): item is string => typeof item === "string")
    : [];
  const metricEntries = Object.entries(promptMetrics ?? {})
    .map(([key, value]) => ({ key, value: asNumber(value) }))
    .filter((entry): entry is { key: string; value: number } => entry.value !== null);

  if (!selectedCompanyId) {
    return <EmptyState icon={Workflow} message={orchestrationInjectionPage.selectCompany} />;
  }

  if (runsQuery.isLoading || agentsQuery.isLoading) {
    return <PageSkeleton variant="list" />;
  }

  if (runsQuery.error || agentsQuery.error) {
    const error = runsQuery.error ?? agentsQuery.error;
    return (
      <div className="text-sm text-destructive">
        {error instanceof Error ? error.message : orchestrationInjectionPage.failedToLoad}
      </div>
    );
  }

  const runs = runsQuery.data ?? [];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Workflow className="h-5 w-5 text-muted-foreground" />
            <h1 className="text-lg font-semibold">{orchestrationInjectionPage.title}</h1>
          </div>
          <p className="text-sm text-muted-foreground">{orchestrationInjectionPage.subtitle}</p>
        </div>
      </div>

      {runs.length === 0 ? (
        <EmptyState icon={Activity} message={orchestrationInjectionPage.empty} />
      ) : (
        <div className="grid min-h-[640px] gap-4 lg:grid-cols-[minmax(20rem,24rem)_1fr]">
          <div className="min-h-0 border border-border">
            <div className="border-b px-3 py-2 text-sm font-medium">{orchestrationInjectionPage.recentRuns}</div>
            <div className="max-h-[720px] overflow-y-auto">
              {runs.map((run) => {
                const agent = agentsById.get(run.agentId);
                const active = selectedRun?.id === run.id;
                return (
                  <button
                    key={run.id}
                    type="button"
                    onClick={() => setSelectedRunId(run.id)}
                    className={`block w-full border-b px-3 py-3 text-left transition-colors hover:bg-accent/40 ${active ? "bg-accent/50" : ""}`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-medium">{agent?.name ?? run.agentId}</span>
                      <Badge variant={run.status === "succeeded" ? "secondary" : run.status === "failed" ? "destructive" : "outline"} className="text-[10px]">
                        {run.status}
                      </Badge>
                    </div>
                    <div className="mt-1 truncate text-xs text-muted-foreground">{runReason(run)}</div>
                    <div className="mt-1 text-xs text-muted-foreground" title={formatDateTime(run.createdAt)}>
                      {runTimeLabel(run)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {!selectedRun ? (
            <EmptyState icon={FileText} message={orchestrationInjectionPage.noSelection} />
          ) : (
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Activity className="h-4 w-4 text-muted-foreground" />
                    {orchestrationInjectionPage.run}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <DetailRow label="ID" value={selectedRun.id} />
                  <DetailRow label={orchestrationInjectionPage.status} value={selectedRun.status} />
                  <DetailRow label={orchestrationInjectionPage.source} value={runReason(selectedRun)} />
                  <DetailRow label={orchestrationInjectionPage.startedAt} value={selectedRun.startedAt ? formatDateTime(selectedRun.startedAt) : null} />
                  <DetailRow label={orchestrationInjectionPage.createdAt} value={formatDateTime(selectedRun.createdAt)} />
                  <DetailRow
                    label={orchestrationInjectionPage.agent}
                    value={agentsById.get(selectedRun.agentId)?.name ?? selectedRun.agentId}
                  />
                  {agentsById.get(selectedRun.agentId) ? (
                    <Link to={agentUrl(agentsById.get(selectedRun.agentId)!)} className="text-sm text-primary hover:underline">
                      {agentsById.get(selectedRun.agentId)!.name}
                    </Link>
                  ) : null}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Terminal className="h-4 w-4 text-muted-foreground" />
                    {orchestrationInjectionPage.adapterInvocation}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {!adapterEvent ? (
                    <div className="border border-dashed border-border p-3 text-sm text-muted-foreground">
                      {orchestrationInjectionPage.eventUnavailable}
                    </div>
                  ) : (
                    <>
                      <DetailRow label={orchestrationInjectionPage.adapterType} value={asString(payload?.adapterType)} />
                      <DetailRow label={orchestrationInjectionPage.command} value={asString(payload?.command)} />
                      <DetailRow label={orchestrationInjectionPage.cwd} value={asString(payload?.cwd)} />
                      {commandNotes.length > 0 ? (
                        <div>
                          <div className="mb-2 text-xs text-muted-foreground">{orchestrationInjectionPage.commandNotes}</div>
                          <ul className="space-y-1 text-sm">
                            {commandNotes.map((note, index) => (
                              <li key={`${index}-${note}`} className="border-l border-border pl-3">
                                {note}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ) : null}
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {orchestrationInjectionPage.finalPrompt}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {metricEntries.length > 0 ? (
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      {metricEntries.map((entry) => (
                        <MetricPill key={entry.key} label={entry.key} value={entry.value} />
                      ))}
                    </div>
                  ) : null}
                  <PromptBlock prompt={prompt} />
                </CardContent>
              </Card>

              <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Braces className="h-4 w-4 text-muted-foreground" />
                      {orchestrationInjectionPage.contextSnapshot}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <JsonBlock value={selectedRun.contextSnapshot} />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Workflow className="h-4 w-4 text-muted-foreground" />
                      {orchestrationInjectionPage.wakePayload}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <JsonBlock value={context?.paperclipWake ?? null} />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
