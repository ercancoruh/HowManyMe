import type { PopulationDataset } from "@/data/schema"
import type { UserAnswers } from "@/features/estimator/estimate"

export const WIZARD_STORAGE_KEY = "howmanyme.wizard.v1"

export type WizardPersisted = {
  v: 1
  datasetStamp: string
  stepIndex: number
  isComplete: boolean
  answers: UserAnswers
}

export function datasetStamp(dataset: PopulationDataset): string {
  return `${dataset.asOfYear}-${dataset.attributes.map((a) => a.id).join("|")}`
}

export function loadWizardPersisted(dataset: PopulationDataset): WizardPersisted | null {
  if (typeof sessionStorage === "undefined") {
    return null
  }
  try {
    const raw = sessionStorage.getItem(WIZARD_STORAGE_KEY)
    if (!raw) return null
    const p = JSON.parse(raw) as WizardPersisted
    if (p.v !== 1 || p.datasetStamp !== datasetStamp(dataset)) {
      return null
    }
    if (typeof p.stepIndex !== "number" || p.stepIndex < 0) return null
    if (typeof p.isComplete !== "boolean") return null
    if (!p.answers || typeof p.answers !== "object") return null
    return p
  } catch {
    return null
  }
}

export function saveWizardPersisted(data: WizardPersisted): void {
  if (typeof sessionStorage === "undefined") {
    return
  }
  try {
    sessionStorage.setItem(WIZARD_STORAGE_KEY, JSON.stringify(data))
  } catch {
    // quota or private mode
  }
}

export function clearWizardPersisted(): void {
  if (typeof sessionStorage === "undefined") {
    return
  }
  try {
    sessionStorage.removeItem(WIZARD_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export type WizardHistoryState = {
  stepIndex: number
  isComplete: boolean
}

export function readWizardUrl(): Partial<WizardHistoryState> {
  if (typeof location === "undefined") return {}
  const u = new URLSearchParams(location.search)
  if (u.get("view") === "result") {
    return { isComplete: true }
  }
  const s = u.get("step")
  if (s === null || s === "") return {}
  const n = Number.parseInt(s, 10)
  if (Number.isNaN(n) || n < 0) return {}
  return { stepIndex: n, isComplete: false }
}

function clampStep(step: number, totalSteps: number): number {
  if (totalSteps <= 0) return 0
  return Math.min(Math.max(0, step), totalSteps - 1)
}

/** First load: sessionStorage wins; then shallow URL hints if nothing stored. */
export function resolveWizardInitialState(
  dataset: PopulationDataset,
): WizardHistoryState & { answers: UserAnswers } {
  const total = dataset.attributes.length
  const persisted = loadWizardPersisted(dataset)
  const url = readWizardUrl()

  if (persisted) {
    let stepIndex = clampStep(persisted.stepIndex, total)
    const { isComplete } = persisted
    if (isComplete && total > 0) {
      stepIndex = total - 1
    }
    if (!isComplete && stepIndex >= total) {
      stepIndex = Math.max(0, total - 1)
    }
    return {
      stepIndex,
      isComplete,
      answers: persisted.answers,
    }
  }

  if (url.isComplete === true && total > 0) {
    return { stepIndex: total - 1, isComplete: true, answers: {} }
  }
  if (typeof url.stepIndex === "number") {
    return {
      stepIndex: clampStep(url.stepIndex, total),
      isComplete: false,
      answers: {},
    }
  }

  return { stepIndex: 0, isComplete: false, answers: {} }
}

export function wizardSearchUrl(state: WizardHistoryState): string {
  if (state.isComplete) {
    return "?view=result"
  }
  return `?step=${state.stepIndex}`
}

export function replaceWizardHistory(state: WizardHistoryState): void {
  if (typeof window === "undefined") return
  window.history.replaceState(state, "", wizardSearchUrl(state))
}

export function pushWizardHistory(state: WizardHistoryState): void {
  if (typeof window === "undefined") return
  window.history.pushState(state, "", wizardSearchUrl(state))
}
