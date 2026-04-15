import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { PopulationDataset } from "@/data/schema"
import type { EstimateResult } from "@/features/estimator/estimate"
import { useI18n } from "@/i18n/useI18n"

type EstimateCardProps = {
  result: EstimateResult
  dataset: PopulationDataset
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

export function EstimateCard({ result, dataset }: EstimateCardProps) {
  const { t } = useI18n()

  const confidenceText =
    result.confidence === "high"
      ? t.confidenceHigh
      : result.confidence === "medium"
        ? t.confidenceMedium
        : t.confidenceLow

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
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t.confidenceLabel}</span>
          <Badge variant="secondary">{confidenceText}</Badge>
        </div>
        <div className="text-sm text-muted-foreground">
          {t.rangeLabel}: {formatCount(result.lowCount)} - {formatCount(result.highCount)}
        </div>
        <Separator />
        <div className="space-y-1 text-xs text-muted-foreground">
          <p>
            {t.sourceLabel}: {dataset.attributes[0]?.source ?? "Mixed public datasets"}
          </p>
          <p>
            {t.yearLabel}: {dataset.asOfYear}
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
