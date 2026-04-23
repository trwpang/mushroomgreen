# Pointing mushroomgreen.uk at Netlify

The site is live at <https://mushroom-green.netlify.app>. To make `mushroomgreen.uk` serve the same content:

## 1. Add the custom domain in Netlify

1. Open <https://app.netlify.com/projects/mushroom-green>
2. **Project configuration → Domain management → Production domains → Add a domain**
3. Enter `mushroomgreen.uk` and confirm
4. Netlify will display the DNS records you need to add

## 2. Update DNS at your registrar

You bought `mushroomgreen.uk` — log in to whichever registrar you used. Add **two records**:

| Type | Host | Value |
|------|------|-------|
| `A` | `@` (apex) | The Netlify load-balancer IP shown in the Domain settings page (usually `75.2.60.5`, but always copy from Netlify's UI in case it changes) |
| `CNAME` | `www` | `mushroom-green.netlify.app` |

If the registrar's UI doesn't have an `@` for the apex, leave the host field blank.

## 3. Wait for DNS propagation

Usually a few minutes; can take up to a few hours. Check with:

```sh
dig mushroomgreen.uk +short
dig www.mushroomgreen.uk +short
```

Once both resolve to Netlify's IP / CNAME, you're done.

## 4. Let's Encrypt certificate

Netlify auto-provisions an SSL certificate once DNS resolves. Should appear under Domain settings → HTTPS within a minute of DNS resolving. No action needed.

## 5. Set primary domain + redirect

In Netlify → Domain settings:

- Set `mushroomgreen.uk` as the **primary domain**
- Choose redirect direction — recommend `www.mushroomgreen.uk → mushroomgreen.uk` (apex as canonical)

## 6. Verify

Visit each URL and confirm:

- <https://mushroomgreen.uk> → loads the site, padlock present
- <https://www.mushroomgreen.uk> → redirects to apex
- <http://mushroomgreen.uk> → redirects to https
- <https://mushroom-green.netlify.app> → still works (or set up a redirect to the apex)

## Updating the site

The Netlify site is currently linked but **not** wired to the GitHub repo for auto-deploy. Two options:

**A. CLI deploys (current setup):** run `netlify deploy --build --prod` from this directory whenever you want to ship.

**B. Auto-deploy on git push (recommended once stable):** in Netlify → Project configuration → Build & deploy → Continuous deployment, link the `trwpang/mushroomgreen` GitHub repo. After that, every `git push` to `master` triggers a deploy. Branch pushes get preview URLs.
