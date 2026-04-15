import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { EstimateResult } from "@/features/estimator/estimate"
import { useI18n } from "@/i18n/useI18n"

type EstimateCardProps = {
  result: EstimateResult
}

function formatCount(value: number) {
  if (value < 1) {
    return "< 1"
  }

  return new Intl.NumberFormat("en", {
    notation: value > 999_999 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(value)
}

export function EstimateCard({ result }: EstimateCardProps) {
  const { t } = useI18n()

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.resultTitle}</CardTitle>
        <CardDescription>{t.resultDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">{t.estimatedPeople}</p>
          <p className="text-3xl font-semibold">{formatCount(result.expectedCount)}</p>
        </div>
        <div className="text-sm text-muted-foreground">
          {t.rangeLabel}: {formatCount(result.lowCount)} - {formatCount(result.highCount)}
        </div>
      </CardContent>
    </Card>
  )
}
