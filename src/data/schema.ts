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
  countryCode: string
  version: string
  worldPopulation: number
  asOfYear: number
  alpha: number
  minProbabilityFloor: number
  attributes: DatasetAttribute[]
}

export type CountryCatalogEntry = {
  code: string
  label: TranslationMap
  datasetVersion: string
  datasetAsOfYear: number
  sourceCoverageScore?: number
  lastUpdated?: string
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
  if (typeof raw.countryCode !== "string" || raw.countryCode.length === 0) {
    throw new Error("countryCode must be a non-empty string")
  }
  if (typeof raw.version !== "string" || raw.version.length === 0) {
    throw new Error("version must be a non-empty string")
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
    countryCode: raw.countryCode.toLowerCase(),
    version: raw.version,
    worldPopulation: raw.worldPopulation,
    asOfYear: raw.asOfYear,
    alpha,
    minProbabilityFloor,
    attributes: raw.attributes.map(parseAttribute),
  }
}

export function parseCountryCatalog(raw: unknown): CountryCatalogEntry[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("Country catalog must be a non-empty array")
  }

  return raw.map((item, index) => {
    if (!isObject(item)) {
      throw new Error(`Country catalog item[${index}] must be object`)
    }
    if (typeof item.code !== "string" || item.code.length === 0) {
      throw new Error(`Country catalog item[${index}].code must be non-empty string`)
    }
    if (!isLanguageMap(item.label)) {
      throw new Error(`Country catalog item[${index}].label must contain en and tr`)
    }
    if (typeof item.datasetVersion !== "string" || item.datasetVersion.length === 0) {
      throw new Error(`Country catalog item[${index}].datasetVersion must be non-empty string`)
    }
    if (typeof item.datasetAsOfYear !== "number") {
      throw new Error(`Country catalog item[${index}].datasetAsOfYear must be number`)
    }

    return {
      code: item.code.toLowerCase(),
      label: item.label,
      datasetVersion: item.datasetVersion,
      datasetAsOfYear: item.datasetAsOfYear,
      sourceCoverageScore:
        typeof item.sourceCoverageScore === "number" ? item.sourceCoverageScore : undefined,
      lastUpdated: typeof item.lastUpdated === "string" ? item.lastUpdated : undefined,
    }
  })
}
