import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

type CountryIndexEntry = {
  code: string
  sourceCoverageScore: number
}

type DatasetAttribute = {
  id: string
  source?: string
  year?: number
}

type CountryDataset = {
  countryCode: string
  attributes: DatasetAttribute[]
}

const root = process.cwd()
const countriesDir = join(root, "src", "data", "countries")
const indexPath = join(countriesDir, "index.json")
const reportJsonPath = join(root, "src", "data", "quality-report.json")
const reportMdPath = join(root, "src", "data", "quality-report.md")

const SOURCE_RULES: Record<string, RegExp[]> = {
  age_band: [/World Bank WDI/i],
  sex: [/World Bank WDI/i],
  smoker_status: [/World Bank WDI/i],
  alcohol_status: [/World Bank WDI/i],
  religion: [/Pew/i, /OWID/i],
  mobile_os: [/StatCounter/i],
  education_level: [/UNESCO/i, /World Bank WDI/i],
}

const TRAITS = [
  "age_band",
  "sex",
  "smoker_status",
  "alcohol_status",
  "religion",
  "mobile_os",
  "education_level",
  "marital_status",
  "eye_color",
  "hair_color",
  "diet_type",
  "pet_ownership",
  "blood_type",
  "height_band",
] as const

function isRealSource(attributeId: string, source?: string): boolean {
  const rules = SOURCE_RULES[attributeId]
  if (!rules || !source) return false
  return rules.every((rule) => rule.test(source))
}

function main(): void {
  const index = JSON.parse(readFileSync(indexPath, "utf8")) as CountryIndexEntry[]
  const perTrait = Object.fromEntries(
    TRAITS.map((trait) => [trait, { total: 0, realSource: 0, fallbackOrSynthetic: 0 }]),
  ) as Record<(typeof TRAITS)[number], { total: number; realSource: number; fallbackOrSynthetic: number }>

  const lowCoverageCountries: { code: string; sourceCoverageScore: number }[] = []
  const countryDetails: Array<{
    code: string
    sourceCoverageScore: number
    realSourceTraits: string[]
    fallbackTraits: string[]
  }> = []

  for (const entry of index) {
    const datasetPath = join(countriesDir, entry.code, "attributes.json")
    const dataset = JSON.parse(readFileSync(datasetPath, "utf8")) as CountryDataset
    const attrMap = new Map(dataset.attributes.map((attr) => [attr.id, attr]))

    const realSourceTraits: string[] = []
    const fallbackTraits: string[] = []

    for (const trait of TRAITS) {
      const attr = attrMap.get(trait)
      if (!attr) continue
      perTrait[trait].total += 1
      if (isRealSource(trait, attr.source)) {
        perTrait[trait].realSource += 1
        realSourceTraits.push(trait)
      } else {
        perTrait[trait].fallbackOrSynthetic += 1
        fallbackTraits.push(trait)
      }
    }

    if (entry.sourceCoverageScore < 0.9) {
      lowCoverageCountries.push({
        code: entry.code,
        sourceCoverageScore: entry.sourceCoverageScore,
      })
    }

    countryDetails.push({
      code: entry.code,
      sourceCoverageScore: entry.sourceCoverageScore,
      realSourceTraits,
      fallbackTraits,
    })
  }

  const traitCoverage = Object.fromEntries(
    Object.entries(perTrait).map(([trait, stats]) => [
      trait,
      {
        ...stats,
        realSourceRate: stats.total === 0 ? 0 : Number((stats.realSource / stats.total).toFixed(4)),
      },
    ]),
  )

  const summary = {
    generatedAt: new Date().toISOString(),
    totalCountries: index.length,
    countriesBelowCoverage09: lowCoverageCountries.length,
    lowCoverageCountries: lowCoverageCountries.sort((a, b) => a.sourceCoverageScore - b.sourceCoverageScore),
    traitCoverage,
  }

  writeFileSync(
    reportJsonPath,
    JSON.stringify(
      {
        summary,
        countries: countryDetails,
      },
      null,
      2,
    ) + "\n",
    "utf8",
  )

  const topWeakTraits = Object.entries(traitCoverage)
    .sort((a, b) => a[1].realSourceRate - b[1].realSourceRate)
    .slice(0, 6)
    .map((row) => `- ${row[0]}: ${(row[1].realSourceRate * 100).toFixed(1)}% real-source`)
    .join("\n")

  const markdown = `# Data Quality Report

- Generated at: ${summary.generatedAt}
- Total countries: ${summary.totalCountries}
- Countries with sourceCoverageScore < 0.90: ${summary.countriesBelowCoverage09}

## Weakest Traits By Real-Source Rate
${topWeakTraits}
`

  writeFileSync(reportMdPath, markdown, "utf8")
  console.log("Wrote", reportJsonPath)
  console.log("Wrote", reportMdPath)
}

main()
