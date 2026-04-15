import { Info } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { populationDataset } from "@/data"
import { estimateHowManyLikeMe } from "@/features/estimator/estimate"
import { EstimateCard } from "@/features/results/EstimateCard"
import { useWizardState } from "@/features/wizard/hooks/useWizardState"
import { useI18n } from "@/i18n/useI18n"

export function WizardPage() {
  const { t, language } = useI18n()
  const wizard = useWizardState(populationDataset)
  const currentAnswer = wizard.answers[wizard.currentAttribute.id] ?? ""
  const estimate = estimateHowManyLikeMe(populationDataset, wizard.answers)

  if (wizard.isComplete) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-4">
        <EstimateCard result={estimate} dataset={populationDataset} />
        <Card>
          <CardHeader>
            <CardTitle>{t.assumptionsTitle}</CardTitle>
            <CardDescription>{t.assumptionsBody}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">{t.noAnswerHint}</p>
            {estimate.notes.map((note) => (
              <p key={note} className="text-xs text-muted-foreground">
                {note}
              </p>
            ))}
            <Button onClick={wizard.restart} className="w-full sm:w-auto">
              {t.restartButton}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4">
      <Card>
        <CardHeader className="space-y-3">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {t.stepLabel} {wizard.stepIndex + 1} {t.ofLabel} {wizard.totalSteps}
            </span>
            <span>{wizard.progress.toFixed(0)}%</span>
          </div>
          <Progress value={wizard.progress} />
          <CardTitle className="flex items-center gap-2">
            {wizard.currentAttribute.label[language]}
            {wizard.currentAttribute.sensitive ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info size={16} className="text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>{t.noAnswerHint}</TooltipContent>
              </Tooltip>
            ) : null}
          </CardTitle>
          <CardDescription>
            {wizard.currentAttribute.description?.[language] ?? t.selectPrompt}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <RadioGroup
            value={currentAnswer}
            onValueChange={(value) =>
              wizard.selectValue(wizard.currentAttribute.id, value)
            }
          >
            {wizard.currentAttribute.values.map((value) => (
              <label
                key={value.id}
                className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-muted/50"
              >
                <RadioGroupItem value={value.id} id={value.id} />
                <span>{value.label[language]}</span>
              </label>
            ))}
          </RadioGroup>
          <Separator />
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              onClick={wizard.goBack}
              disabled={wizard.stepIndex === 0}
            >
              {t.backButton}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                wizard.skipCurrent()
                wizard.goNext()
              }}
            >
              {t.skipButton}
            </Button>
            <Button
              className="ml-auto"
              onClick={wizard.goNext}
              disabled={!currentAnswer}
            >
              {wizard.stepIndex === wizard.totalSteps - 1
                ? t.finishButton
                : t.nextButton}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
