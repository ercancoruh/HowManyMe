import { motion, useReducedMotion } from "motion/react"

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
  const reduced = useReducedMotion()
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

  const listKey = rows.map((r) => r.id).join("|")

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/95 text-card-foreground shadow-lg ring-1 ring-foreground/5 backdrop-blur-md dark:bg-card/90",
        className,
      )}
    >
      <div className="shrink-0 border-b border-border/60 px-3 py-2">
        <h2 className="font-heading text-sm font-semibold leading-tight tracking-tight">
          {t.choicesSoFarTitle}
        </h2>
        <p className="line-clamp-2 text-xs text-muted-foreground">{t.progressPersistHint}</p>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.noAnswersYet}</p>
        ) : (
          <motion.ul
            key={listKey}
            className="space-y-2"
            initial="hidden"
            animate="show"
            variants={{
              hidden: {},
              show: {
                transition: {
                  staggerChildren: reduced ? 0 : 0.045,
                  delayChildren: reduced ? 0 : 0.02,
                },
              },
            }}
          >
            {rows.map((row) => (
              <motion.li
                key={row.id}
                variants={{
                  hidden: { opacity: 0, x: reduced ? 0 : -8, y: reduced ? 0 : 4 },
                  show: {
                    opacity: 1,
                    x: 0,
                    y: 0,
                    transition: { type: "spring", stiffness: 420, damping: 28 },
                  },
                }}
                className="border-b border-border/50 pb-2 text-sm last:border-0 last:pb-0"
              >
                <div className="text-xs text-muted-foreground">{row.question}</div>
                <div className="font-medium leading-snug">{row.answer}</div>
              </motion.li>
            ))}
          </motion.ul>
        )}
      </div>
    </div>
  )
}
