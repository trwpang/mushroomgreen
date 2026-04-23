# DNS rollout — done 2026-04-23

`mushroomgreen.uk` now serves the Netlify-hosted Astro site with a Let's Encrypt certificate, and pushes to `master` deploy automatically. This document records what was done so future re-points (or troubleshooting) are easy.

## Live as of 2026-04-23

- <https://mushroomgreen.uk> — primary, HTTP 200, served by Netlify Edge with HSTS
- <https://www.mushroomgreen.uk> — 301 redirect to apex
- <https://mushroom-green.netlify.app> — Netlify subdomain, also serves the same site

## Squarespace DNS records (custom)

Existing Squarespace presets that conflicted (`Squarespace Defaults` — 4 A records, CNAME `www → ext-sq.squarespace.com`, HTTPS record) were deleted. Two preset blocks were kept because they don't conflict with web routing:

- **Squarespace Domain Connect** — CNAME `_domainconnect → _domainconnect.domains.squarespace.com` (lets Squarespace re-onboard if Tom ever wants to host on Squarespace again)
- **Email Security** — TXT records for DKIM / DMARC / SPF (email-related, no conflict)

Custom records added:

| Type | Host | Value | TTL |
|------|------|-------|-----|
| ALIAS | `@` | `apex-loadbalancer.netlify.com` | 4 hrs |
| CNAME | `www` | `mushroom-green.netlify.app` | 4 hrs |

ALIAS preferred over a fixed A record because Netlify can change load-balancer IPs without breaking DNS.

## Netlify domain configuration

- Site: `mushroom-green` (project URL `https://mushroom-green.netlify.app`)
- Primary domain: `mushroomgreen.uk`
- Alias: `www.mushroomgreen.uk` (auto-redirects to apex)
- HTTPS: Let's Encrypt provisioned automatically once DNS resolved

## GitHub auto-deploy

- Repository: `trwpang/mushroomgreen` (public)
- Branch: `master`
- Build command: `npm run build`
- Publish directory: `dist`
- Trigger: push to `master`

Settings come from `netlify.toml` at the repo root; the Netlify GitHub App is installed on the `trwpang/mushroomgreen` repo.

## If something breaks

1. **Site down / 404 on apex** — check Netlify project overview for the latest deploy status; check that the ALIAS record at Squarespace still points to `apex-loadbalancer.netlify.com`.
2. **HTTPS cert error** — Netlify auto-renews. If renewal fails, "Renew certificate" button is in Netlify → Domain management → SSL/TLS certificate.
3. **DNS not resolving** — `dig +short mushroomgreen.uk @1.1.1.1` should return Netlify load-balancer IPs (e.g. `75.2.60.5`, `99.83.231.61`). If not, check Squarespace DNS Settings for the `@` ALIAS row.
4. **Push doesn't deploy** — Netlify → Project configuration → Build & deploy → Continuous deployment should show `mushroomgreen` as Current repository. If not linked, click "Link repository" and re-select.
5. **Want to host on Squarespace again later** — delete the custom ALIAS + CNAME, re-add the `Squarespace Defaults` preset.
