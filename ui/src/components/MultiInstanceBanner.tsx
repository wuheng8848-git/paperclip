import { AlertTriangle } from "lucide-react";
import type { LocalRuntimePeersHealthStatus } from "../api/health";
import { multiInstanceBanner } from "../lib/i18n";

function formatPeerList(runtimePeers: LocalRuntimePeersHealthStatus): string {
  return runtimePeers.peers
    .map((peer) => multiInstanceBanner.peerDetail(peer.port, peer.version))
    .join("、");
}

export function shouldShowMultiInstanceBanner(runtimePeers?: LocalRuntimePeersHealthStatus): boolean {
  if (!runtimePeers) return false;
  return runtimePeers.peers.length > 0 || runtimePeers.portFallbackActive;
}

export function MultiInstanceBanner({ runtimePeers }: { runtimePeers?: LocalRuntimePeersHealthStatus }) {
  if (!shouldShowMultiInstanceBanner(runtimePeers) || !runtimePeers) return null;

  const hasPeers = runtimePeers.peers.length > 0;

  return (
    <div className="border-b border-red-300/70 bg-red-50 text-red-950 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100">
      <div className="flex flex-col gap-2 px-3 py-2.5 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[12px] font-semibold tracking-wide">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span>{multiInstanceBanner.title}</span>
          </div>
          <p className="mt-1 text-sm">
            {multiInstanceBanner.currentPort(runtimePeers.listenPort)}
            {runtimePeers.portFallbackActive
              ? ` · ${multiInstanceBanner.requestedPortFallback(runtimePeers.listenPort, runtimePeers.requestedPort)}`
              : null}
          </p>
          {hasPeers ? (
            <p className="mt-1 text-sm">{multiInstanceBanner.peersLine(formatPeerList(runtimePeers))}</p>
          ) : null}
          <p className="mt-1 text-xs text-red-900/80 dark:text-red-100/75">{multiInstanceBanner.action}</p>
        </div>
      </div>
    </div>
  );
}
