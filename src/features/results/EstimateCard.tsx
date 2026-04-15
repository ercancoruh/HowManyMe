import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { EstimateResult } from "@/features/estimator/estimate"
import { useI18n } from "@/i18n/useI18n"
import type { Language } from "@/i18n/types"

type EstimateCardProps = {
  result: EstimateResult
}

function formatWholeNumber(value: number, language: Language) {
  if (value < 1) {
    return "< 1"
  }

  const locale = language === "tr" ? "tr-TR" : "en-US"

  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
    useGrouping: true,
  }).format(Math.round(value))
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
