import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"

import type { PopulationDataset } from "@/data/schema"
import type { UserAnswers } from "@/features/estimator/estimate"
import {
  clearWizardPersisted,
  datasetStamp,
  pushWizardHistory,
  replaceWizardHistory,
  resolveWizardInitialState,
  saveWizardPersisted,
} from "@/features/wizard/persist"

function clampStep(step: number, totalSteps: number): number {
  if (totalSteps <= 0) return 0
  return Math.min(Math.max(0, step), totalSteps - 1)
}

export function useWizardState(dataset: PopulationDataset) {
  const totalSteps = dataset.attributes.length
  const stamp = datasetStamp(dataset)

  const [snapshot] = useState(() => resolveWizardInitialState(dataset))
  const [stepIndex, setStepIndex] = useState(snapshot.stepIndex)
  const [answers, setAnswers] = useState<UserAnswers>(snapshot.answers)
  const [isComplete, setIsComplete] = useState(snapshot.isComplete)

  const historySeeded = useRef(false)

  useLayoutEffect(() => {
    if (typeof window === "undefined" || historySeeded.current) return
    historySeeded.current = true
    replaceWizardHistory({ stepIndex: snapshot.stepIndex, isComplete: snapshot.isComplete })
  }, [snapshot.stepIndex, snapshot.isComplete])

  useEffect(() => {
    const onPop = (event: PopStateEvent) => {
      const st = event.state as { stepIndex?: number; isComplete?: boolean } | null
      if (!st || typeof st.stepIndex !== "number" || typeof st.isComplete !== "boolean") {
        return
      }
      setStepIndex(clampStep(st.stepIndex, totalSteps))
      setIsComplete(st.isComplete)
    }
    window.addEventListener("popstate", onPop)
    return () => window.removeEventListener("popstate", onPop)
  }, [totalSteps])

  useEffect(() => {
    saveWizardPersisted({
      v: 1,
      datasetStamp: stamp,
      stepIndex,
      isComplete,
      answers,
    })
  }, [stamp, stepIndex, isComplete, answers])

  const currentAttribute = dataset.attributes[clampStep(stepIndex, totalSteps)]

  const progress = useMemo(() => {
    if (totalSteps === 0) return 0
    if (isComplete) return 100
    return ((stepIndex + 1) / totalSteps) * 100
  }, [stepIndex, totalSteps, isComplete])

  const selectValue = useCallback((attributeId: string, valueId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [attributeId]: valueId,
    }))
  }, [])

  const skipCurrent = useCallback(() => {
    const id = dataset.attributes[clampStep(stepIndex, totalSteps)]?.id
    if (!id) return
    setAnswers((prev) => {
      const next = { ...prev }
      delete next[id]
      return next
    })
  }, [dataset.attributes, stepIndex, totalSteps])

  const goNext = useCallback(() => {
    if (totalSteps === 0) return
    if (stepIndex >= totalSteps - 1) {
      setIsComplete(true)
      pushWizardHistory({ stepIndex: totalSteps - 1, isComplete: true })
      return
    }
    const next = stepIndex + 1
    setStepIndex(next)
    pushWizardHistory({ stepIndex: next, isComplete: false })
  }, [stepIndex, totalSteps])

  const goBack = useCallback(() => {
    if (typeof window === "undefined") return
    if (stepIndex <= 0 && !isComplete) return
    window.history.back()
  }, [stepIndex, isComplete])

  const restart = useCallback(() => {
    setAnswers({})
    setStepIndex(0)
    setIsComplete(false)
    clearWizardPersisted()
    replaceWizardHistory({ stepIndex: 0, isComplete: false })
  }, [])

  return {
    stepIndex,
    totalSteps,
    currentAttribute,
    answers,
    progress,
    isComplete,
    selectValue,
    skipCurrent,
    goNext,
    goBack,
    restart,
  }
}
