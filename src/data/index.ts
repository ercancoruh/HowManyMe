import rawDataset from "@/data/attributes.json"
import { parsePopulationDataset } from "@/data/schema"

export const populationDataset = parsePopulationDataset(rawDataset)
