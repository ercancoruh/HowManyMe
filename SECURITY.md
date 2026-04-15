# Security

## Reporting a vulnerability

If you believe you have found a security issue in this repository or in the published static site, please report it responsibly:

1. **GitHub**: Open a private security advisory via the repository **Security** tab → **Report a vulnerability** (preferred if the repo is on GitHub).
2. **General contact**: If advisories are unavailable, open a minimal public issue describing how to reproduce the problem without disclosing exploit details until maintainers can respond; for sensitive cases, use GitHub’s security contact options for the owning account or organization.

This project is a client-side web app with no backend in this repo; scope reports to bundled assets, build tooling, and dependency issues that affect users of the site or contributors cloning the project.

## Out of scope

- Denial-of-service against a static host, unless caused by a defect in shipped assets.
- Social engineering or misconfiguration of third-party hosting (CDN, DNS) outside this codebase.
