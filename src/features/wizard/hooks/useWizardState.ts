import { useMemo, useState } from "react"

import type { PopulationDataset } from "@/data/schema"
import type { UserAnswers } from "@/features/estimator/estimate"

export function useWizardState(dataset: PopulationDataset) {
  const [stepIndex, setStepIndex] = useState(0)
  const [answers, setAnswers] = useState<UserAnswers>({})
  const [isComplete, setIsComplete] = useState(false)

  const totalSteps = dataset.attributes.length
  const currentAttribute = dataset.attributes[stepIndex]

  const progress = useMemo(() => {
    if (totalSteps === 0) {
      return 0
    }
    return ((stepIndex + 1) / totalSteps) * 100
  }, [stepIndex, totalSteps])

  const selectValue = (attributeId: string, valueId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [attributeId]: valueId,
    }))
  }

  const skipCurrent = () => {
    setAnswers((prev) => {
      const next = { ...prev }
      delete next[currentAttribute.id]
      return next
    })
  }

  const goNext = () => {
    if (stepIndex === totalSteps - 1) {
      setIsComplete(true)
      return
    }
    setStepIndex((current) => current + 1)
  }

  const goBack = () => {
    setIsComplete(false)
    setStepIndex((current) => Math.max(0, current - 1))
  }

  const restart = () => {
    setAnswers({})
    setStepIndex(0)
    setIsComplete(false)
  }

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
