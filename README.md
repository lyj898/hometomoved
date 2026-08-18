# hometomoved.com

Lead generation site for **HomeToMoved**, the trading name of **SKAP Waste Management Pte Ltd** (est. 2009).

> **We are a matching service, not a moving company.** We connect customers with vetted, insured moving
> vendors. Copy must never say "our movers", "our trucks" or "our team will arrive". This is a legal
> accuracy requirement, not a style preference. Say "matched with vetted movers".

Astro 5 · TypeScript strict · Tailwind CSS v4 · static output · Cloudflare Pages.
Singapore only, English only. There is no i18n config and no `/en/` prefix, and there never will be.

---

## Commands

```bash
npm install
npm run dev            # local dev server
npm run build          # validate data -> build -> audit output. Fails on any error.
npm run preview        # serve dist/
npm run check          # astro check (TypeScript)
npm run data:combos    # regenerate combos.json after adding a town or service
npm run data:validate  # data integrity only
npm run audit          # audit dist/ only (requires a prior build)
```

`npm run build` runs three gates in order. All three must pass:

1. **`scripts/validate-data.mjs`** — referential integrity, adjacency symmetry, housing-profile word
   counts, combo/service consistency, placeholder detection.
2. **`astro build`** — titles over 60 chars and descriptions over 155 **throw** here, from `src/lib/seo.ts`.
3. **`scripts/audit-build.mjs`** — parses every built HTML file: one self-referencing canonical each,
   unique titles and descriptions, all internal links resolve, no orphans, no indexable page linking to a
   noindex page, JSON-LD parses with no leftover placeholder, sitemap entries all exist and are never noindex.

---

## URL architecture — a one-way door

```
/                                 home
/moving/{service}/                service page
/moving/{service}/{town}/         location page (combos.json only)
/areas/                           town index
/vendor-standards/                how we vet movers
/pricing/                         pricing guide
/about/                           entity, UEN, history
/contact/  /privacy/  /terms/
```

Trailing slash on everything except root. Lowercase, hyphenated, no stopwords, no dates. Every page
carries a self-referencing absolute `<link rel="canonical">`.

**Do not change a live URL.** If one genuinely must move, add a 301 to `public/_redirects` and remove the
old URL from the sitemap in the same commit.

All paths are constructed by `src/lib/urls.ts`. Nothing else may write a path literal — `canonical()`
throws on a missing trailing slash, a relative path or an uppercase character.

---

## Data layer

Everything on this site is generated from four JSON files. **No template contains a hardcoded page list.**

| File | What it drives |
|---|---|
| `src/data/services.json` | The 7 service pages, pricing tables, FAQs |
| `src/data/locations.json` | The 27 towns, adjacency graph, housing profiles |
| `src/data/combos.json` | Which service × town location pages exist (generated) |
| `src/data/company.json` | Entity, UEN, NAP, hours, GST position |
| `src/data/site-faqs.json` | Homepage FAQs only |

Types live in `src/types/`. Templates read data through `src/lib/data.ts` and never import the JSON directly.

### Add a town

1. Append an entry to `src/data/locations.json`:
   - `slug` — lowercase, hyphenated.
   - `adjacentSlugs` — **the graph must stay symmetric.** If you add `X` to `bedok`, add `bedok` to `X`.
     The validator reports one-way edges as warnings; keep them at zero.
   - `housingProfile` — **60 to 100 words, enforced.** Dominant flat types, estate age, lift vs walk-up
     reality, private/landed stock, and at least one moving-specific quirk. If you cannot write something
     true and specific, leave it empty — the validator will then refuse to let its pages publish.
   - `serviceAngles` — **one entry per location-enabled service, 55 to 95 words each, enforced.** This is
     the other half of the town-specific copy: it ties a fact about *this* town to the demands of *this*
     service. `housingProfile` + the angle must total **150+ words** or the build fails.
   - `populationTier` — `very-large` / `large` decide Batch 2 membership. Nothing else uses it.
2. `npm run data:combos`
3. `npm run build`

New pages appear with no template edit.

### The swap test

