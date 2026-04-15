import { Info } from "@phosphor-icons/react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
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
import { WizardOptionCard } from "@/features/wizard/WizardOptionCard"
import { useI18n } from "@/i18n/useI18n"
import { fadeSlideVariants, springSoft } from "@/lib/motion-presets"

const wizardSurfaceClass =
  "flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border/80 bg-card/95 text-card-foreground shadow-lg ring-1 ring-foreground/5 backdrop-blur-md dark:bg-card/90"

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
  const reduced = useReducedMotion()
  const wizard = useWizardState(populationDataset)
  const currentAnswer = wizard.answers[wizard.currentAttribute.id] ?? ""
  const estimate = estimateHowManyLikeMe(populationDataset, wizard.answers)
  const stepVariants = fadeSlideVariants(reduced ?? undefined)
  const transition = springSoft(reduced ?? undefined)

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
          <div className={wizardSurfaceClass}>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <AnimatePresence mode="wait">
                <motion.div
                  key="complete"
                  initial={reduced ? false : "initial"}
                  animate="animate"
                  exit="exit"
                  variants={stepVariants}
                  transition={transition}
                  className="space-y-4"
                >
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
                </motion.div>
              </AnimatePresence>
            </div>
            <div className="bg-card/80 shrink-0 border-t border-border/60 px-4 py-3 backdrop-blur-sm">
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
        <div className={wizardSurfaceClass}>
          <div className="from-primary/[0.06] shrink-0 space-y-3 border-b border-border/60 bg-gradient-to-br to-transparent p-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span className="font-medium tracking-wide">
                {t.stepLabel} {wizard.stepIndex + 1} {t.ofLabel} {wizard.totalSteps}
              </span>
              <span className="font-mono tabular-nums">{wizard.progress.toFixed(0)}%</span>
            </div>
            <Progress value={wizard.progress} />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={wizard.currentAttribute.id}
                initial={reduced ? false : "initial"}
                animate="animate"
                exit="exit"
                variants={stepVariants}
                transition={transition}
                className="space-y-5"
              >
                <div className="flex items-start gap-2">
                  <h2 className="font-heading text-balance text-lg font-semibold leading-snug tracking-tight">
                    {wizard.currentAttribute.label[language]}
                  </h2>
                  {wizard.currentAttribute.sensitive ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-foreground mt-0.5 shrink-0 transition-colors"
                        >
                          <Info size={18} aria-hidden />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>{t.noAnswerHint}</TooltipContent>
                    </Tooltip>
                  ) : null}
                </div>
                <p className="text-pretty text-sm text-muted-foreground">
                  {wizard.currentAttribute.description?.[language] ?? t.selectPrompt}
                </p>
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
                    className="gap-2.5"
                    value={currentAnswer}
                    onValueChange={(value) => {
                      wizard.selectValue(wizard.currentAttribute.id, value)
                      wizard.goNext()
                    }}
                  >
                    {wizard.currentAttribute.values.map((value) => {
                      const selected = currentAnswer === value.id
                      return (
                        <WizardOptionCard
                          key={value.id}
                          selected={selected}
                          label={value.label[language]}
                          onActivateSelected={() => {
                            if (selected) {
                              wizard.goNext()
                            }
                          }}
                        >
                          <RadioGroupItem value={value.id} id={value.id} />
                        </WizardOptionCard>
                      )
                    })}
                  </RadioGroup>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
          <div className="bg-card/80 shrink-0 border-t border-border/60 px-4 py-3 backdrop-blur-sm">
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
