import rawCountryCatalog from "@/data/countries/index.json"
import rawQuestionsManifest from "@/data/questions.manifest.json"
import { parseCountryCatalog, parsePopulationDataset } from "@/data/schema"

type CountryDatasetModule = {
  default: unknown
}

const countryDatasetModules = import.meta.glob<CountryDatasetModule>(
  "@/data/countries/*/attributes.json",
  { eager: true },
)

const parsedDatasetsByCountry = Object.fromEntries(
  Object.entries(countryDatasetModules).map(([path, mod]) => {
    const code = path.split("/").at(-2)?.toLowerCase()
    if (!code) {
      throw new Error(`Invalid country dataset path: ${path}`)
    }
    const parsed = parsePopulationDataset(mod.default)
    const orderedAttributes = (rawQuestionsManifest.attributeOrder as string[])
      .map((id) => parsed.attributes.find((attribute) => attribute.id === id))
      .filter((attribute): attribute is (typeof parsed.attributes)[number] => attribute !== undefined)
    return [code, { ...parsed, attributes: orderedAttributes }]
  }),
)

export const countryCatalog = parseCountryCatalog(rawCountryCatalog)

export const defaultCountryCode =
  countryCatalog.find((country) => country.code === "turkiye")?.code ?? countryCatalog[0]?.code

if (!defaultCountryCode) {
  throw new Error("No country datasets available")
}

export function getDatasetForCountry(countryCode: string) {
  const normalized = countryCode.toLowerCase()
  return parsedDatasetsByCountry[normalized] ?? parsedDatasetsByCountry[defaultCountryCode]
}

export const populationDataset = getDatasetForCountry(defaultCountryCode)
