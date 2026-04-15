import type { EstimateResult } from "@/features/estimator/estimate"
import { formatWholeNumber } from "@/features/results/formatCount"
import type { Dictionary, Language } from "@/i18n/types"

type LiveEstimateSidebarProps = {
  result: EstimateResult
  language: Language
  t: Dictionary
}

export function LiveEstimateSidebar({ result, language, t }: LiveEstimateSidebarProps) {
  return (
    <div className="flex h-full min-h-0 flex-col rounded-xl border bg-card text-card-foreground shadow-sm">
      <div className="shrink-0 border-b px-3 py-2">
        <h2 className="text-sm font-semibold leading-tight">{t.liveEstimateTitle}</h2>
        <p className="text-xs text-muted-foreground">{t.resultDescription}</p>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-3">
        <div>
          <p className="text-xs text-muted-foreground">{t.estimatedPeople}</p>
          <p className="text-2xl font-semibold tabular-nums tracking-tight">
            {formatWholeNumber(result.expectedCount, language)}
          </p>
        </div>
        <div className="text-sm">
          <p className="text-xs text-muted-foreground">{t.rangeLabel}</p>
          <p className="font-medium tabular-nums tracking-tight leading-snug">
            {formatWholeNumber(result.lowCount, language)}
          </p>
          <p className="font-medium tabular-nums tracking-tight leading-snug">
            {formatWholeNumber(result.highCount, language)}
          </p>
        </div>
      </div>
    </div>
  )
}
