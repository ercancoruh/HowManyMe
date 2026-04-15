# Third-party data and attribution

This application ships derived statistics built from publicly available inputs. The **software** is licensed under the MIT License (see [LICENSE](LICENSE)). The following notes concern **redistributed or processed data** and community expectations for attribution.

## World Bank Open Data

Population totals used in the build pipeline come from the World Bank World Development Indicators series (`SP.POP.TOTL`, 2023 snapshot). See [World Bank Open Data](https://data.worldbank.org/) and the [Terms of use for datasets](https://www.worldbank.org/en/about/legal/terms-of-use-for-datasets) (and related pages linked there). The World Bank is not responsible for this project’s estimates or interpretations.

## Our World in Data (OWID)

Age-structure inputs are derived from CSV exports published by Our World in Data. OWID’s work is typically licensed under [Creative Commons BY 4.0](https://creativecommons.org/licenses/by/4.0/); see [Our World in Data — Copyright](https://ourworldindata.org/copyright) for current terms and how to cite their material.

## Other references

Further citations for literature-based priors (Pew, WHO, UNESCO UIS, StatCounter, etc.) are summarized in [src/data/README.md](src/data/README.md) and [src/data/sources/sources.lock.json](src/data/sources/sources.lock.json).
