/**
 * Rebuilds src/data/attributes.json with sourced priors for country, age, world total,
 * and literature-based marginals for other traits. Run from repo root:
 *   npx tsx scripts/build-attributes.mts
 */
import { createHash } from "node:crypto"
import { readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const attrsPath = join(root, "src", "data", "attributes.json")
const sourcesDir = join(root, "src", "data", "sources")
const lockPath = join(sourcesDir, "sources.lock.json")
const wbPath = join(sourcesDir, "world_bank_population_2023_snapshot.json")
const owidPath = join(sourcesDir, "owid_world_broad_age_2023.csv")

/** World Bank `country.value` keys (lower case) for rows where label.en differs. */
const WB_NAME_BY_APP_ID: Record<string, string> = {
  bahamas: "bahamas, the",
  brunei: "brunei darussalam",
  congo: "congo, rep.",
  democratic_republic_of_the_congo: "congo, dem. rep.",
  egypt: "egypt, arab rep.",
  gambia: "gambia, the",
  iran: "iran, islamic rep.",
  kyrgyzstan: "kyrgyz republic",
  laos: "lao pdr",
  micronesia: "micronesia, fed. sts.",
  north_korea: "korea, dem. people's rep.",
  palestine: "west bank and gaza",
  russia: "russian federation",
  saint_kitts_and_nevis: "st. kitts and nevis",
  saint_lucia: "st. lucia",
  saint_vincent_and_the_grenadines: "st. vincent and the grenadines",
  slovakia: "slovak republic",
  somalia: "somalia, fed. rep.",
  south_korea: "korea, rep.",
  syria: "syrian arab republic",
  turkiye: "turkiye",
  venezuela: "venezuela, rb",
  vietnam: "viet nam",
  yemen: "yemen, rep.",
}

/** UN / CIA order-of-magnitude estimate when WB omits the area (Holy See). */
const POPULATION_OVERRIDE: Record<string, number> = {
  vatican_city: 762,
}

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1
  const ax = Math.abs(x)
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911
  const t = 1 / (1 + p * ax)
  const y =
    1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax)
  return sign * y
}

function normCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2))
}

function heightProbabilities(): { id: string; p: number }[] {
  const mu = 164.7
  const sigma = 11.35
  const out: { id: string; p: number }[] = []
  out.push({ id: "under_120", p: normCdf((120.5 - mu) / sigma) })
  for (let cm = 120; cm <= 200; cm++) {
    const low = (cm - 0.5 - mu) / sigma
    const high = (cm + 0.5 - mu) / sigma
    out.push({ id: `height_${cm}`, p: normCdf(high) - normCdf(low) })
  }
  out.push({ id: "height_200_plus", p: 1 - normCdf((200.5 - mu) / sigma) })
  const s = out.reduce((a, x) => a + x.p, 0)
  return out.map((x) => ({ id: x.id, p: x.p / s }))
}

function verifyLockHashes(): void {
  const lock = JSON.parse(readFileSync(lockPath, "utf8")) as {
    files: { path: string; sha256: string }[]
  }
  for (const f of lock.files) {
    const full = join(sourcesDir, f.path)
    const hash = createHash("sha256").update(readFileSync(full)).digest("hex")
    if (hash !== f.sha256) {
      throw new Error(
        `sources.lock.json sha256 mismatch for ${f.path}: expected ${f.sha256}, got ${hash}. Update the lock file after refreshing sources.`,
      )
    }
  }
}

function parseOwidWorldRow(): {
  p65: number
  p25_64: number
  p15_24: number
  p5_14: number
  p0_4: number
  total: number
} {
  const text = readFileSync(owidPath, "utf8").trim().split(/\r?\n/)
  const header = text[0].split(",")
  const row = text[1].split(",")
  const idx = (name: string) => header.indexOf(name)
  const p65 = Number(row[idx("population__sex_all__age_65plus__variant_estimates")])
  const p25_64 = Number(row[idx("population__sex_all__age_25_64__variant_estimates")])
  const p15_24 = Number(row[idx("population__sex_all__age_15_24__variant_estimates")])
  const p5_14 = Number(row[idx("population__sex_all__age_5_14__variant_estimates")])
  const p0_4 = Number(row[idx("population__sex_all__age_0_4__variant_estimates")])
  const total = p65 + p25_64 + p15_24 + p5_14 + p0_4
  return { p65, p25_64, p15_24, p5_14, p0_4, total }
}

