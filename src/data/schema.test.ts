import { describe, expect, it } from "vitest"

import { parseCountryCatalog, parsePopulationDataset } from "@/data/schema"

describe("parsePopulationDataset", () => {
  it("parses valid country dataset", () => {
    const dataset = parsePopulationDataset({
      countryCode: "tr",
      version: "v1",
      worldPopulation: 1_000_000,
      asOfYear: 2023,
      alpha: 0.9,
      minProbabilityFloor: 1e-12,
      attributes: [
        {
          id: "age_band",
          label: { en: "Age", tr: "Yas" },
          values: [{ id: "age_0_4", label: { en: "0-4", tr: "0-4" }, p: 1 }],
        },
      ],
    })

    expect(dataset.countryCode).toBe("tr")
    expect(dataset.version).toBe("v1")
    expect(dataset.attributes).toHaveLength(1)
  })

  it("throws when countryCode/version missing", () => {
    expect(() =>
      parsePopulationDataset({
        worldPopulation: 1_000_000,
        asOfYear: 2023,
        alpha: 0.9,
        minProbabilityFloor: 1e-12,
        attributes: [],
      }),
    ).toThrow()
  })
})

describe("parseCountryCatalog", () => {
  it("parses valid country catalog", () => {
    const catalog = parseCountryCatalog([
      {
        code: "tr",
        label: { en: "Turkiye", tr: "Turkiye" },
        datasetVersion: "abc123",
        datasetAsOfYear: 2023,
      },
    ])

    expect(catalog[0]?.code).toBe("tr")
    expect(catalog[0]?.datasetVersion).toBe("abc123")
  })
})
