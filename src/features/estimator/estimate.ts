import type { PopulationDataset } from "@/data/schema"

export type UserAnswers = Record<string, string | undefined>

export type EstimateConfidence = "low" | "medium" | "high"

export type EstimateResult = {
  expectedCount: number
  lowCount: number
  highCount: number
  probability: number
  selectedAttributes: number
  totalAttributes: number
  confidence: EstimateConfidence
  notes: string[]
}

export function estimateHowManyLikeMe(
  dataset: PopulationDataset,
  answers: UserAnswers
): EstimateResult {
  const notes: string[] = []
  const selected = dataset.attributes
    .map((attribute) => {
      const selectedValueId = answers[attribute.id]
      if (!selectedValueId) {
        return null
      }

      const value = attribute.values.find((item) => item.id === selectedValueId)
      if (!value) {
        notes.push(`Missing frequency for ${attribute.id}=${selectedValueId}`)
        return null
      }

      return { attribute, value }
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  if (selected.length === 0) {
    return {
      expectedCount: dataset.worldPopulation,
      lowCount: dataset.worldPopulation,
      highCount: dataset.worldPopulation,
      probability: 1,
      selectedAttributes: 0,
      totalAttributes: dataset.attributes.length,
      confidence: "low",
      notes: ["No attributes selected. Showing global population baseline."],
    }
  }

  const probabilityRaw = selected.reduce((acc, item) => {
    const weight = item.attribute.weight ?? 1
    const baseProbability = Math.max(item.value.p, dataset.minProbabilityFloor)
    return acc * Math.pow(baseProbability, weight)
  }, 1)

  const lowRaw = selected.reduce((acc, item) => {
    const weight = item.attribute.weight ?? 1
    const ciLow = item.value.ci95?.[0] ?? Math.max(item.value.p * 0.85, 0)
    return acc * Math.pow(Math.max(ciLow, dataset.minProbabilityFloor), weight)
  }, 1)

  const highRaw = selected.reduce((acc, item) => {
    const weight = item.attribute.weight ?? 1
    const ciHigh = item.value.ci95?.[1] ?? Math.min(item.value.p * 1.15, 1)
    return acc * Math.pow(Math.max(ciHigh, dataset.minProbabilityFloor), weight)
  }, 1)

  const probability = Math.max(
    Math.pow(probabilityRaw, dataset.alpha),
    dataset.minProbabilityFloor
  )
  const lowProbability = Math.max(
    Math.min(Math.pow(lowRaw, dataset.alpha), Math.pow(highRaw, dataset.alpha)),
    dataset.minProbabilityFloor
  )
  const highProbability = Math.max(
    Math.max(Math.pow(lowRaw, dataset.alpha), Math.pow(highRaw, dataset.alpha)),
    dataset.minProbabilityFloor
  )

  const expectedCount = dataset.worldPopulation * probability
  let lowCount = dataset.worldPopulation * lowProbability
  let highCount = dataset.worldPopulation * highProbability

  if (expectedCount < 1) {
    notes.push("Result is extremely rare. Interpreting as below one person on average.")
    lowCount = Math.max(lowCount, 0.1)
    highCount = Math.max(highCount, 1)
  }

  const coverage = selected.length / dataset.attributes.length
  const uncertaintyRatio = highCount / Math.max(lowCount, 1e-9)
  const confidence: EstimateConfidence =
    coverage >= 0.7 && uncertaintyRatio <= 4
      ? "high"
      : coverage >= 0.4 && uncertaintyRatio <= 10
        ? "medium"
        : "low"

  return {
    expectedCount,
    lowCount,
    highCount,
    probability,
    selectedAttributes: selected.length,
    totalAttributes: dataset.attributes.length,
    confidence,
    notes,
  }
}
