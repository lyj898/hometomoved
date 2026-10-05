/**
 * Post-build audit of dist/.
 *
 * Checks the things that are easy to break silently and expensive to discover
 * from Search Console three months later:
 *   - every page has exactly one self-referencing canonical
 *   - titles <= 60 chars, meta descriptions <= 155
 *   - titles and descriptions are unique across indexable pages
 *   - every internal href resolves to a built file
 *   - no indexable page links to a noindex page
 *   - sitemap entries all exist, are canonical, and are never noindex
 *   - JSON-LD parses, and carries no leftover [PLACEHOLDER]
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, posix } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const ORIGIN = 'https://hometomoved.com';

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    return statSync(full).isDirectory() ? walk(full) : [full];
  });
}

const htmlFiles = walk(DIST).filter((f) => f.endsWith('.html'));

/** dist/moving/x/y/index.html -> /moving/x/y/ */
function urlPathOf(file) {
  const rel = relative(DIST, file).split('\\').join('/');
  if (rel === 'index.html') return '/';
  if (rel === '404.html') return '/404.html';
  return '/' + posix.dirname(rel) + '/';
}

const errors = [];
const pages = new Map();

for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const path = urlPathOf(file);

  const canonicals = [...html.matchAll(/<link rel="canonical" href="([^"]+)"/g)].map((m) => m[1]);
  const title = html.match(/<title>([\s\S]*?)<\/title>/)?.[1] ?? '';
  const description = html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '';
  const noindex = /<meta name="robots" content="noindex/.test(html);
  const jsonLd = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1] ?? '';
  const hrefs = [...html.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]);

  if (canonicals.length !== 1) errors.push(`${path}: ${canonicals.length} canonical tags, expected 1`);
  if (path !== '/404.html' && !noindex && canonicals[0] !== ORIGIN + path) {
    errors.push(`${path}: canonical is not self-referencing (${canonicals[0]})`);
  }
  if (title.length > 60) errors.push(`${path}: title ${title.length} chars`);
  if (description.length > 155) errors.push(`${path}: description ${description.length} chars`);
  if (!title) errors.push(`${path}: no title`);
  if (!description) errors.push(`${path}: no meta description`);

  if (!jsonLd) {
    errors.push(`${path}: no JSON-LD`);
  } else {
    try {
      const parsed = JSON.parse(jsonLd);
      const types = (parsed['@graph'] ?? []).map((n) => n['@type']);
      if (!types.includes('Organization')) errors.push(`${path}: JSON-LD missing Organization`);
      if (types.filter((t) => t === 'Organization').length > 1) errors.push(`${path}: multiple Organization nodes`);
      if (types.includes('LocalBusiness')) errors.push(`${path}: LocalBusiness present -- forbidden`);
      if (types.includes('AggregateRating') || jsonLd.includes('aggregateRating')) {
        errors.push(`${path}: AggregateRating present -- forbidden until reviews exist`);
      }
      if (/\[[A-Z_ ]+\]/.test(jsonLd)) errors.push(`${path}: JSON-LD contains a [PLACEHOLDER]`);
    } catch {
      errors.push(`${path}: JSON-LD does not parse`);
    }
  }

  // Rendered word count of <main>, tags and entities stripped. This is what a
  // reader actually gets, so it is what the minimums are measured against.
  const mainHtml = html.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? '';
  const text = mainHtml
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const wordCount = text ? text.split(' ').length : 0;

  if (/^\/moving\/[^/]+\/$/.test(path) && wordCount < 800) {
    errors.push(`${path}: service page has ${wordCount} words, minimum 800`);
  }
  if (/^\/moving\/[^/]+\/[^/]+\/$/.test(path) && wordCount < 500) {
    errors.push(`${path}: location page has ${wordCount} words, minimum 500`);
  }
  // Static pages were previously ungated, which is how /vendor-standards/
  // shipped as a 177-word stub still saying "Phase 4 writes this page in full".
  if (!path.startsWith('/moving/') && path !== '/404.html' && path !== '/thank-you/' && wordCount < 250) {
    errors.push(`${path}: static page has ${wordCount} words, minimum 250`);
  }

  // Build scaffolding must never reach a live page.
  for (const marker of [/\bPhase \d\b/, /\bTODO\b/, /\bLorem ipsum\b/i, /\bplaceholder text\b/i]) {
    const hit = text.match(marker);
    if (hit) errors.push(`${path}: build scaffolding left in copy: "${hit[0]}"`);
  }

  // Singapore English. "walk-up apartment" is the correct local term for the
  // pre-war and mid-century private blocks in Geylang, Tiong Bahru and Katong,
  // so it is exempted before the US-usage check runs.
  const sgText = text.replace(/walk-up apartments?/gi, 'walkup');
  for (const [pattern, instead] of [
    ['\\bapartments?\\b', 'condo, flat or unit'],
    ['\\btrucks?\\b', 'lorry'],
    ['\\brealtors?\\b', 'property agent'],
    ['\\bzip ?codes?\\b', 'postal code'],
    ['\\belevators?\\b', 'lift'],
  ]) {
    if (new RegExp(pattern, 'i').test(sgText)) {
      errors.push(`${path}: US-market wording /${pattern}/ — use ${instead}`);
    }
  }

  // We are a matching service, never the provider. Word-boundary anchored, or
  // "four movers" trips the "our movers" check.
  for (const claim of [
    '\\bour movers\\b',
    '\\bour (trucks|lorries|vans)\\b',
    '\\bour (team|crew) will\\b',
    '\\bwe will (move|pack|collect) your\\b',
  ]) {
    if (new RegExp(claim, 'i').test(text)) {
      errors.push(`${path}: claims we perform the service: /${claim}/`);
    }
  }

  // Superlatives we cannot evidence. Skipped where the sentence is explicitly
  // disclaiming the boast rather than making it.
  for (const sup of ['no\\.? ?1\\b', 'number one', "singapore's (best|leading)", 'cheapest in singapore']) {
    const re = new RegExp(`(do not claim|never claim|not the)[^.]{0,60}${sup}|${sup}`, 'i');
    const m = text.match(re);
    if (m && !/do not claim|never claim|not the/i.test(m[0])) {
      errors.push(`${path}: unevidenced superlative "${m[0]}"`);
    }
  }

  pages.set(path, { title, description, noindex, hrefs, path, wordCount });
}

