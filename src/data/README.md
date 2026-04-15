# Data Notes

This project uses a static JSON dataset: `src/data/attributes.json`.

## Fields

- `worldPopulation`: baseline population for the estimate.
- `asOfYear`: reference year for baseline.
- `alpha`: dampening coefficient to reduce independence overconfidence.
- `minProbabilityFloor`: lower bound to avoid hard zero probability.
- `attributes[]`: trait definitions and value probabilities.

## Source policy

Each attribute can include:

- `source`: public data source name.
- `year`: source year.
- `optional`: if users can safely skip the question.
- `sensitive`: if trait can be privacy-sensitive in some regions.

## Update policy

When updating data:

1. Keep probabilities in the `[0,1]` range.
2. Ensure each attribute value list has realistic distribution coverage.
3. Keep source and year metadata current.
4. Validate by running `npm run typecheck` and `npm run test`.

## Rebuilding from sources

Committed inputs live under `src/data/sources/` (see `sources.lock.json` for URLs and SHA-256 checksums).

- **Country shares and `worldPopulation`**: World Bank WDI `SP.POP.TOTL` (2023 snapshot). Vatican City uses a fixed UN-scale estimate where the Bank does not publish a separate series.
- **`age_band`**: 5-year bins (0–4, 5–9, …, 60–64, 65+) from the Our World in Data “World” row for 2023 (UN WPP–based), with a uniform split within each UN broad age group where a group spans multiple bins (see `buildAgeBandValues5y` in `scripts/build-attributes.mts`).
- **`height_band`**: 5 cm bins (below 120, 120–124, …, 195–199, 200+) from the same Gaussian global marginal as before (`buildHeightBandValues5cm` in `scripts/build-attributes.mts`).
- **Other traits**: Literature-based priors and short citations are maintained in `literaturePatches()` inside `scripts/build-attributes.mts` (Pew, WHO, UNESCO/UIS, StatCounter, Findex, etc.). Some items (eye colour, hair colour, diet) are explicitly **synthetic global marginals**, not census counts.

Regenerate `attributes.json` after editing sources or the script:

```bash
npm run data:build
```
