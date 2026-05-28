/**
 * Rebuilds src/data/attributes.json with sourced priors for country, age, world total,
 * and literature-based marginals for other traits. Run from repo root:
 *   npx tsx scripts/build-attributes.mts
 */
import { createHash } from "node:crypto"
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, "..")
const attrsPath = join(root, "src", "data", "attributes.json")
const countriesDir = join(root, "src", "data", "countries")
const countriesIndexPath = join(countriesDir, "index.json")
const sourcesDir = join(root, "src", "data", "sources")
const lockPath = join(sourcesDir, "sources.lock.json")
const wbPath = join(sourcesDir, "world_bank_population_2023_snapshot.json")
const owidPath = join(sourcesDir, "owid_world_broad_age_2023.csv")
const owidReligiousAnyPath = join(sourcesDir, "owid_religious_composition.csv")
const owidReligiousChristiansPath = join(sourcesDir, "owid_religion_christians.csv")
const owidReligiousMuslimsPath = join(sourcesDir, "owid_religion_muslims.csv")
const owidReligiousHindusPath = join(sourcesDir, "owid_religion_hindus.csv")
const owidReligiousBuddhistsPath = join(sourcesDir, "owid_religion_buddhists.csv")
const owidReligiousJewsPath = join(sourcesDir, "owid_religion_jews.csv")

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
type DatasetAttribute = {
  id: string
  label: { en: string; tr: string }
  ui?: "radio" | "searchable_select"
  description?: { en: string; tr: string }
  values: DatasetValue[]
  optional?: boolean
  sensitive?: boolean
  source?: string
  year?: number
  weight?: number
}

type CountryFacts = {
  iso2: string
  iso3: string
  population: number
}

type WbIndicatorPoint = {
  value: number
  year: number
}

type Iso3SeriesPoint = {
  value: number
  year: number
}

type MobileOsShare = {
  android: number
  ios: number
  other: number
}

const WB_AGE_0_14 = "SP.POP.0014.TO.ZS"
const WB_AGE_15_64 = "SP.POP.1564.TO.ZS"
const WB_AGE_65_PLUS = "SP.POP.65UP.TO.ZS"
const WB_FEMALE_PCT = "SP.POP.TOTL.FE.ZS"
const WB_SMOKING_PREVALENCE = "SH.PRV.SMOK"
const WB_ALCOHOL_PER_CAPITA = "SH.ALC.PCAP.LI"
const WB_EDU_PRIMARY_PLUS = "SE.PRM.CUAT.ZS"
const WB_EDU_LOWER_SEC_PLUS = "SE.SEC.CUAT.LO.ZS"
const WB_EDU_UPPER_SEC_PLUS = "SE.SEC.CUAT.UP.ZS"
const WB_EDU_BACHELOR_PLUS = "SE.TER.CUAT.BA.ZS"
const WB_EDU_MASTER_PLUS = "SE.TER.CUAT.MS.ZS"

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