// -- link resolution -----------------------------------------------------------
// Every emitted file counts as a resolvable target, not just pages: href also
// carries assets such as /favicon.svg. Registering real files (rather than
// skipping asset extensions) means a genuinely missing asset still fails here.
const built = new Set(pages.keys());
for (const file of walk(DIST)) {
  built.add('/' + relative(DIST, file).split('\\').join('/'));
}

for (const page of pages.values()) {
  for (const href of new Set(page.hrefs)) {
    // Strip the query string and fragment: /contact/?service=X is the same
    // built page as /contact/.
    const target = href.split('#')[0].split('?')[0];
    if (!target || target.startsWith('/_astro/')) continue;
    if (!built.has(target)) errors.push(`${page.path}: broken internal link -> ${href}`);
    else if (!page.noindex && pages.get(target)?.noindex && target !== '/404.html') {
      errors.push(`${page.path}: indexable page links to noindex page ${target}`);
    }
  }
}

// -- orphans -------------------------------------------------------------------
const linkedTo = new Set();
for (const page of pages.values()) for (const h of page.hrefs) linkedTo.add(h.split('#')[0].split('?')[0]);
const indexable = [...pages.values()].filter((p) => !p.noindex && p.path !== '/404.html');
for (const page of indexable) {
  if (page.path !== '/' && !linkedTo.has(page.path)) errors.push(`ORPHAN: nothing links to ${page.path}`);
}

// -- uniqueness ----------------------------------------------------------------
for (const field of ['title', 'description']) {
  const seen = new Map();
  for (const page of indexable) {
    const value = page[field];
    if (seen.has(value)) errors.push(`Duplicate ${field}: ${page.path} and ${seen.get(value)}`);
    else seen.set(value, page.path);
  }
}

// -- entity link -----------------------------------------------------------------
// The outbound link to the operating entity belongs on /about/ and nowhere
// else. One link from the page that explains the relationship, rather than the
// same link repeated in every footer.
const ENTITY_URL = 'https://junktoclear.com.sg';
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const path = urlPathOf(file);
  const links = (html.match(new RegExp(`href="${ENTITY_URL}`, 'g')) ?? []).length;
  if (path === '/about/' && links === 0) {
    errors.push(`/about/: expected a link to ${ENTITY_URL}, found none`);
  }
  if (path !== '/about/' && links > 0) {
    errors.push(`${path}: links to ${ENTITY_URL} — that link belongs on /about/ only`);
  }
}

// -- family links ----------------------------------------------------------------
// Family revamp (5 Oct 2026, jtc-family/briefs/family-revamp.md): every footer
// says "Part of OurKampung", linking the mother site with rel="nofollow". It is
// the one exception to PORTFOLIO's "no sitewide or footer links", so it is for
// readers, not rankings. No link anywhere may carry noreferrer, which hides the
// visit's source from the other site's GA4.
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const path = urlPathOf(file);
  const footerAt = html.search(/<footer\b/);
  if (footerAt !== -1) {
    const link = html.slice(footerAt).match(/<a\b[^>]*href="https:\/\/ourkampung\.com\/"[^>]*>/)?.[0] ?? '';
    if (!link) errors.push(`${path}: footer lacks the "Part of OurKampung" link`);
    else if (!/\brel="[^"]*\bnofollow\b/.test(link)) errors.push(`${path}: footer OurKampung link is not rel="nofollow"`);
  }
  if (/<a\b[^>]*\brel="[^"]*\bnoreferrer\b/.test(html)) {
    errors.push(`${path}: a link carries rel="noreferrer", which hides the visit's source from the other site's GA4`);
  }
}

