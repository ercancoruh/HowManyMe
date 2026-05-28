import { describe, expect, it } from "vitest"

import { countryCatalog, defaultCountryCode, getDatasetForCountry } from "@/data"

describe("country datasets", () => {
  it("loads country catalog", () => {
    expect(countryCatalog.length).toBeGreaterThan(0)
  })

  it("returns fallback dataset for unknown country code", () => {
    const fallback = getDatasetForCountry(defaultCountryCode)
    const unknown = getDatasetForCountry("zz_non_existing")

    expect(unknown.countryCode).toBe(fallback.countryCode)
    expect(unknown.version).toBe(fallback.version)
  })
})
