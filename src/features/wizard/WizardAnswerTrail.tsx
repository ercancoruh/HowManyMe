import type { PopulationDataset } from "@/data/schema"
import type { UserAnswers } from "@/features/estimator/estimate"
import type { Dictionary, Language } from "@/i18n/types"
import { cn } from "@/lib/utils"

type WizardAnswerTrailProps = {
  dataset: PopulationDataset
  answers: UserAnswers
  stepIndex: number
  isComplete: boolean
  language: Language
  t: Dictionary
  className?: string
}

export function WizardAnswerTrail({
  dataset,
  answers,
  stepIndex,
  isComplete,
  language,
  t,
  className,
}: WizardAnswerTrailProps) {
  const endExclusive = isComplete ? dataset.attributes.length : stepIndex

  const rows =
    endExclusive <= 0
      ? []
      : dataset.attributes.slice(0, endExclusive).map((attr) => {
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
    <div
      className={cn(
        "flex h-full min-h-0 flex-col rounded-xl border bg-card text-card-foreground shadow-sm",
        className,
      )}
    >
      <div className="shrink-0 border-b px-3 py-2">
        <h2 className="text-sm font-semibold leading-tight">{t.choicesSoFarTitle}</h2>
        <p className="line-clamp-2 text-xs text-muted-foreground">{t.progressPersistHint}</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noAnswersYet}</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => (
              <li
                key={row.id}
                className="border-b border-border/50 pb-2 text-sm last:border-0 last:pb-0"
              >
                <div className="text-xs text-muted-foreground">{row.question}</div>
                <div className="font-medium leading-snug">{row.answer}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
