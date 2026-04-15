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

### Data licensing and attribution

Processed inputs include World Bank WDI population figures and Our World in Data exports. Redistribution and citation expectations for those sources are summarized in [NOTICE.md](NOTICE.md) (with links to each provider’s terms).

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

### GitHub Pages

On every push to `master` or `main`, [`.github/workflows/deploy-pages.yml`](.github/workflows/deploy-pages.yml) builds the site and pushes `dist/` to the **`gh-pages`** branch.

**One-time setup (required):**

1. Repo **Settings → Actions → General → Workflow permissions**: choose **Read and write permissions** (needed so the workflow can update the `gh-pages` branch).
2. Repo **Settings → Pages → Build and deployment**:
   - **Source**: **Deploy from a branch**
   - **Branch**: `gh-pages` / **/** (root folder)
3. Push these workflow changes and wait for the green check on the **Actions** tab (first deploy creates the `gh-pages` branch).

Live URL: [https://ercancoruh.github.io/HowManyMe/](https://ercancoruh.github.io/HowManyMe/) (may take a minute after the workflow finishes).

## License

MIT — see [LICENSE](LICENSE). Third-party data terms and attribution are in [NOTICE.md](NOTICE.md); dataset sources are documented in [src/data/README.md](src/data/README.md).
