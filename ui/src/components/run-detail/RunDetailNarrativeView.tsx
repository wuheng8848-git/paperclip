import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Check,
  ChevronDown,
  Clock,
  Copy,
  FileText,
  ListTree,
  Terminal,
} from "lucide-react";
import type { Agent, HeartbeatRun } from "@paperclipai/shared";
import { activityApi } from "@/api/activity";
import { agentsApi } from "@/api/agents";
import { heartbeatsApi } from "@/api/heartbeats";
import { instanceSettingsApi } from "@/api/instanceSettings";
import { buildTranscript, getUIAdapter, onAdapterChange } from "@/adapters";
import { getAdapterDisplay } from "@/adapters/adapter-display-registry";
import { RunTranscriptView } from "@/components/transcript/RunTranscriptView";
import { MarkdownBody } from "@/components/MarkdownBody";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useToastActions } from "@/context/ToastContext";
import { useCompany } from "@/context/CompanyContext";
import { parseEffectiveTrigger } from "@/lib/wake-attribution";
import { runMetrics } from "@/lib/heartbeatRunMetrics";
import { queryKeys } from "@/lib/queryKeys";
import { orchestrationInjectionPage, formatRunStatus } from "@/lib/i18n";
import { runStatusText, runStatusTextDefault } from "@/lib/status-colors";
import {
  adapterInvokePayload,
  buildFullPromptMarkdown,
  firstAdapterInvokeEvent,
  parsePromptCacheCorrelation,
  parsePromptMetrics,
  parsePromptSections,
} from "@/lib/run-detail/adapter-invoke";
import { buildPromptBlockRows } from "@/lib/run-detail/prompt-blocks";
import { buildRunSourceNarrative } from "@/lib/run-detail/run-source-narrative";
import { formatResultJsonSummary } from "@/lib/run-detail/result-summary";
import { formatRunDurationZh, formatRunTimeShort } from "@/lib/run-detail/format-run-duration-zh";
import { formatRawLogPreview, formatTranscriptPreview } from "@/lib/run-detail/transcript-preview";
import { parseStoredLogContent } from "@/lib/run-detail/parse-stored-log";
import { asRecord, asString, prettyJson } from "@/lib/run-detail/json-utils";
import { agentUrl, formatTokens } from "@/lib/utils";
import { Link } from "@/lib/router";
import { PendingBackendNote } from "./PendingBackendNote";
import {
  BlockStatusBadge,
  DataTable,
  MetricStrip,
  NarrativeCard,
  OverviewCard,
  PropertyRow,
  StatCell,
} from "./RunDetailNarrativeComponents";

type ExpertView =
  | "prompt"
  | "friendly"
  | "raw"
  | "json-context"
  | "json-wake"
  | "json-invoke"
  | "json-result";

const EXPERT_TITLES: Record<ExpertView, string> = {
  prompt: orchestrationInjectionPage.finalPrompt,
  friendly: "友好转写",
  raw: "原始流",
  "json-context": orchestrationInjectionPage.contextSnapshot,
  "json-wake": orchestrationInjectionPage.wakePayload,
  "json-invoke": orchestrationInjectionPage.adapterInvocation,
  "json-result": "结构化回传",
};

function promptSectionLabel(sectionId: string): string {
  const titles = orchestrationInjectionPage.promptSectionTitles;
  return sectionId in titles ? titles[sectionId as keyof typeof titles] : sectionId;
}

function promptMetricLabel(metricKey: string): string {
  const labels = orchestrationInjectionPage.promptMetricLabels;
  return metricKey in labels ? labels[metricKey as keyof typeof labels] : metricKey;
}

function buildExecutionBlurb(
  adapterLabel: string,
  command: string | null,
  model: string | null,
): string | null {
  const parts: string[] = [];
  if (adapterLabel) parts.push(adapterLabel);
  if (command?.includes("stream-json")) parts.push("流式输出");
  else if (command) parts.push("单次执行");
  if (model) parts.push(`模型 ${model}`);
  return parts.length > 0 ? parts.join(" · ") : null;
}