function ageSharesFromBroadBands(o: ReturnType<typeof parseOwidWorldRow>): Record<string, number> {
  const { p65, p25_64, p15_24, p5_14, p0_4, total } = o
  const s: Record<string, number> = {}
  s.under_18 = (p0_4 + p5_14 + (3 / 10) * p15_24) / total
  for (let a = 18; a <= 24; a++) s[`age_${a}`] = (p15_24 / 10) / total
  for (let a = 25; a <= 59; a++) s[`age_${a}`] = (p25_64 / 40) / total
  s.age_60_plus = ((5 / 40) * p25_64 + p65) / total
  return s
}

function normalizeRecord(rec: Record<string, number>): void {
  const sum = Object.values(rec).reduce((a, b) => a + b, 0)
  for (const k of Object.keys(rec)) rec[k] /= sum
}

function buildCountryMap(
  countryValues: { id: string; label: { en: string } }[],
): Map<string, number> {
  const wb = JSON.parse(readFileSync(wbPath, "utf8")) as [
    unknown,
    { country: { id: string; value: string }; value: number | null }[],
  ]
  const rows = wb[1].filter(
    (r) =>
      r.country &&
      /^[A-Z]{2}$/.test(r.country.id) &&
      typeof r.value === "number" &&
      r.value > 0,
  )
  const popByWbName = new Map(rows.map((r) => [r.country.value.toLowerCase(), r.value as number]))
  const pops = new Map<string, number>()
  for (const v of countryValues) {
    if (POPULATION_OVERRIDE[v.id] !== undefined) {
      pops.set(v.id, POPULATION_OVERRIDE[v.id])
      continue
    }
    const alias = WB_NAME_BY_APP_ID[v.id]
    const key = (alias ?? v.label.en).toLowerCase()
    const pop = popByWbName.get(key)
    if (pop === undefined) {
      throw new Error(`No World Bank population match for country id=${v.id} key=${key}`)
    }
    pops.set(v.id, pop)
  }
  return pops
}

function literaturePatches(): Record<
  string,
  Partial<{ source: string; year: number; description?: { en: string; tr: string } }> & {
    values: { id: string; p: number }[]
  }
