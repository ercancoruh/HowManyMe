import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { PopulationDataset } from "@/data/schema"
import type { UserAnswers } from "@/features/estimator/estimate"
import type { Dictionary, Language } from "@/i18n/types"

type WizardAnswerTrailProps = {
  dataset: PopulationDataset
  answers: UserAnswers
  stepIndex: number
  isComplete: boolean
  language: Language
  t: Dictionary
}

export function WizardAnswerTrail({
  dataset,
  answers,
  stepIndex,
  isComplete,
  language,
  t,
}: WizardAnswerTrailProps) {
  const endExclusive = isComplete ? dataset.attributes.length : stepIndex
  if (endExclusive <= 0) {
    return null
  }

  const rows = dataset.attributes.slice(0, endExclusive).map((attr) => {
    const valueId = answers[attr.id]
    const valueLabel =
      valueId === undefined
        ? t.skippedStepLabel
        : (attr.values.find((v) => v.id === valueId)?.label[language] ?? valueId)

    return {
      id: attr.id,
      question: attr.label[language],
      answer: valueLabel,
    }
  })

  return (
    <Card>
      <CardHeader className="space-y-1">
        <CardTitle className="text-base">{t.choicesSoFarTitle}</CardTitle>
        <CardDescription>{t.progressPersistHint}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex flex-col gap-0.5 border-b border-border/60 pb-2 last:border-0 last:pb-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4"
          >
            <span className="text-sm text-muted-foreground">{row.question}</span>
            <span className="text-sm font-medium sm:text-end">{row.answer}</span>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
