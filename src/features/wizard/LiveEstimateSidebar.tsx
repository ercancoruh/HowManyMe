import { AnimatedNumber } from "@/components/animated-number"
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
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/95 text-card-foreground shadow-lg ring-1 ring-foreground/5 backdrop-blur-md dark:bg-card/90">
      <div className="from-primary/[0.08] shrink-0 border-b border-border/60 bg-gradient-to-r to-transparent px-3 py-2 sm:py-2.5">
        <h2 className="font-heading text-sm font-semibold leading-tight tracking-tight">
          {t.liveEstimateTitle}
        </h2>
        <p className="text-xs text-muted-foreground">{t.resultDescription}</p>
      </div>
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-2.5 max-lg:space-y-2 max-lg:py-2 sm:space-y-4 sm:py-3">
        <div>
          <p className="text-xs text-muted-foreground">{t.estimatedPeople}</p>
          <p className="font-mono text-xl font-semibold tracking-tight break-words text-balance tabular-nums sm:text-2xl">
            <AnimatedNumber
              value={result.expectedCount}
              format={(n) => formatWholeNumber(n, language)}
            />
          </p>
        </div>
        <div className="text-sm">
          <p className="text-xs text-muted-foreground">{t.rangeLabel}</p>
          <div className="font-mono font-medium tracking-tight tabular-nums">
            <p className="leading-snug">
              <AnimatedNumber
                value={result.lowCount}
                format={(n) => formatWholeNumber(n, language)}
              />
            </p>
            <p className="leading-snug">
              <AnimatedNumber
                value={result.highCount}
                format={(n) => formatWholeNumber(n, language)}
              />
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