function buildCountryFacts(
  countryValues: { id: string; label: { en: string } }[],
): Map<string, CountryFacts> {
  const wb = JSON.parse(readFileSync(wbPath, "utf8")) as [
    unknown,
    { country: { id: string; value: string }; countryiso3code?: string; value: number | null }[],
  ]
  const rows = wb[1].filter(
    (r) =>
      r.country &&
      /^[A-Z]{2}$/.test(r.country.id) &&
      typeof r.value === "number" &&
      r.value > 0,
  )
  const rowsByWbName = new Map(
    rows.map((r) => [
      r.country.value.toLowerCase(),
      {
        iso2: r.country.id.toLowerCase(),
        iso3: String((r as { countryiso3code?: string }).countryiso3code ?? "").toUpperCase(),
        population: r.value as number,
      },
    ]),
  )
  const facts = new Map<string, CountryFacts>()
  for (const v of countryValues) {
    if (POPULATION_OVERRIDE[v.id] !== undefined) {
      facts.set(v.id, { iso2: "xk", iso3: "XKX", population: POPULATION_OVERRIDE[v.id] })
      continue
    }
    const alias = WB_NAME_BY_APP_ID[v.id]
    const key = (alias ?? v.label.en).toLowerCase()
    const row = rowsByWbName.get(key)
    if (row === undefined) {
      throw new Error(`No World Bank population match for country id=${v.id} key=${key}`)
    }
    facts.set(v.id, row)
  }
  return facts
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

async function fetchWorldBankIndicatorLatest(indicator: string): Promise<Map<string, WbIndicatorPoint>> {
  const url = `https://api.worldbank.org/v2/country/all/indicator/${indicator}?format=json&per_page=20000`
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`World Bank API request failed for ${indicator}: ${response.status}`)
  }
  const payload = (await response.json()) as [
    { page: number; pages: number; per_page: string; total: number },
    { countryiso3code: string; country: { id: string }; date: string; value: number | null }[],
  ]
  const rows = payload[1] ?? []
  const latestByIso2 = new Map<string, WbIndicatorPoint>()

  for (const row of rows) {
    const iso2 = row.country?.id?.toLowerCase()
    if (!iso2 || iso2.length !== 2) {
      continue
    }
    if (typeof row.value !== "number" || Number.isNaN(row.value)) {
      continue
    }
    const year = Number.parseInt(row.date, 10)
    if (Number.isNaN(year)) {
      continue
    }
    const current = latestByIso2.get(iso2)
    if (!current || year > current.year) {
      latestByIso2.set(iso2, { value: row.value, year })
    }
  }
  return latestByIso2
}

function buildAgeBandValuesFromShares(args: {
  age0_14: number
  age15_64: number
  age65plus: number
}): DatasetValue[] {
  const rows: DatasetValue[] = []
  const add = (id: string, en: string, tr: string, p: number) =>
    rows.push({ id, label: { en, tr }, p })

  const share0_14 = args.age0_14 / 100
  const share15_64 = args.age15_64 / 100
  const share65plus = args.age65plus / 100

  const p0_14Bin = share0_14 / 3
  add("age_0_4", "0–4", "0–4 yaş", p0_14Bin)
  add("age_5_9", "5–9", "5–9 yaş", p0_14Bin)
  add("age_10_14", "10–14", "10–14 yaş", p0_14Bin)

  const p15_64Bin = share15_64 / 10
  add("age_15_19", "15–19", "15–19 yaş", p15_64Bin)
  add("age_20_24", "20–24", "20–24 yaş", p15_64Bin)
  for (let lo = 25; lo <= 55; lo += 5) {
    const hi = lo + 4
    add(`age_${lo}_${hi}`, `${lo}–${hi}`, `${lo}–${hi} yaş`, p15_64Bin)
  }
  add("age_60_64", "60–64", "60–64 yaş", p15_64Bin)
  add("age_65_plus", "65+", "65 ve üzeri", share65plus)
  normalizeValuesList(rows)
  return rows
}

function parseCsvRow(line: string): string[] {
  const values: string[] = []
  let current = ""
  let inQuotes = false
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i += 1
      } else {
        inQuotes = !inQuotes
      }
      continue
    }
    if (ch === "," && !inQuotes) {
      values.push(current)
      current = ""
      continue
    }
    current += ch
  }
  values.push(current)
  return values
}

function parseOwidReligionLatestByIso3(csvPath: string): Map<string, Iso3SeriesPoint> {
  const lines = readFileSync(csvPath, "utf8").trim().split(/\r?\n/)
  const header = parseCsvRow(lines[0] ?? "")
  const codeIndex = header.indexOf("Code")
  const yearIndex = header.indexOf("Year")
  const valueIndex = header.length - 1
  const latest = new Map<string, Iso3SeriesPoint>()
  for (let i = 1; i < lines.length; i += 1) {
    const row = parseCsvRow(lines[i] ?? "")
    const code = (row[codeIndex] ?? "").trim().toUpperCase()
    if (code.length !== 3 || code.startsWith("OWID_") || code.startsWith("PEW_")) {
      continue
    }
    const year = Number.parseInt(row[yearIndex] ?? "", 10)
    const value = Number.parseFloat(row[valueIndex] ?? "")
    if (Number.isNaN(year) || Number.isNaN(value)) {
      continue
    }
    const current = latest.get(code)
    if (!current || year > current.year) {
      latest.set(code, { value, year })
    }
  }
  return latest
}