export function RunDetailNarrativeView({ run }: { run: HeartbeatRun }) {
  const { selectedCompanyId } = useCompany();
  const { pushToast } = useToastActions();
  const [expertOpen, setExpertOpen] = useState(false);
  const [expertView, setExpertView] = useState<ExpertView>("prompt");
  const [runIdCopied, setRunIdCopied] = useState(false);
  const [parserTick, setParserTick] = useState(0);

  const agentsQuery = useQuery({
    queryKey: queryKeys.agents.list(selectedCompanyId!),
    queryFn: () => agentsApi.list(selectedCompanyId!),
    enabled: Boolean(selectedCompanyId),
  });

  const eventsQuery = useQuery({
    queryKey: queryKeys.runEvents(run.id),
    queryFn: () => heartbeatsApi.events(run.id, 0, 200),
    refetchInterval: ["queued", "running"].includes(run.status) ? 5000 : false,
  });

  const issuesQuery = useQuery({
    queryKey: queryKeys.runIssues(run.id),
    queryFn: () => activityApi.issuesForRun(run.id),
  });

  const logQuery = useQuery({
    queryKey: ["heartbeat-run", run.id, "log", "narrative"],
    queryFn: () => heartbeatsApi.log(run.id),
    enabled: Boolean(run.logRef),
    refetchInterval: ["queued", "running"].includes(run.status) ? 5000 : false,
  });

  const censorQuery = useQuery({
    queryKey: ["instance-settings", "general"],
    queryFn: () => instanceSettingsApi.getGeneral(),
  });
  const censorUsernameInLogs = censorQuery.data?.censorUsernameInLogs === true;

  useEffect(() => onAdapterChange(() => setParserTick((t) => t + 1)), []);

  const agentsById = useMemo(() => {
    const map = new Map<string, Agent>();
    for (const agent of agentsQuery.data ?? []) map.set(agent.id, agent);
    return map;
  }, [agentsQuery.data]);

  const agent = agentsById.get(run.agentId) ?? null;
  const adapterEvent = firstAdapterInvokeEvent(eventsQuery.data);
  const payload = adapterInvokePayload(adapterEvent);
  const adapterType =
    agent?.adapterType ?? asString(payload?.adapterType) ?? "unknown";
  const adapterLabel = adapterType !== "unknown" ? getAdapterDisplay(adapterType).label : null;

  const invokeContext = asRecord(payload?.context);
  const promptCacheCorrelation = parsePromptCacheCorrelation(payload?.promptCacheCorrelation);
  const promptSections = parsePromptSections(payload?.promptSections);
  const promptBlockRows = buildPromptBlockRows(promptSections, promptCacheCorrelation);
  const metricEntries = parsePromptMetrics(payload);
  const fullPromptMarkdown = buildFullPromptMarkdown(payload);
  const commandNotes = Array.isArray(payload?.commandNotes)
    ? payload.commandNotes.filter((item): item is string => typeof item === "string")
    : [];

  const parsedEffectiveTrigger = useMemo(
    () => parseEffectiveTrigger(run.contextSnapshot),
    [run.contextSnapshot],
  );

  const sourceNarrative = buildRunSourceNarrative(
    run,
    agent?.name ?? run.agentId.slice(0, 8),
    parsedEffectiveTrigger,
  );

  const metrics = runMetrics(run);
  const durationLabel = formatRunDurationZh(run.startedAt, run.finishedAt);
  const isRunning = run.status === "running" || run.status === "queued";
  const resultSummary = formatResultJsonSummary(run.resultJson);

  const primaryIssue = issuesQuery.data?.[0] ?? null;
  const contextIssueId = asString(asRecord(run.contextSnapshot)?.issueId);
  const issueLinkTarget = primaryIssue
    ? `/issues/${primaryIssue.identifier ?? primaryIssue.issueId}`
    : contextIssueId
      ? `/issues/${contextIssueId}`
      : null;

  const logLines = useMemo(
    () => (logQuery.data?.content ? parseStoredLogContent(logQuery.data.content) : []),
    [logQuery.data?.content],
  );

  const adapter = getUIAdapter(adapterType);
  const transcript = useMemo(
    () => buildTranscript(logLines, adapter, { censorUsernameInLogs }),
    [adapter, censorUsernameInLogs, logLines, parserTick],
  );

  const friendlyPreview = formatTranscriptPreview(transcript);
  const rawPreview =
    formatRawLogPreview(logQuery.data?.content ?? "") ??
    (run.stdoutExcerpt?.trim() ? formatRawLogPreview(run.stdoutExcerpt) : null);

  const executionBlurb = buildExecutionBlurb(
    adapterLabel ?? orchestrationInjectionPage.noData,
    asString(payload?.command),
    metrics.model,
  );

  const openExpert = useCallback((view: ExpertView) => {
    setExpertView(view);
    setExpertOpen(true);
  }, []);

  const copyRunId = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(run.id);
      setRunIdCopied(true);
      window.setTimeout(() => setRunIdCopied(false), 2000);
    } catch {
      pushToast({
        title: orchestrationInjectionPage.copyFinalPromptFailedTitle,
        body: orchestrationInjectionPage.copyFinalPromptFailedBody,
        tone: "error",
      });
    }
  }, [pushToast, run.id]);

  const expertBody = useMemo(() => {
    switch (expertView) {
      case "prompt":
        return fullPromptMarkdown;
      case "friendly":
        return friendlyPreview;
      case "raw":
        return logQuery.data?.content ?? run.stdoutExcerpt ?? null;
      case "json-context":
        return run.contextSnapshot;
      case "json-wake":
        return invokeContext?.paperclipWake ?? null;
      case "json-invoke":
        return payload;
      case "json-result":
        return run.resultJson;
      default:
        return null;
    }
  }, [
    expertView,
    fullPromptMarkdown,
    friendlyPreview,
    logQuery.data?.content,
    run.stdoutExcerpt,
    run.contextSnapshot,
    invokeContext?.paperclipWake,
    payload,
    run.resultJson,
  ]);

  const agentRunsHref = agent
    ? `${agentUrl(agent)}/runs/${run.id}`
    : `/agents/${run.agentId}/runs/${run.id}`;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <OverviewCard
        headerActions={
          <>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  {orchestrationInjectionPage.expertTechnicalData}
                  <ChevronDown className="ml-1 h-4 w-4" aria-hidden />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => openExpert("json-context")}>
                  运行快照（JSON）
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openExpert("json-wake")}>
                  唤醒载荷（JSON）
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => openExpert("json-result")}>
                  结构化回传（JSON）
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button variant="ghost" size="sm" onClick={() => void copyRunId()}>
              {runIdCopied ? (
                <Check className="mr-1.5 h-4 w-4" aria-hidden />
              ) : (
                <Copy className="mr-1.5 h-4 w-4" aria-hidden />
              )}
              {runIdCopied ? orchestrationInjectionPage.copyRunIdDone : orchestrationInjectionPage.copyRunId}
            </Button>
          </>
        }
      >
        <MetricStrip>
          <StatCell
            size="md"
            label={orchestrationInjectionPage.agent}
            value={
              agent ? (
                <Link to={agentUrl(agent)} className="text-primary hover:underline">
                  {agent.name}
                </Link>
              ) : (
                run.agentId.slice(0, 8)
              )
            }
          />
          <StatCell
            size="md"
            label={orchestrationInjectionPage.adapterType}
            value={adapterLabel ?? <PendingBackendNote />}
          />
          <StatCell
            size="md"
            label={orchestrationInjectionPage.runDurationLabel}
            value={
              durationLabel ??
              (isRunning ? orchestrationInjectionPage.runningLabel : orchestrationInjectionPage.noData)
            }
          />
          <StatCell
            size="md"
            label={orchestrationInjectionPage.exitCodeLabel}
            value={run.exitCode != null ? String(run.exitCode) : orchestrationInjectionPage.noData}
          />
          <StatCell
            label={orchestrationInjectionPage.status}
            value={formatRunStatus(run.status)}
            valueClassName={runStatusText[run.status] ?? runStatusTextDefault}
          />
          <StatCell
            label={orchestrationInjectionPage.inputTokensLabel}
            value={metrics.input > 0 ? formatTokens(metrics.input) : orchestrationInjectionPage.noData}
          />
          <StatCell
            label={orchestrationInjectionPage.outputTokensLabel}
            value={metrics.output > 0 ? formatTokens(metrics.output) : orchestrationInjectionPage.noData}
          />
          <StatCell
            label={orchestrationInjectionPage.cachedTokensLabel}
            value={metrics.cached > 0 ? formatTokens(metrics.cached) : orchestrationInjectionPage.noData}
          />
        </MetricStrip>
      </OverviewCard>

      <NarrativeCard
        id="source"
        title={orchestrationInjectionPage.sourceSectionTitle}
        description={orchestrationInjectionPage.sourceSectionDescription}
        icon={Activity}
        footer={
          <>
            {issueLinkTarget ? (
              <Button variant="outline" size="sm" asChild>
                <Link to={issueLinkTarget}>{orchestrationInjectionPage.openIssue}</Link>
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" asChild>
              <Link to={agentRunsHref}>{orchestrationInjectionPage.openAgentRuns}</Link>
            </Button>
          </>
        }
      >
        {sourceNarrative.paragraph ? (
          <p className="text-sm leading-relaxed">{sourceNarrative.paragraph}</p>
        ) : (
          <PendingBackendNote />
        )}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {orchestrationInjectionPage.startTimeLabel}{" "}
            <span className="font-medium tabular-nums text-foreground">
              {formatRunTimeShort(run.startedAt) ?? orchestrationInjectionPage.noData}
            </span>
          </span>
          <span aria-hidden>·</span>
          <span>
            {orchestrationInjectionPage.endTimeLabel}{" "}
            <span className="font-medium tabular-nums text-foreground">
              {isRunning
                ? orchestrationInjectionPage.runningLabel
                : formatRunTimeShort(run.finishedAt) ?? orchestrationInjectionPage.noData}
            </span>
          </span>
        </div>
        <div className="rounded-md border border-border bg-muted/15 px-3 py-1">
          <PropertyRow
            label={orchestrationInjectionPage.dispatchReasonLabel}
            value={sourceNarrative.dispatchReason ?? <PendingBackendNote />}
          />
          <PropertyRow
            label={orchestrationInjectionPage.relatedIssueLabel}
            value={
              primaryIssue ? (
                <Link to={issueLinkTarget!} className="text-primary hover:underline">
                  {primaryIssue.identifier ?? primaryIssue.issueId.slice(0, 8)}
                  {primaryIssue.title ? ` · ${primaryIssue.title}` : ""}
                </Link>
              ) : contextIssueId ? (
                <Link to={issueLinkTarget!} className="text-primary hover:underline">
                  {contextIssueId.slice(0, 8)}…
                </Link>
              ) : (
                <PendingBackendNote />
              )
            }
          />
        </div>
      </NarrativeCard>

      <NarrativeCard
        id="input"
        title={orchestrationInjectionPage.inputSectionTitle}
        description={orchestrationInjectionPage.inputSectionDescription}
        icon={ListTree}
        footer={
          fullPromptMarkdown ? (
            <Button variant="outline" size="sm" onClick={() => openExpert("prompt")}>
              {orchestrationInjectionPage.viewFullPrompt}
            </Button>
          ) : (
            <Button variant="outline" size="sm" disabled>
              {orchestrationInjectionPage.viewFullPrompt}
            </Button>
          )
        }
      >
        {promptCacheCorrelation ? (
          <div className="space-y-2 rounded-md border border-border bg-muted/15 p-3 text-xs leading-relaxed">
            <p className="font-medium text-foreground">{orchestrationInjectionPage.promptCacheCorrelationTitle}</p>
            <p className="text-muted-foreground">
              {promptCacheCorrelation.mode === "cold"
                ? orchestrationInjectionPage.promptCacheModeCold
                : orchestrationInjectionPage.promptCacheModeResumed}
            </p>
            {promptCacheCorrelation.stabilityKey ? (
              <p className="text-muted-foreground">
                {orchestrationInjectionPage.promptCacheStabilityKeyLabel}：
                <code className="ml-1 font-mono text-[11px] text-foreground">
                  {promptCacheCorrelation.stabilityKey}
                </code>
              </p>
            ) : null}
          </div>
        ) : (
          <PendingBackendNote />
        )}
        {promptBlockRows.length > 0 ? (
          <DataTable
            columns={["提示词段", "状态", "体量", "摘要"]}
            monoColumns={[2]}
            rows={promptBlockRows.map((row) => [
              promptSectionLabel(row.id),
              <BlockStatusBadge key={`${row.id}-status`} status={row.status} />,
              row.size,
              <span className="font-normal text-muted-foreground">{row.summary}</span>,
            ])}
          />
        ) : (
          <PendingBackendNote />
        )}
        {metricEntries.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {metricEntries.map((entry) => (
              <div key={entry.key} className="rounded-md border border-border px-3 py-2 text-xs">
                <div className="text-muted-foreground">{promptMetricLabel(entry.key)}</div>
                <div className="mt-1 font-medium tabular-nums">
                  {orchestrationInjectionPage.chars(entry.value)}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </NarrativeCard>

      <NarrativeCard
        id="execution"
        title={orchestrationInjectionPage.executionSectionTitle}
        description={orchestrationInjectionPage.executionSectionDescription}
        icon={Terminal}
        footer={
          <>
            <Button
              variant="outline"
              size="sm"
              disabled={!friendlyPreview && transcript.length === 0}
              onClick={() => openExpert("friendly")}
            >
              {orchestrationInjectionPage.viewFriendlyTranscript}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!rawPreview && !run.logRef}
              onClick={() => openExpert("raw")}
            >
              {orchestrationInjectionPage.viewRawStream}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={!adapterEvent}
              onClick={() => openExpert("json-invoke")}
            >
              {orchestrationInjectionPage.viewFullCommand}
            </Button>
          </>
        }
      >
        {executionBlurb ? (
          <p className="text-sm text-muted-foreground">{executionBlurb}</p>
        ) : (
          <PendingBackendNote />
        )}
        <div className="rounded-md border border-dashed border-border bg-muted/10 px-3 py-2.5 text-xs text-muted-foreground">
          {orchestrationInjectionPage.pendingBackendCliCatalog}
        </div>
        {commandNotes.length > 0 ? (
          <ul className="space-y-1 text-xs text-muted-foreground">
            {commandNotes.map((note, index) => (
              <li key={`${index}-${note}`} className="border-l border-border pl-3">
                {note}
              </li>
            ))}
          </ul>
        ) : null}
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">
            {orchestrationInjectionPage.transcriptPreviewLabel}
          </p>
          {friendlyPreview || rawPreview ? (
            <pre className="max-h-28 overflow-hidden whitespace-pre-wrap break-words rounded-md border border-border bg-muted/30 p-3 font-mono text-xs leading-relaxed text-muted-foreground">
              {friendlyPreview ?? rawPreview}
            </pre>
          ) : (
            <PendingBackendNote />
          )}
        </div>
        <div className="rounded-md border border-border bg-muted/15 px-3 py-2.5">
          <p className="text-xs text-muted-foreground">{orchestrationInjectionPage.resultSummaryLabel}</p>
          {resultSummary ? (
            <p className="mt-1 text-sm leading-relaxed">{resultSummary}</p>
          ) : (
            <div className="mt-1">
              <PendingBackendNote />
            </div>
          )}
        </div>
      </NarrativeCard>

      <Sheet open={expertOpen} onOpenChange={setExpertOpen}>
        <SheetContent side="right" className="flex w-full flex-col sm:max-w-lg">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" aria-hidden />
              {EXPERT_TITLES[expertView]}
            </SheetTitle>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto pt-4">
            {expertView === "prompt" && fullPromptMarkdown ? (
              <div className="rounded-md border border-border bg-muted/10 p-4">
                <MarkdownBody className="text-sm" softBreaks linkIssueReferences={false}>
                  {fullPromptMarkdown}
                </MarkdownBody>
              </div>
            ) : expertView === "friendly" && transcript.length > 0 ? (
              <div className="rounded-md border border-border bg-muted/20 p-3">
                <RunTranscriptView
                  entries={transcript}
                  mode="nice"
                  streaming={isRunning}
                  emptyMessage={orchestrationInjectionPage.pendingBackendNote}
                />
              </div>
            ) : expertBody != null && expertBody !== "" ? (
              <pre className="whitespace-pre-wrap break-words rounded-md border border-border bg-muted/20 p-3 font-mono text-xs leading-relaxed text-muted-foreground">
                {typeof expertBody === "string" ? expertBody : prettyJson(expertBody)}
              </pre>
            ) : (
              <PendingBackendNote />
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
