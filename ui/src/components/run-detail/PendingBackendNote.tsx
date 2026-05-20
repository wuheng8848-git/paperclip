import { Badge } from "@/components/ui/badge";
import { orchestrationInjectionPage } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function PendingBackendNote({ className }: { className?: string }) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)}>
      {orchestrationInjectionPage.pendingBackendNote}
    </p>
  );
}

export function PendingBackendBadge() {
  return (
    <Badge variant="outline" className="font-normal text-muted-foreground">
      {orchestrationInjectionPage.pendingBackendNote}
    </Badge>
  );
}