async function fetchStatcounterCountryMobileOsShare(iso2: string): Promise<MobileOsShare | null> {
  const url =
    `http://gs.statcounter.com/chart.php?device_hidden=mobile&statType_hidden=os` +
    `&region_hidden=${iso2.toUpperCase()}&multi-device=true&csv=1&granularity=yearly&fromYear=2024&toYear=2024`
  const response = await fetch(url)
  if (!response.ok) {
    return null
  }
  const text = await response.text()
  const lines = text.trim().split(/\r?\n/)
  if (lines.length < 2) {
    return null
  }
  let android = 0
  let ios = 0
  let other = 0
  for (let i = 1; i < lines.length; i += 1) {
    const row = parseCsvRow(lines[i] ?? "")
    const name = (row[0] ?? "").trim().toLowerCase()
    const value = Number.parseFloat(row[1] ?? "")
    if (Number.isNaN(value)) {
      continue
    }
    const p = Math.max(0, value / 100)
    if (name === "android") {
      android += p
    } else if (name === "ios") {
      ios += p
    } else {
      other += p
    }
  }
  const sum = android + ios + other
  if (sum <= 0) {
    return null
  }
  return {
    android: android / sum,
    ios: ios / sum,
    other: other / sum,
  }
}

async function fetchStatcounterMobileOsByIso2(
  iso2Codes: string[],
): Promise<Map<string, MobileOsShare>> {
  const out = new Map<string, MobileOsShare>()
  const workerCount = 12
  let cursor = 0

  async function worker(): Promise<void> {
    while (cursor < iso2Codes.length) {
      const idx = cursor
      cursor += 1
      const iso2 = iso2Codes[idx] ?? ""
      if (!iso2) continue
      const share = await fetchStatcounterCountryMobileOsShare(iso2)
      if (share) {
        out.set(iso2, share)
      }
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => worker()))
  return out
}

function applySmokerDistributionFromCurrentRate(
  values: DatasetValue[],
  currentPct: number,
): DatasetValue[] {
  const current = Math.max(0, Math.min(1, currentPct / 100))
  const nonCurrent = Math.max(0, 1 - current)
  // Keep former/non-smoker split proportional to the current global prior.
  const formerShareOfNonCurrent = 0.152 / (0.152 + 0.624)
  const former = nonCurrent * formerShareOfNonCurrent
  const never = nonCurrent - former

  const next = values.map((value) => ({ ...value }))
  for (const value of next) {
    if (value.id === "current_smoker") value.p = current
    if (value.id === "former_smoker") value.p = former
    if (value.id === "never_smoked") value.p = never
  }
  normalizeValuesList(next)
  return next
}

function applyAlcoholDistributionFromPerCapita(
  values: DatasetValue[],
  litersPerCapita: number,
): DatasetValue[] {
  const liters = Math.max(0, litersPerCapita)
  // Heuristic mapping from WHO/WB total liters-per-adult into frequency buckets.
  // Tuned to keep plausible mass while reacting to real country differences.
  const weekly = Math.min(0.45, Math.max(0.03, 0.06 + liters * 0.03))
  const monthly = Math.min(0.3, Math.max(0.05, 0.08 + liters * 0.014))
  const rarely = Math.min(0.35, Math.max(0.08, 0.12 + liters * 0.008))
  const never = Math.max(0.05, 1 - (weekly + monthly + rarely))

  const next = values.map((value) => ({ ...value }))
  for (const value of next) {
    if (value.id === "weekly_or_more") value.p = weekly
    if (value.id === "monthly") value.p = monthly
    if (value.id === "rarely") value.p = rarely
    if (value.id === "never") value.p = never
  }
  normalizeValuesList(next)
  return next
}

