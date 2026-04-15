export const supportedLanguages = ["en", "tr"] as const

export type Language = (typeof supportedLanguages)[number]

export type Dictionary = {
  appTitle: string
  /** Browser tab title */
  documentTitle: string
  /** `meta name="description"` for SEO and link previews */
  metaDescription: string
  appSubtitle: string
  languageLabel: string
  themeLabel: string
  themeLight: string
  themeDark: string
  stepLabel: string
  ofLabel: string
  nextButton: string
  backButton: string
  skipButton: string
  finishButton: string
  restartButton: string
  selectPrompt: string
  noSearchResult: string
  resultTitle: string
  resultDescription: string
  estimatedPeople: string
  confidenceLabel: string
  confidenceLow: string
  confidenceMedium: string
  confidenceHigh: string
  rangeLabel: string
  assumptionsTitle: string
  assumptionsBody: string
  sourceLabel: string
  yearLabel: string
  choicesSoFarTitle: string
  skippedStepLabel: string
  progressPersistHint: string
  noAnswersYet: string
  liveEstimateTitle: string
}

export type TranslationMap = Record<Language, string>
