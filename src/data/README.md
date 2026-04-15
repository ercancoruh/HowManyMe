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
