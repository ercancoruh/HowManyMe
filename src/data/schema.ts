import type { Language, TranslationMap } from "@/i18n/types"

export type DatasetValue = {
  id: string
  label: TranslationMap
  p: number
  ci95?: [number, number]
}

export type DatasetAttribute = {
  id: string
  label: TranslationMap
  ui?: "radio" | "searchable_select"
  description?: TranslationMap
  values: DatasetValue[]
  optional?: boolean
  sensitive?: boolean
  source?: string
  year?: number
  weight?: number
}

export type PopulationDataset = {
  worldPopulation: number
  asOfYear: number
  alpha: number
  minProbabilityFloor: number
  attributes: DatasetAttribute[]
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function isLanguageMap(value: unknown): value is TranslationMap {
  if (!isObject(value)) {
    return false
  }

  const languages: Language[] = ["en", "tr"]
  return languages.every((language) => typeof value[language] === "string")
}

function assertProbability(value: unknown, context: string): number {
  if (typeof value !== "number" || Number.isNaN(value) || value < 0 || value > 1) {
    throw new Error(`${context} must be a probability between 0 and 1`)
  }

  return value
}

function parseValue(raw: unknown, index: number, attrId: string): DatasetValue {
  if (!isObject(raw)) {
    throw new Error(`attributes[${attrId}].values[${index}] must be an object`)
  }

  if (typeof raw.id !== "string") {
    throw new Error(`attributes[${attrId}].values[${index}].id must be string`)
  }
  if (!isLanguageMap(raw.label)) {
    throw new Error(
      `attributes[${attrId}].values[${index}].label must contain en and tr`
    )
  }

  const p = assertProbability(raw.p, `attributes[${attrId}].values[${index}].p`)

  let ci95: [number, number] | undefined
  if (raw.ci95 !== undefined) {
    if (
      !Array.isArray(raw.ci95) ||
      raw.ci95.length !== 2 ||
      typeof raw.ci95[0] !== "number" ||
      typeof raw.ci95[1] !== "number"
    ) {
      throw new Error(
        `attributes[${attrId}].values[${index}].ci95 must be [number, number]`
      )
    }
    ci95 = [raw.ci95[0], raw.ci95[1]]
  }

  return {
    id: raw.id,
    label: raw.label,
    p,
    ci95,
  }
}

function parseAttribute(raw: unknown, index: number): DatasetAttribute {
  if (!isObject(raw)) {
    throw new Error(`attributes[${index}] must be an object`)
  }
  const attributeId = raw.id
  if (typeof attributeId !== "string") {
    throw new Error(`attributes[${index}].id must be string`)
  }
  if (!isLanguageMap(raw.label)) {
    throw new Error(`attributes[${index}].label must contain en and tr`)
  }
  if (!Array.isArray(raw.values) || raw.values.length === 0) {
    throw new Error(`attributes[${index}].values must be a non-empty array`)
  }

  const values = raw.values.map((value, valueIndex) =>
    parseValue(value, valueIndex, attributeId)
  )

  return {
    id: attributeId,
    label: raw.label,
    ui:
      raw.ui === "searchable_select" || raw.ui === "radio"
        ? raw.ui
        : "radio",
    description: isLanguageMap(raw.description) ? raw.description : undefined,
    values,
    optional: typeof raw.optional === "boolean" ? raw.optional : false,
    sensitive: typeof raw.sensitive === "boolean" ? raw.sensitive : false,
    source: typeof raw.source === "string" ? raw.source : undefined,
    year: typeof raw.year === "number" ? raw.year : undefined,
    weight: typeof raw.weight === "number" ? raw.weight : 1,
  }
}

export function parsePopulationDataset(raw: unknown): PopulationDataset {
  if (!isObject(raw)) {
    throw new Error("Dataset must be an object")
  }
  if (typeof raw.worldPopulation !== "number" || raw.worldPopulation <= 0) {
    throw new Error("worldPopulation must be a positive number")
  }
  if (typeof raw.asOfYear !== "number") {
    throw new Error("asOfYear must be a number")
  }

  const alpha = assertProbability(raw.alpha, "alpha")
  if (alpha === 0) {
    throw new Error("alpha must be greater than 0")
  }
  const minProbabilityFloor = assertProbability(
    raw.minProbabilityFloor,
    "minProbabilityFloor"
  )
  if (minProbabilityFloor === 0) {
    throw new Error("minProbabilityFloor must be greater than 0")
  }
  if (!Array.isArray(raw.attributes) || raw.attributes.length === 0) {
    throw new Error("attributes must be a non-empty array")
  }

  return {
    worldPopulation: raw.worldPopulation,
    asOfYear: raw.asOfYear,
    alpha,
    minProbabilityFloor,
    attributes: raw.attributes.map(parseAttribute),
  }
}
