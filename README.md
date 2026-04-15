# HowManyMe

HowManyMe is a privacy-first, fully client-side website that estimates how many
people in the world may share your selected traits.

## Core principle

- No backend and no database.
- No user answers are saved.
- One static JSON dataset powers all calculations.

## Formula

For selected attributes:

1. Multiply selected value probabilities.
2. Apply dampening for trait correlation: `pAdjusted = pRaw ^ alpha`.
3. Apply minimum floor to avoid literal zero.
4. Estimate count: `estimatedCount = worldPopulation * pAdjusted`.

The app also shows a likely range and confidence tier.

## Data transparency

- Dataset file: `src/data/attributes.json`
- Validation schema: `src/data/schema.ts`
- Data notes: `src/data/README.md`

## Development

```bash
npm install
npm run dev
```

### Quality checks

```bash
npm run lint
npm run typecheck
npm run test
```