// -- lead form -----------------------------------------------------------------
// The whole site exists to produce leads, so the form is checked in the built
// output rather than trusted. An empty action posts back to the page itself and
// loses every enquiry silently -- which is exactly what shipped once, because an
// unset CI variable arrives as '' and `??` does not catch it.
{
  const contact = join(DIST, 'contact', 'index.html');
  const html = readFileSync(contact, 'utf8');
  const form = html.match(/<form[^>]*id="lead-form"[^>]*>/)?.[0] ?? '';
  if (!form) {
    errors.push('/contact/: lead form not found');
  } else {
    const action = form.match(/action="([^"]*)"/)?.[1] ?? '';
    if (!action) errors.push('/contact/: lead form has no action — leads would post back to the page');
    else if (!action.startsWith('https://')) errors.push(`/contact/: lead form action is not https: ${action}`);
    if (!/method="POST"/i.test(form)) errors.push('/contact/: lead form is not method=POST');
    // Without the AJAX endpoint the form falls back to a native POST, which
    // sends no generate_lead at all: every lead would go uncounted.
    if (!/data-ajax-endpoint="https:\/\/formsubmit\.co\/ajax\/[^"]+"/.test(form)) {
      errors.push('/contact/: lead form has no FormSubmit AJAX endpoint, so generate_lead would never fire');
    }
  }
  if (!/name="PDPA consent"/.test(html)) errors.push('/contact/: PDPA consent field missing');
  if (/name="PDPA consent"[^>]*\bchecked\b/.test(html)) {
    errors.push('/contact/: PDPA consent is pre-ticked — it must default to unticked');
  }
  if (!/name="_next"/.test(html)) errors.push('/contact/: no _next redirect for the native-POST fallback');

  // Family enquiry standard (jtc-family/PORTFOLIO.md, 30 Sep 2026).
  if (!/'generate_lead'/.test(html)) {
    errors.push('/contact/: lead form never sends generate_lead (family standard)');
  }
  if (!/HomeToMoved enquiry/.test(html)) {
    errors.push('/contact/: subject does not name the site (family standard: site and page in the subject)');
  }
  if (/formsubmit\.co\/(ajax\/)?[^"'\s]+@[^"'\s]+/.test(html)) {
    errors.push('/contact/: posts to a raw inbox address, not the FormSubmit alias (family standard)');
  }
}

// GA4 events and contact details, on every page.
//   - No page sends form_start or form_submit. Enhanced measurement sends both
//     itself (form_submit on every attempt, including failed ones), so a custom
//     event under either name merges into its counts.
//   - generate_lead is sent from the lead form on /contact/ and nowhere else.
//     Anywhere else it would count page views as leads.
//   - No mailto:, tel: or WhatsApp links. The form is the only channel, and a
//     failed send shows no fallback contact (family rule since 2 Oct 2026).
for (const file of htmlFiles) {
  const html = readFileSync(file, 'utf8');
  const path = urlPathOf(file);
  const sent = new Set(
    [...html.matchAll(/gtag\(\s*['"]event['"]\s*,\s*['"]([a-z_]+)['"]/g)].map((m) => m[1]),
  );
  for (const name of ['form_start', 'form_submit']) {
    if (sent.has(name)) errors.push(`${path}: sends ${name} -- enhanced measurement owns that name (family standard)`);
  }
  if (sent.has('generate_lead') && path !== '/contact/') {
    errors.push(`${path}: sends generate_lead -- only the lead form on /contact/ may`);
  }
  if (/href="(mailto:|tel:|https:\/\/(wa\.me|api\.whatsapp\.com)\/)/.test(html)) {
    errors.push(`${path}: contains a mailto:, tel: or WhatsApp link -- the site publishes no contact details`);
  }
}

// -- sitemap -------------------------------------------------------------------
const sitemap = readFileSync(join(DIST, 'sitemap.xml'), 'utf8');
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
for (const loc of locs) {
  if (!loc.startsWith(ORIGIN)) errors.push(`sitemap: non-absolute or wrong origin ${loc}`);
  const path = loc.slice(ORIGIN.length);
  if (path !== '/' && !path.endsWith('/')) errors.push(`sitemap: missing trailing slash ${loc}`);
  const page = pages.get(path);
  if (!page) errors.push(`sitemap: ${loc} was never built`);
  else if (page.noindex) errors.push(`sitemap: ${loc} is noindex`);
}
if (new Set(locs).size !== locs.length) errors.push('sitemap: duplicate entries');

// -- report --------------------------------------------------------------------
const noindexCount = [...pages.values()].filter((p) => p.noindex).length;
console.log(`${pages.size} pages built | ${indexable.length} indexable | ${noindexCount} noindex | ${locs.length} in sitemap`);
if (errors.length) {
  console.error('\nERRORS:');
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log('All build checks passed.');