The brief's standard: *if you swapped the town name, would the page still be accurate?* If yes, the page is
too thin. Currently ~210 words per location page become factually wrong on a town swap, against a 150-word
floor. To check after editing:

```bash
npm run build && node scripts/swap-test.mjs
```

No town-specific claim may be written into a template. If you find yourself typing a fact about a town into
`[town].astro`, it belongs in `serviceAngles` instead.

### Add a service

1. Append to `src/data/services.json`. `h1Template` **must** contain `{town}` — service pages substitute
   `Singapore`, location pages substitute the town name, so there is only one H1 shape per service.
2. Set `locationEnabled: true` only if the service should get location pages.
3. `npm run data:combos` (only needed if `locationEnabled` is true)
4. `npm run build`

### Pricing rules

- Every figure is a **researched market range**, not our price — we are a matching service.
- `min: null` means we have no defensible figure. **Leave it null. Never guess.** The validator warns on
  every null tier so they stay visible.
- `verifiedAgainstVendorRates` is `false` on all current figures: they came from a public survey of
  Singapore mover rate pages (Aug 2026), not from our vendor network's rate card. Flip to `true` per
  service once confirmed.
- Prices exclude GST. The exact wording is `company.gstPosition` — reference it, never restate it.

---

## Publication batches

Batch membership is a flag in the data. Nothing is released by editing a template.

| Batch | Contents | Controlled by |
|---|---|---|
| 0 | home, vendor-standards, pricing, about, contact, privacy, terms, areas | `BATCH_0_PATHS` in `src/lib/urls.ts` |
| 1 | all 7 service pages | `published` in `services.json` |
| 2 | 3 services × 12 highest-population towns (36 pages) | `published` in `combos.json` |
| 3 | remaining towns (45 pages), driven by Search Console | `published` in `combos.json` |

**Unpublished location pages are still built.** They carry `noindex, nofollow`, are absent from
`sitemap.xml`, and nothing links to them — so you can preview a page at its real URL before releasing it.
To release one, set `published: true` for that combo. It enters the sitemap and internal linking turns on
automatically.

Release Batch 2 only after Batch 1 is confirmed indexed.

---

## Lead form

`/contact/` is the **only** contact channel. There are deliberately no WhatsApp, phone or email CTAs
anywhere on the site.

A seven-step wizard (`src/components/LeadForm.astro`): move type → property and access → from/to →
date → extras → your details → review. Option cards are buttons mirrored into hidden inputs, so the
values reach the form backend. No `localStorage` or `sessionStorage` — progress is in memory only.

Service and location CTAs link to `/contact/?service=…&town=…`, which preselects the move type and origin
town. The move-type cards are generated from `services.json`, so those labels always match.

### FormSubmit

Posts natively to FormSubmit, which emails the lead and redirects to `/thank-you/`. Native POST rather than
`fetch` so there is no CORS handling and no way for a network error to silently swallow a lead.

**Activation is required once.** The first submission to a new address triggers a confirmation email from
FormSubmit; click *Activate Form* in it and submissions start being delivered.

**After activating, switch to the hashed endpoint.** The default puts the destination address in the page
source where scrapers will find it. FormSubmit gives you a random token; set it and redeploy:

```bash
PUBLIC_FORM_ENDPOINT=https://formsubmit.co/your-token-here
```

Set this in the Cloudflare Pages dashboard, not in the repo. See `.env.example`.

### Analytics

GA4 renders only when `PUBLIC_GA4_ID` is set, so local builds stay clean. Two events, both with a real data
path behind them:

- `form_start` — first focus or option click on the lead form
- `form_submit` — fired on `/thank-you/`, so it counts deliveries rather than clicks

There is no generic `button_click` event. `whatsapp_click` and `phone_click` were removed along with those
CTAs.

## Structured data

One JSON-LD `@graph` per page, built in `src/lib/schema.ts`.

- A single `Organization` node at `@id: https://hometomoved.com/#org`, carrying the registered entity,
  UEN, address, phone, `foundingDate` and `areaServed: Singapore`. Every other node references it by `@id`
  rather than redeclaring the entity.