> {
  return {
    sex: {
      source: "UN Population Division (WPP 2024 medium variant, global sex composition)",
      year: 2024,
      values: [
        { id: "female", p: 0.4962 },
        { id: "male", p: 0.4958 },
        { id: "other", p: 0.008 },
      ],
    },
    blood_type: {
      source: "AABB / international donor screening summaries (approximate global phenotype mix)",
      year: 2022,
      values: [
        { id: "o_plus", p: 0.374 },
        { id: "a_plus", p: 0.357 },
        { id: "b_plus", p: 0.085 },
        { id: "ab_plus", p: 0.034 },
        { id: "o_minus", p: 0.063 },
        { id: "a_minus", p: 0.061 },
        { id: "b_minus", p: 0.017 },
        { id: "ab_minus", p: 0.008 },
      ],
    },
    handedness: {
      source: "Papadatou-Pastou et al., meta-analysis of handedness prevalence",
      year: 2020,
      values: [
        { id: "right", p: 0.893 },
        { id: "left", p: 0.107 },
      ],
    },
    eye_color: {
      source:
        "Synthetic global marginal (survey literature; not a census). Brown-dominant prior with wide uncertainty.",
      year: 2020,
      description: {
        en: "Illustrative world blend of national surveys; true joint distribution depends strongly on ancestry and geography.",
        tr: "Ulusal anketlerin dünya çapında birleştirilmiş kabaca karışımı; gerçek dağılım köken ve coğrafyaya göre güçlü şekilde değişir.",
      },
      values: [
        { id: "brown", p: 0.55 },
        { id: "blue", p: 0.18 },
        { id: "hazel", p: 0.1 },
        { id: "green", p: 0.07 },
        { id: "amber", p: 0.03 },
        { id: "gray", p: 0.04 },
        { id: "other", p: 0.03 },
      ],
    },
    hair_color: {
      source:
        "Synthetic global marginal (ethnic composition model; not self-reported census).",
      year: 2020,
      description: {
        en: "Black/dark hair categories dominate globally; light hair is rare outside European-descended populations.",
        tr: "Siyah/koyu saç kategorileri küresel olarak baskın; açık renkli saç Avrupa kökenli olmayan nüfuslarda nadirdir.",
      },
      values: [
        { id: "black", p: 0.52 },
        { id: "dark_brown", p: 0.22 },
        { id: "brown", p: 0.14 },
        { id: "blonde", p: 0.06 },
        { id: "red", p: 0.02 },
        { id: "auburn", p: 0.02 },
        { id: "gray_white", p: 0.02 },
      ],
    },
    education_level: {
      source: "UNESCO UIS & World Bank (ISCED-oriented adult attainment, rounded global mix)",
      year: 2022,
      values: [
        { id: "no_formal", p: 0.092 },
        { id: "primary", p: 0.168 },
        { id: "lower_secondary", p: 0.188 },
        { id: "upper_secondary", p: 0.262 },
        { id: "associate", p: 0.072 },
        { id: "bachelor", p: 0.148 },
        { id: "postgraduate", p: 0.07 },
      ],
    },
    marital_status: {
      source: "UN demographic yearbook / DHS-style aggregates (rough global mix)",
      year: 2022,
      values: [
        { id: "never_married", p: 0.36 },
        { id: "married", p: 0.46 },
        { id: "separated_divorced", p: 0.12 },
        { id: "widowed", p: 0.06 },
      ],
    },
    smoker_status: {
      source: "WHO Global Report on Tobacco Prevalence (adults, rounded categories)",
      year: 2022,
      values: [
        { id: "current_smoker", p: 0.224 },
        { id: "former_smoker", p: 0.152 },
        { id: "never_smoked", p: 0.624 },
      ],
    },
    alcohol_status: {
      source: "WHO Global status report on alcohol and health (frequency classes mapped loosely)",
      year: 2018,
      values: [
        { id: "never", p: 0.43 },
        { id: "rarely", p: 0.22 },
        { id: "monthly", p: 0.17 },
        { id: "weekly_or_more", p: 0.18 },
      ],
    },
    religion: {
      source: "Pew Research Center, Global Religious Futures (2020 baseline, rounded)",
      year: 2020,
      values: [
        { id: "christianity", p: 0.311 },
        { id: "islam", p: 0.249 },
        { id: "hinduism", p: 0.152 },
        { id: "unaffiliated", p: 0.16 },
        { id: "buddhism", p: 0.066 },
        { id: "folk_religions", p: 0.052 },
        { id: "other_religion", p: 0.01 },
      ],
    },
    diet_type: {
      source: "Vegetarianism meta-reviews & FAO food pattern estimates (very uncertain global prior)",
      year: 2022,
      values: [
        { id: "omnivore", p: 0.88 },
        { id: "vegetarian", p: 0.07 },
        { id: "vegan", p: 0.02 },
        { id: "pescatarian", p: 0.02 },
        { id: "other_diet", p: 0.01 },
      ],
    },
    birth_month: {
      source: "HMD / national vital statistics seasonal averages (weak global prior)",
      year: 2022,
      values: [
        { id: "january", p: 0.081 },
        { id: "february", p: 0.076 },
        { id: "march", p: 0.083 },
        { id: "april", p: 0.081 },
        { id: "may", p: 0.084 },
        { id: "june", p: 0.085 },
        { id: "july", p: 0.087 },
        { id: "august", p: 0.088 },
        { id: "september", p: 0.086 },
        { id: "october", p: 0.083 },
        { id: "november", p: 0.079 },
        { id: "december", p: 0.077 },
      ],
    },
    pet_ownership: {
      source: "Euromonitor / industry reports (household-oriented, mapped to self-report buckets)",
      year: 2022,
      values: [
        { id: "no_pet", p: 0.52 },
        { id: "cat", p: 0.15 },
        { id: "dog", p: 0.16 },
        { id: "cat_and_dog", p: 0.06 },
        { id: "bird", p: 0.03 },
        { id: "fish", p: 0.03 },
        { id: "small_mammal", p: 0.02 },
        { id: "reptile", p: 0.01 },
        { id: "other_pet", p: 0.02 },
      ],
    },
    home_ownership: {
      source: "UN-Habitat / Eurostat / national housing surveys (rounded global tenure mix)",
      year: 2021,
      values: [
        { id: "homeowner", p: 0.54 },
        { id: "renter", p: 0.31 },
        { id: "living_with_family", p: 0.12 },
        { id: "other_housing", p: 0.03 },
      ],
    },
    mobile_os: {
      source: "StatCounter GlobalStats mobile OS (device share, Jan–Dec 2024 average, rounded)",
      year: 2024,
      description: {
        en: "Reflects installed smartphone OS share, not people; many individuals own multiple devices.",
        tr: "Yüklü akıllı telefon işletim sistemi payını yansıtır, kişi sayısını değil; çoklu cihaz yaygındır.",
      },
      values: [
        { id: "android", p: 0.714 },
        { id: "ios", p: 0.272 },
        { id: "other_mobile_os", p: 0.014 },
      ],
    },
    payment_preference: {
      source: "World Bank Global Findex 2021 (mapped to cash vs card vs mobile digital use)",
      year: 2021,
      values: [
        { id: "mostly_cash", p: 0.28 },
        { id: "mostly_card", p: 0.41 },
        { id: "mostly_mobile_wallet", p: 0.14 },
        { id: "mixed_payment", p: 0.17 },
      ],
    },
    shopping_channel: {
      source: "UNCTAD / e-commerce share of retail (mapped to channel habit buckets)",
      year: 2023,
      values: [
        { id: "mostly_online", p: 0.26 },
        { id: "mostly_in_store", p: 0.46 },
        { id: "balanced_channel", p: 0.28 },
      ],
    },
  }
}