function applyEducationDistributionFromAttainment(args: {
  primaryPlusPct: number
  lowerSecPlusPct: number
  upperSecPlusPct: number
  bachelorPlusPct?: number
  masterPlusPct?: number
}): Record<string, number> {
  const primaryPlus = Math.max(0, Math.min(1, args.primaryPlusPct / 100))
  const lowerPlus = Math.max(0, Math.min(primaryPlus, args.lowerSecPlusPct / 100))
  const upperPlus = Math.max(0, Math.min(lowerPlus, args.upperSecPlusPct / 100))
  const bachelorPlus = Math.max(0, Math.min(upperPlus, (args.bachelorPlusPct ?? 0) / 100))
  const masterPlus = Math.max(0, Math.min(bachelorPlus, (args.masterPlusPct ?? 0) / 100))

  const noFormal = Math.max(0, 1 - primaryPlus)
  const primary = Math.max(0, primaryPlus - lowerPlus)
  const lowerSecondary = Math.max(0, lowerPlus - upperPlus)

  const bachelor = Math.max(0, bachelorPlus - masterPlus)
  const postgraduate = masterPlus
  const nonBachelorUpper = Math.max(0, upperPlus - bachelorPlus)
  const associate = nonBachelorUpper * 0.18
  const upperSecondary = Math.max(0, nonBachelorUpper - associate)

  const result = {
    no_formal: noFormal,
    primary,
    lower_secondary: lowerSecondary,
    upper_secondary: upperSecondary,
    associate,
    bachelor,
    postgraduate,
  }
  const sum = Object.values(result).reduce((a, b) => a + b, 0)
  if (sum <= 0) {
    return result
  }
  return Object.fromEntries(
    Object.entries(result).map(([k, v]) => [k, v / sum]),
  ) as Record<string, number>
}

function stableVersionHash(payload: unknown): string {
  return createHash("sha256").update(JSON.stringify(payload)).digest("hex").slice(0, 12)
}

