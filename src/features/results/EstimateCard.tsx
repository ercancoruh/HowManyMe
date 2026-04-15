import { AnimatedNumber } from "@/components/animated-number"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { EstimateResult } from "@/features/estimator/estimate"
import { formatWholeNumber } from "@/features/results/formatCount"
import { useI18n } from "@/i18n/useI18n"

type EstimateCardProps = {
  result: EstimateResult
}

export function EstimateCard({ result }: EstimateCardProps) {
  const { t, language } = useI18n()

  return (
    <Card className="border-primary/20 from-primary/[0.07] overflow-hidden bg-gradient-to-br to-card shadow-md">
      <CardHeader>
        <CardTitle>{t.resultTitle}</CardTitle>
        <CardDescription>{t.resultDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">{t.estimatedPeople}</p>
          <p className="font-mono text-2xl font-semibold tracking-tight break-words text-balance tabular-nums sm:text-3xl">
            <AnimatedNumber
              value={result.expectedCount}
              format={(n) => formatWholeNumber(n, language)}
            />
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {t.rangeLabel}:{" "}
          <span className="font-mono font-medium break-words text-balance text-foreground tabular-nums">
            <AnimatedNumber
              value={result.lowCount}
              format={(n) => formatWholeNumber(n, language)}
            />{" "}
            -{" "}
            <AnimatedNumber
              value={result.highCount}
              format={(n) => formatWholeNumber(n, language)}
            />
          </span>
        </div>
      </CardContent>
    </Card>
  )
}