function normalizeValuesList(values: { id: string; p: number }[]): void {
  const sum = values.reduce((a, v) => a + v.p, 0)
  for (const v of values) v.p /= sum
}

function assertSumNearOne(values: { p: number }[], label: string, tol = 1e-6): void {
  const sum = values.reduce((a, v) => a + v.p, 0)
  if (Math.abs(sum - 1) > tol) {
    throw new Error(`${label}: probabilities sum to ${sum}, expected 1`)
  }
}

function main(): void {
  verifyLockHashes()

  const raw = JSON.parse(readFileSync(attrsPath, "utf8")) as Record<string, unknown>
  const attributes = raw.attributes as Record<string, unknown>[]

  const ow = parseOwidWorldRow()
  raw.worldPopulation = Math.round(ow.total)
  raw.asOfYear = 2023

  const ageShares = ageSharesFromBroadBands(ow)
  normalizeRecord(ageShares)

  const countryAttr = attributes.find((a) => (a as { id: string }).id === "country") as {
    values: { id: string; label: { en: string }; p: number }[]
  }
  const pops = buildCountryMap(countryAttr.values)
  let popSum = 0
  for (const v of countryAttr.values) {
    const p = pops.get(v.id)
    if (p === undefined) throw new Error(`Missing pop for ${v.id}`)
    popSum += p
  }
  for (const v of countryAttr.values) {
    v.p = (pops.get(v.id) as number) / popSum
  }
  const countryRec = countryAttr as Record<string, unknown>
  countryRec.source = "World Bank WDI SP.POP.TOTL (2023), mapped to app country list"
  countryRec.year = 2023

  for (const attr of attributes) {
    const a = attr as Record<string, unknown> & { id: string; values: { id: string; p: number }[] }
    if (a.id === "age_band") {
      for (const v of a.values) {
        const key = v.id === "age_60_plus" ? "age_60_plus" : v.id
        const p = ageShares[key]
        if (p === undefined) throw new Error(`Missing age share for ${v.id}`)
        v.p = p
      }
      a.source =
        "Derived from Our World in Data broad age groups (World, 2023; UN WPP-based), uniform within each band"
      a.year = 2023
      assertSumNearOne(a.values, "age_band")
    }
    if (a.id === "height_band") {
      const hp = heightProbabilities()
      const byId = new Map(hp.map((x) => [x.id, x.p]))
      for (const v of a.values) {
        const p = byId.get(v.id)
        if (p === undefined) throw new Error(`Missing height p for ${v.id}`)
        v.p = p
      }
      a.source =
        "Global Gaussian cm prior (mean ~165 cm, sd ~11.3; NCD-RisC-informed level, not age-sex conditional)"
      a.year = 2024
      assertSumNearOne(a.values, "height_band")
    }

    const lit = literaturePatches()[a.id]
    if (lit) {
      if (lit.source) a.source = lit.source
      if (lit.year !== undefined) a.year = lit.year
      if (lit.description) a.description = lit.description
      const byId = new Map(a.values.map((v) => [v.id, v]))
      for (const patch of lit.values) {
        const target = byId.get(patch.id) as { p: number } | undefined
        if (!target) throw new Error(`Missing value ${patch.id} in ${a.id}`)
        target.p = patch.p
      }
      normalizeValuesList(a.values as { id: string; p: number }[])
      assertSumNearOne(a.values, a.id)
    }
  }

  writeFileSync(attrsPath, JSON.stringify(raw, null, 2) + "\n", "utf8")
  console.log("Wrote", attrsPath)
  console.log("worldPopulation", raw.worldPopulation, "asOfYear", raw.asOfYear)
}

main()