async function buildCountryDatasets(raw: Record<string, unknown>): Promise<{
  index: {
    code: string
    label: { en: string; tr: string }
    datasetVersion: string
    datasetAsOfYear: number
    sourceCoverageScore: number
    lastUpdated: string
  }[]
  datasets: Record<string, Record<string, unknown>>
}> {
  const allAttributes = raw.attributes as DatasetAttribute[]
  const countryAttr = allAttributes.find((attribute) => attribute.id === "country")
  if (!countryAttr) {
    throw new Error("country attribute is required to build per-country datasets")
  }

  const baseAttributes = allAttributes.filter((attribute) => attribute.id !== "country")
  const wbAge0_14 = await fetchWorldBankIndicatorLatest(WB_AGE_0_14)
  const wbAge15_64 = await fetchWorldBankIndicatorLatest(WB_AGE_15_64)
  const wbAge65Plus = await fetchWorldBankIndicatorLatest(WB_AGE_65_PLUS)
  const wbFemale = await fetchWorldBankIndicatorLatest(WB_FEMALE_PCT)
  const wbSmoking = await fetchWorldBankIndicatorLatest(WB_SMOKING_PREVALENCE)
  const wbAlcohol = await fetchWorldBankIndicatorLatest(WB_ALCOHOL_PER_CAPITA)
  const wbEduPrimaryPlus = await fetchWorldBankIndicatorLatest(WB_EDU_PRIMARY_PLUS)
  const wbEduLowerPlus = await fetchWorldBankIndicatorLatest(WB_EDU_LOWER_SEC_PLUS)
  const wbEduUpperPlus = await fetchWorldBankIndicatorLatest(WB_EDU_UPPER_SEC_PLUS)
  const wbEduBachelorPlus = await fetchWorldBankIndicatorLatest(WB_EDU_BACHELOR_PLUS)
  const wbEduMasterPlus = await fetchWorldBankIndicatorLatest(WB_EDU_MASTER_PLUS)
  const relAny = parseOwidReligionLatestByIso3(owidReligiousAnyPath)
  const relChristianity = parseOwidReligionLatestByIso3(owidReligiousChristiansPath)
  const relIslam = parseOwidReligionLatestByIso3(owidReligiousMuslimsPath)
  const relHinduism = parseOwidReligionLatestByIso3(owidReligiousHindusPath)
  const relBuddhism = parseOwidReligionLatestByIso3(owidReligiousBuddhistsPath)
  const relJudaism = parseOwidReligionLatestByIso3(owidReligiousJewsPath)
  const countryFacts = buildCountryFacts(countryAttr.values as { id: string; label: { en: string } }[])
  const statcounterMobileOs = await fetchStatcounterMobileOsByIso2(
    Array.from(
      new Set(
        Array.from(countryFacts.values())
          .map((facts) => facts.iso2.toLowerCase())
          .filter((iso2) => iso2.length === 2),
      ),
    ),
  )

  const datasets: Record<string, Record<string, unknown>> = {}
  const index: {
    code: string
    label: { en: string; tr: string }
    datasetVersion: string
    datasetAsOfYear: number
    sourceCoverageScore: number
    lastUpdated: string
  }[] = []

  for (const country of countryAttr.values) {
    const facts = countryFacts.get(country.id)
    if (!facts) {
      throw new Error(`Missing country facts for ${country.id}`)
    }
    const countryPopulation = Math.max(1, Math.round(facts.population))
    const attrs = structuredClone(baseAttributes)
    let coverageScore = 0.35

    const age0_14 = wbAge0_14.get(facts.iso2)
    const age15_64 = wbAge15_64.get(facts.iso2)
    const age65plus = wbAge65Plus.get(facts.iso2)
    const female = wbFemale.get(facts.iso2)
    const smoking = wbSmoking.get(facts.iso2)
    const alcohol = wbAlcohol.get(facts.iso2)
    const anyReligion = relAny.get(facts.iso3)
    const christianity = relChristianity.get(facts.iso3)
    const islam = relIslam.get(facts.iso3)
    const hinduism = relHinduism.get(facts.iso3)
    const buddhism = relBuddhism.get(facts.iso3)
    const judaism = relJudaism.get(facts.iso3)
    const mobileOs = statcounterMobileOs.get(facts.iso2.toLowerCase())
    const eduPrimaryPlus = wbEduPrimaryPlus.get(facts.iso2)
    const eduLowerPlus = wbEduLowerPlus.get(facts.iso2)
    const eduUpperPlus = wbEduUpperPlus.get(facts.iso2)
    const eduBachelorPlus = wbEduBachelorPlus.get(facts.iso2)
    const eduMasterPlus = wbEduMasterPlus.get(facts.iso2)

    const ageAttr = attrs.find((attribute) => attribute.id === "age_band")
    if (ageAttr && age0_14 && age15_64 && age65plus) {
      ageAttr.values = buildAgeBandValuesFromShares({
        age0_14: age0_14.value,
        age15_64: age15_64.value,
        age65plus: age65plus.value,
      })
      ageAttr.source = `World Bank WDI ${WB_AGE_0_14}, ${WB_AGE_15_64}, ${WB_AGE_65_PLUS} (${Math.min(
        age0_14.year,
        age15_64.year,
        age65plus.year,
      )})`
      ageAttr.year = Math.min(age0_14.year, age15_64.year, age65plus.year)
      coverageScore += 0.15
    }

    const sexAttr = attrs.find((attribute) => attribute.id === "sex")
    if (sexAttr && female) {
      const otherShare = sexAttr.values.find((value) => value.id === "other")?.p ?? 0.005
      const femaleShare = Math.max(0, Math.min(1, female.value / 100))
      const scaledFemale = femaleShare * (1 - otherShare)
      const scaledMale = (1 - femaleShare) * (1 - otherShare)
      for (const value of sexAttr.values) {
        if (value.id === "female") value.p = scaledFemale
        if (value.id === "male") value.p = scaledMale
        if (value.id === "other") value.p = otherShare
      }
      normalizeValuesList(sexAttr.values)
      sexAttr.source = `World Bank WDI ${WB_FEMALE_PCT} (${female.year}) + fixed other-share prior`
      sexAttr.year = female.year
      coverageScore += 0.1
    }

    const smokerAttr = attrs.find((attribute) => attribute.id === "smoker_status")
    if (smokerAttr && smoking) {
      smokerAttr.values = applySmokerDistributionFromCurrentRate(smokerAttr.values, smoking.value)
      smokerAttr.source = `World Bank WDI ${WB_SMOKING_PREVALENCE} (${smoking.year}) + calibrated split prior`
      smokerAttr.year = smoking.year
      coverageScore += 0.1
    }

    const alcoholAttr = attrs.find((attribute) => attribute.id === "alcohol_status")
    if (alcoholAttr && alcohol) {
      alcoholAttr.values = applyAlcoholDistributionFromPerCapita(alcoholAttr.values, alcohol.value)
      alcoholAttr.source = `World Bank WDI ${WB_ALCOHOL_PER_CAPITA} (${alcohol.year}) + frequency mapping heuristic`
      alcoholAttr.year = alcohol.year
      coverageScore += 0.1
    }

    const religionAttr = attrs.find((attribute) => attribute.id === "religion")
    if (
      religionAttr &&
      anyReligion &&
      christianity &&
      islam &&
      hinduism &&
      buddhism &&
      judaism
    ) {
      const known = [christianity.value, islam.value, hinduism.value, buddhism.value, judaism.value]
        .map((v) => Math.max(0, v / 100))
        .reduce((a, b) => a + b, 0)
      const affiliated = Math.max(0, Math.min(1, anyReligion.value / 100))
      const unaffiliated = Math.max(0, 1 - affiliated)
      const remainingAffiliated = Math.max(0, affiliated - known)
      const folkRatio = 0.052 / (0.052 + 0.01)
      const folkReligions = remainingAffiliated * folkRatio
      const otherReligion = remainingAffiliated - folkReligions

      for (const value of religionAttr.values) {
        if (value.id === "christianity") value.p = Math.max(0, christianity.value / 100)
        if (value.id === "islam") value.p = Math.max(0, islam.value / 100)
        if (value.id === "hinduism") value.p = Math.max(0, hinduism.value / 100)
        if (value.id === "buddhism") value.p = Math.max(0, buddhism.value / 100)
        if (value.id === "unaffiliated") value.p = unaffiliated
        if (value.id === "folk_religions") value.p = folkReligions
        if (value.id === "other_religion") value.p = otherReligion + Math.max(0, judaism.value / 100)
      }
      normalizeValuesList(religionAttr.values)
      religionAttr.source =
        "Pew 2025 religious composition by country via OWID grapher + derived unaffiliated/other split"
      religionAttr.year = Math.min(
        anyReligion.year,
        christianity.year,
        islam.year,
        hinduism.year,
        buddhism.year,
        judaism.year,
      )
      coverageScore += 0.15
    }

    const mobileAttr = attrs.find((attribute) => attribute.id === "mobile_os")
    if (mobileAttr && mobileOs) {
      for (const value of mobileAttr.values) {
        if (value.id === "android") value.p = mobileOs.android
        if (value.id === "ios") value.p = mobileOs.ios
        if (value.id === "other_mobile_os") value.p = mobileOs.other
      }
      normalizeValuesList(mobileAttr.values)
      mobileAttr.source = "StatCounter GlobalStats mobile OS market share (2024 country-level)"
      mobileAttr.year = 2024
      coverageScore += 0.1
    }

    const educationAttr = attrs.find((attribute) => attribute.id === "education_level")
    if (educationAttr && eduPrimaryPlus && eduUpperPlus) {
      const lowerForModel =
        eduLowerPlus?.value ?? Math.max(eduUpperPlus.value, (eduPrimaryPlus.value + eduUpperPlus.value) / 2)
      const eduDist = applyEducationDistributionFromAttainment({
        primaryPlusPct: eduPrimaryPlus.value,
        lowerSecPlusPct: lowerForModel,
        upperSecPlusPct: eduUpperPlus.value,
        bachelorPlusPct: eduBachelorPlus?.value,
        masterPlusPct: eduMasterPlus?.value,
      })
      for (const value of educationAttr.values) {
        value.p = eduDist[value.id] ?? value.p
      }
      normalizeValuesList(educationAttr.values)
      educationAttr.source =
        "UNESCO UIS attainment via World Bank WDI (SE.PRM.CUAT.ZS, SE.SEC.CUAT.LO.ZS, SE.SEC.CUAT.UP.ZS, SE.TER.CUAT.BA.ZS, SE.TER.CUAT.MS.ZS) + ISCED bucket mapping"
      educationAttr.year = Math.min(
        eduPrimaryPlus.year,
        eduUpperPlus.year,
        eduLowerPlus?.year ?? eduUpperPlus.year,
        eduBachelorPlus?.year ?? eduUpperPlus.year,
        eduMasterPlus?.year ?? eduUpperPlus.year,
      )
      coverageScore += 0.1
    }

    const payload = {
      countryCode: country.id,
      asOfYear: raw.asOfYear,
      worldPopulation: countryPopulation,
      alpha: raw.alpha,
      minProbabilityFloor: raw.minProbabilityFloor,
      attributes: attrs,
    }
    const version = stableVersionHash(payload)
    const dataset = {
      ...payload,
      version,
    }
    datasets[country.id] = dataset
    index.push({
      code: country.id,
      label: country.label,
      datasetVersion: version,
      datasetAsOfYear: raw.asOfYear as number,
      sourceCoverageScore: Number(Math.min(1, coverageScore).toFixed(2)),
      lastUpdated: new Date().toISOString().slice(0, 10),
    })
  }

  return { index, datasets }
}

