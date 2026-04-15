import { describe, expect, it } from "vitest"

import { estimateHowManyLikeMe } from "@/features/estimator/estimate"
import type { PopulationDataset } from "@/data/schema"

const dataset: PopulationDataset = {
  worldPopulation: 1_000_000_000,
  asOfYear: 2026,
  alpha: 0.9,
  minProbabilityFloor: 1e-12,
  attributes: [
    {
      id: "a",
      label: { en: "A", tr: "A" },
      values: [
        { id: "x", label: { en: "X", tr: "X" }, p: 0.5 },
        { id: "y", label: { en: "Y", tr: "Y" }, p: 0.5 },
      ],
    },
    {
      id: "b",
      label: { en: "B", tr: "B" },
      values: [{ id: "x", label: { en: "X", tr: "X" }, p: 0.2 }],
    },
  ],
}

describe("estimateHowManyLikeMe", () => {
  it("returns baseline when no answers are selected", () => {
    const result = estimateHowManyLikeMe(dataset, {})
    expect(result.expectedCount).toBe(dataset.worldPopulation)
    expect(result.selectedAttributes).toBe(0)
    expect(result.confidence).toBe("low")
  })

  it("computes lower number for more specific answers", () => {
    const aOnly = estimateHowManyLikeMe(dataset, { a: "x" })
    const aAndB = estimateHowManyLikeMe(dataset, { a: "x", b: "x" })
    expect(aAndB.expectedCount).toBeLessThan(aOnly.expectedCount)
  })

  it("ignores unknown values safely", () => {
    const result = estimateHowManyLikeMe(dataset, { a: "does_not_exist" })
    expect(result.notes.length).toBeGreaterThan(0)
    expect(result.selectedAttributes).toBe(0)
  })
})
