import { Info } from "@phosphor-icons/react"
import type { ReactNode } from "react"

import { SearchableSelect } from "@/components/searchable-select"
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
import { LiveEstimateSidebar } from "@/features/wizard/LiveEstimateSidebar"
import { WizardAnswerTrail } from "@/features/wizard/WizardAnswerTrail"
import { useI18n } from "@/i18n/useI18n"

function WizardShell(props: { center: ReactNode; sideRail: ReactNode }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden lg:grid lg:grid-cols-12 lg:items-stretch lg:gap-4">
      <section className="flex min-h-0 flex-1 flex-col lg:col-span-8 lg:h-full lg:min-h-0">
        {props.center}
      </section>
      <aside className="flex h-[min(42svh,400px)] min-h-0 shrink-0 flex-col gap-3 overflow-hidden lg:col-span-4 lg:h-full lg:min-h-0">
        {props.sideRail}
      </aside>
    </div>
  )
}

export function WizardPage() {
  const { t, language } = useI18n()
  const wizard = useWizardState(populationDataset)
  const currentAnswer = wizard.answers[wizard.currentAttribute.id] ?? ""
  const estimate = estimateHowManyLikeMe(populationDataset, wizard.answers)

  const trail = (
    <WizardAnswerTrail
      dataset={populationDataset}
      answers={wizard.answers}
      stepIndex={wizard.stepIndex}
      isComplete={wizard.isComplete}
      language={language}
      t={t}
    />
  )

  const live = <LiveEstimateSidebar result={estimate} language={language} t={t} />

  const sideRail = (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
      <div className="flex min-h-0 flex-[1] flex-col overflow-hidden">
        {live}
      </div>
      <div className="flex min-h-0 flex-[2] flex-col overflow-hidden">{trail}</div>
    </div>
  )

  if (wizard.isComplete) {
    return (
      <WizardShell
        sideRail={sideRail}
        center={
          <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <EstimateCard result={estimate} />
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
                </CardContent>
              </Card>
            </div>
            <div className="shrink-0 border-t bg-card px-4 py-3">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={wizard.goBack}>
                  {t.backButton}
                </Button>
                <Button onClick={wizard.restart}>{t.restartButton}</Button>
              </div>
            </div>
          </div>
        }
      />
    )
  }

  return (
    <WizardShell
      sideRail={sideRail}
      center={
        <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border bg-card text-card-foreground shadow-sm">
          <div className="shrink-0 space-y-3 border-b p-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>
                {t.stepLabel} {wizard.stepIndex + 1} {t.ofLabel} {wizard.totalSteps}
              </span>
              <span>{wizard.progress.toFixed(0)}%</span>
            </div>
            <Progress value={wizard.progress} />
            <div className="flex items-start gap-2">
              <h2 className="text-lg font-semibold leading-snug">
                {wizard.currentAttribute.label[language]}
              </h2>
              {wizard.currentAttribute.sensitive ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="mt-0.5 shrink-0 text-muted-foreground">
                      <Info size={16} aria-hidden />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{t.noAnswerHint}</TooltipContent>
                </Tooltip>
              ) : null}
            </div>
            <p className="text-sm text-muted-foreground">
              {wizard.currentAttribute.description?.[language] ?? t.selectPrompt}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <div className="space-y-5">
              {wizard.currentAttribute.ui === "searchable_select" ? (
                <SearchableSelect
                  value={currentAnswer}
                  placeholder={t.selectPrompt}
                  emptyText={t.noSearchResult}
                  options={wizard.currentAttribute.values.map((value) => ({
                    id: value.id,
                    label: value.label[language],
                  }))}
                  onSelect={(valueId) => {
                    wizard.selectValue(wizard.currentAttribute.id, valueId)
                    wizard.goNext()
                  }}
                />
              ) : (
                <RadioGroup
                  value={currentAnswer}
                  onValueChange={(value) => {
                    wizard.selectValue(wizard.currentAttribute.id, value)
                    wizard.goNext()
                  }}
                >
                  {wizard.currentAttribute.values.map((value) => (
                    <label
                      key={value.id}
                      className="flex cursor-pointer items-center gap-3 rounded-lg border p-3 hover:bg-muted/50"
                      onClick={() => {
                        if (currentAnswer === value.id) {
                          wizard.goNext()
                        }
                      }}
                    >
                      <RadioGroupItem value={value.id} id={value.id} />
                      <span>{value.label[language]}</span>
                    </label>
                  ))}
                </RadioGroup>
              )}
            </div>
          </div>
          <div className="shrink-0 border-t bg-card px-4 py-3">
            <Separator className="mb-3 lg:hidden" />
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={wizard.goBack} disabled={wizard.stepIndex === 0}>
                {t.backButton}
              </Button>
              <Button
                variant="default"
                onClick={() => {
                  wizard.skipCurrent()
                  wizard.goNext()
                }}
              >
                {t.skipButton}
              </Button>
            </div>
          </div>
        </div>
      }
    />
  )
}