async function main(): Promise<void> {
  verifyLockHashes()

  const raw = JSON.parse(readFileSync(attrsPath, "utf8")) as Record<string, unknown>
  const attributes = raw.attributes as Record<string, unknown>[]

  const ow = parseOwidWorldRow()
  raw.worldPopulation = Math.round(ow.total)
  raw.asOfYear = 2023

  const countryAttr = attributes.find((a) => (a as { id: string }).id === "country") as {
    values: { id: string; label: { en: string }; p: number }[]
  }
  const countryFacts = buildCountryFacts(countryAttr.values)
  let popSum = 0
  for (const v of countryAttr.values) {
    const facts = countryFacts.get(v.id)
    if (!facts) throw new Error(`Missing population for ${v.id}`)
    popSum += facts.population
  }
  for (const v of countryAttr.values) {
    v.p = (countryFacts.get(v.id) as CountryFacts).population / popSum
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

  const { index, datasets } = await buildCountryDatasets(raw)
  rmSync(countriesDir, { recursive: true, force: true })
  mkdirSync(countriesDir, { recursive: true })
  writeFileSync(countriesIndexPath, JSON.stringify(index, null, 2) + "\n", "utf8")
  for (const [countryCode, dataset] of Object.entries(datasets)) {
    const folder = join(countriesDir, countryCode)
    mkdirSync(folder, { recursive: true })
    writeFileSync(join(folder, "attributes.json"), JSON.stringify(dataset, null, 2) + "\n", "utf8")
  }

  writeFileSync(attrsPath, JSON.stringify(raw, null, 2) + "\n", "utf8")
  console.log("Wrote", attrsPath)
  console.log("Wrote", countriesIndexPath, "and", Object.keys(datasets).length, "country datasets")
  console.log("worldPopulation", raw.worldPopulation, "asOfYear", raw.asOfYear)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