- `Service` on service and location pages, with `areaServed` set to the town or to Singapore.
- `BreadcrumbList` on nested pages.
- `FAQPage` where FAQs exist. **Not a ranking lever** — Google deprecated FAQ rich results in May 2026.
  Nothing in the design depends on it.

Three hard rules, each enforced by `scripts/audit-build.mjs`:

- **No `LocalBusiness` on location pages.** We have no premises in these towns.
- **No `AggregateRating`** until reviews have genuinely been collected.
- **No `[PLACEHOLDER]` values.** Placeholder company fields are stripped from the graph rather than emitted.

---

## Placeholders to replace before launch

In `src/data/company.json`: `[UEN]`, `[PHONE]`, `[WHATSAPP_DIGITS_NO_PLUS]`, `[EMAIL]`,
`[STREET ADDRESS]`, `[UNIT]`, `[POSTAL CODE]`.

`npm run data:validate` lists every remaining one. While a number is a placeholder, WhatsApp and phone CTAs
fall back to `/contact/` instead of emitting a broken `wa.me` or `tel:` link (`src/lib/cta.ts`).

---

## Design constraints

- **No web fonts.** System stacks only — serif headings, sans body. No font request, no FOUT, no shift.
- **No raster imagery on the homepage.** The LCP element is text. Icons are inline SVG with explicit
  `width`/`height`. If an image is ever added, dimension it.
- **No client-side JS** beyond the lead form, analytics and the mobile nav toggle. No React.
- **No `localStorage` or `sessionStorage`.**
- Sticky mobile CTA bar (WhatsApp + call). `body` has matching `padding-bottom` so it never covers the footer.

## Copy rules

Singapore English: HDB, condo, lorry, aircon. Never "apartment", "truck", "realtor", "zip code".
Prices in `S$`, GST position stated. No superlatives we cannot evidence — no "Singapore's No.1".
Do not link to hometoclean.com or any sibling site.

---

## Deployment

**Currently deployed to GitHub Pages** via `.github/workflows/deploy.yml`, because hometomoved.com
 already pointed there. Every push to `main` builds and publishes. The one required repo setting is
**Settings → Pages → Source = "GitHub Actions"**. Build-time env vars come from repo Variables
(Settings → Secrets and variables → Actions → Variables): `PUBLIC_FORM_ENDPOINT`, `PUBLIC_GA4_ID`.

`public/CNAME` carries the custom domain into the published output — do not delete it.

Note that `public/_headers` and `public/_redirects` are **Cloudflare-only** and are ignored by GitHub
Pages, so the security headers and cache rules are not currently applied. They take effect if you move to
Cloudflare Pages.

### Moving to Cloudflare Pages instead

Cloudflare Pages, from GitHub (`lyj898/hometomoved`, branch `main`).

**One-time setup in the Cloudflare dashboard** — Workers & Pages → Create → Pages → Connect to Git:

| Setting | Value |
|---|---|
| Framework preset | Astro |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Production branch | `main` |

Then under Settings → Environment variables (Production):

| Variable | Value |
|---|---|
| `NODE_VERSION` | `22` |
| `PUBLIC_FORM_ENDPOINT` | your FormSubmit token endpoint (see Lead form above) |
| `PUBLIC_GA4_ID` | your GA4 measurement ID, once you have one |

Finally Settings → Custom domains → add `hometomoved.com` and `www.hometomoved.com`.

The build is fail-safe: `npm run build` runs data validation, the output audit and the swap test, and a
failure in any of them aborts the deploy rather than shipping a broken page.

`CNAME` in the repo root is a leftover from GitHub Pages. Cloudflare Pages ignores it — the custom domain
is set in the dashboard. Harmless to leave, safe to delete.

- `public/_redirects` — currently empty. Do **not** add trailing-slash rules; that is handled by the
  directory-format build plus Cloudflare's default behaviour, and manual rules cause redirect loops.
- `public/_headers` — security headers, immutable caching on `/_astro/*`, `must-revalidate` on HTML.
