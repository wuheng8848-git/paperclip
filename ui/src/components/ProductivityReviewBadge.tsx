import { Eye } from "lucide-react";
import type { IssueProductivityReview } from "@paperclipai/shared";
import { Link } from "../lib/router";
import { cn } from "../lib/utils";
import { createIssueDetailPath } from "../lib/issueDetailBreadcrumb";
import {
  productivityReviewStatusLabel,
  productivityReviewTriggerLabel,
  productivityReviewUi,
} from "../lib/i18n";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export { productivityReviewTriggerLabel } from "../lib/i18n";

export function ProductivityReviewBadge({
  review,
  className,
  hideLabel = false,
}: {
  review: IssueProductivityReview;
  className?: string;
  hideLabel?: boolean;
}) {
  const label = productivityReviewTriggerLabel(review.trigger);
  const reviewIdentifier = review.reviewIdentifier ?? review.reviewIssueId.slice(0, 8);
  const reviewPath = createIssueDetailPath(review.reviewIdentifier ?? review.reviewIssueId);
  const statusLabel = productivityReviewStatusLabel(review.status);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to={reviewPath}
          className={cn(
            "inline-flex items-center gap-1 rounded-full border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-300 shrink-0 hover:bg-amber-500/20 transition-colors",
            className,
          )}
          aria-label={productivityReviewUi.badgeAria(reviewIdentifier, label)}
        >
          <Eye className="h-3 w-3" aria-hidden />
          {hideLabel ? null : <span>{productivityReviewUi.badgeLabel}</span>}
        </Link>
      </TooltipTrigger>
      <TooltipContent>
        <div className="space-y-1 text-xs">
          <div className="font-semibold">{productivityReviewUi.tooltipOpen}</div>
          <div>
            <span className="text-muted-foreground">{productivityReviewUi.tooltipTrigger}：</span> {label}
          </div>
          {typeof review.noCommentStreak === "number" && review.noCommentStreak > 0 ? (
            <div>
              <span className="text-muted-foreground">{productivityReviewUi.tooltipNoCommentStreak}：</span>{" "}
              {productivityReviewUi.tooltipNoCommentStreakRuns(review.noCommentStreak)}
            </div>
          ) : null}
          <div>
            <span className="text-muted-foreground">{productivityReviewUi.tooltipReview}：</span> {reviewIdentifier}（{statusLabel}）
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
