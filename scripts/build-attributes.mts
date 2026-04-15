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

type DatasetValue = { id: string; label: { en: string; tr: string }; p: number }

const HEIGHT_MU = 164.7
const HEIGHT_SIGMA = 11.35

/** 5 cm bands: below 120, 120–124, …, 195–199, 200+ (Gaussian global marginal). */
function buildHeightBandValues5cm(): DatasetValue[] {
  const mu = HEIGHT_MU
  const sigma = HEIGHT_SIGMA
  const rows: DatasetValue[] = []
  const pUnder = normCdf((119.5 - mu) / sigma)
  rows.push({
    id: "under_120",
    label: { en: "Under 120 cm", tr: "120 cm altı" },
    p: pUnder,
  })
  for (let lo = 120; lo <= 195; lo += 5) {
    const hi = lo + 4
    const p =
      normCdf((hi + 0.5 - mu) / sigma) - normCdf((lo - 0.5 - mu) / sigma)
    rows.push({
      id: `height_${lo}_${hi}`,
      label: { en: `${lo}–${hi} cm`, tr: `${lo}–${hi} cm` },
      p,
    })
  }
  rows.push({
    id: "height_200_plus",
    label: { en: "200 cm or more", tr: "200 cm ve üzeri" },
    p: 1 - normCdf((199.5 - mu) / sigma),
  })
  const s = rows.reduce((a, x) => a + x.p, 0)
  return rows.map((x) => ({ ...x, p: x.p / s }))
}

/**
 * 5-year age bands from OWID broad groups (World, 2023): uniform within each UN broad band
 * where a band spans multiple 5-year bins.
 */
function buildAgeBandValues5y(o: ReturnType<typeof parseOwidWorldRow>): DatasetValue[] {
  const T = o.total
  const rows: DatasetValue[] = []
  const add = (id: string, en: string, tr: string, p: number) =>
    rows.push({ id, label: { en, tr }, p })

  add("age_0_4", "0–4", "0–4 yaş", o.p0_4 / T)
  add("age_5_9", "5–9", "5–9 yaş", ((o.p5_14 * 5) / 10) / T)
  add("age_10_14", "10–14", "10–14 yaş", ((o.p5_14 * 5) / 10) / T)
  add("age_15_19", "15–19", "15–19 yaş", ((o.p15_24 * 5) / 10) / T)
  add("age_20_24", "20–24", "20–24 yaş", ((o.p15_24 * 5) / 10) / T)
  const p25_64_slice = ((o.p25_64 * 5) / 40) / T
  for (let lo = 25; lo <= 55; lo += 5) {
    const hi = lo + 4
    add(`age_${lo}_${hi}`, `${lo}–${hi}`, `${lo}–${hi} yaş`, p25_64_slice)
  }
  add("age_60_64", "60–64", "60–64 yaş", ((o.p25_64 * 5) / 40) / T)
  add("age_65_plus", "65+", "65 ve üzeri", o.p65 / T)

  const sum = rows.reduce((a, r) => a + r.p, 0)
  return rows.map((r) => ({ ...r, p: r.p / sum }))
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
      a.values = buildAgeBandValues5y(ow) as unknown as { id: string; p: number }[]
      a.source =
        "Derived from Our World in Data broad age groups (World, 2023; UN WPP–based), split into 5-year bands with uniform distribution within each UN broad group"
      a.year = 2023
      a.description = {
        en: "Choose the 5-year age bracket that includes your current age.",
        tr: "Yaşının dahil olduğu 5 yıllık aralığı seç.",
      }
      assertSumNearOne(a.values as { p: number }[], "age_band")
    }
    if (a.id === "height_band") {
      a.values = buildHeightBandValues5cm() as unknown as { id: string; p: number }[]
      a.source =
        "Global Gaussian cm prior in 5 cm bands (mean ~165 cm, sd ~11.3; NCD-RisC-informed level, not age- or sex-conditioned)"
      a.year = 2024
      a.description = {
        en: "Choose the 5 cm height bracket that best matches you (e.g. 170–174 cm).",
        tr: "Sana en uygun 5 cm'lik boy aralığını seç (ör. 170–174 cm).",
      }
      assertSumNearOne(a.values as { p: number }[], "height_band")
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
