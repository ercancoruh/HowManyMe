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
    <Card>
      <CardHeader>
        <CardTitle>{t.resultTitle}</CardTitle>
        <CardDescription>{t.resultDescription}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">{t.estimatedPeople}</p>
          <p className="text-3xl font-semibold">
            {formatWholeNumber(result.expectedCount, language)}
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
          {t.rangeLabel}: {formatWholeNumber(result.lowCount, language)} -{" "}
          {formatWholeNumber(result.highCount, language)}
        </div>
      </CardContent>
    </Card>
  )
}
