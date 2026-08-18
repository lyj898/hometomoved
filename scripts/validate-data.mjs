/**
 * Data-layer integrity check. Run before every build:
 *   npm run data:validate
 *
 * Exits non-zero on an error. Warnings are printed but do not fail the build.
 */
import { readFileSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const services = read('../src/data/services.json');
const locations = read('../src/data/locations.json');
const combos = read('../src/data/combos.json');
const company = read('../src/data/company.json');

const errors = [];
const warnings = [];
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

// ---------------------------------------------------------------- services --
const serviceSlugs = new Set(services.map((s) => s.slug));
if (serviceSlugs.size !== services.length) errors.push('services: duplicate slugs');

for (const s of services) {
  const at = `service ${s.slug}`;
  if (!SLUG.test(s.slug)) errors.push(`${at}: slug is not lowercase-hyphenated`);
  if (!s.h1Template.includes('{town}')) errors.push(`${at}: h1Template must contain {town}`);
  if (s.inclusions.length === 0) errors.push(`${at}: no inclusions`);
  if (s.exclusions.length === 0) errors.push(`${at}: no exclusions`);
  if (s.faqs.length < 4) errors.push(`${at}: only ${s.faqs.length} FAQs, want at least 4`);
  if (!Array.isArray(s.process) || s.process.length < 3) errors.push(`${at}: needs at least 3 process steps`);
  if (s.relatedServiceSlugs.includes(s.slug)) errors.push(`${at}: relatedServiceSlugs includes itself`);
  for (const r of s.relatedServiceSlugs) {
    if (!serviceSlugs.has(r)) errors.push(`${at}: unknown related service "${r}"`);
  }
  const { min, max } = s.priceRangeSGD;
  if (min !== null && max !== null && min > max) errors.push(`${at}: priceRangeSGD min > max`);
  if (!s.priceRangeSGD.notes.trim()) errors.push(`${at}: priceRangeSGD.notes is empty`);
  if (!s.priceRangeSGD.verifiedAgainstVendorRates) {
    warnings.push(`${at}: prices NOT yet verified against the vendor rate card`);
  }
  for (const t of s.priceTiers) {
    if (t.min !== null && t.max !== null && t.min > t.max) errors.push(`${at}: tier "${t.label}" min > max`);
    if (t.min === null) warnings.push(`${at}: tier "${t.label}" has no price — needs a figure before publishing`);
  }
}

// --------------------------------------------------------------- locations --
const townSlugs = new Set(locations.map((l) => l.slug));
if (townSlugs.size !== locations.length) errors.push('locations: duplicate slugs');
if (locations.length !== 27) errors.push(`locations: ${locations.length} towns, expected 27`);

for (const l of locations) {
  const at = `town ${l.slug}`;
  if (!SLUG.test(l.slug)) errors.push(`${at}: slug is not lowercase-hyphenated`);
  for (const a of l.adjacentSlugs) {
    if (!townSlugs.has(a)) errors.push(`${at}: unknown adjacent town "${a}"`);
    if (a === l.slug) errors.push(`${at}: adjacent to itself`);
  }
  if (new Set(l.adjacentSlugs).size !== l.adjacentSlugs.length) errors.push(`${at}: duplicate adjacents`);
  if (l.adjacentSlugs.length === 0) errors.push(`${at}: no adjacent towns — location page would have no local links`);

  // Every locationEnabled service needs an angle for this town, and the two
  // town-specific fields together must clear 150 words. Below that, a location
  // page is the same page with a swapped noun -- the exact failure this data
  // model exists to prevent.
  const profileWords = l.housingProfile.trim() ? l.housingProfile.trim().split(/\s+/).length : 0;
  for (const svc of services.filter((s) => s.locationEnabled)) {
    const angle = l.serviceAngles?.[svc.slug];
    if (!angle || !angle.trim()) {
      errors.push(`${at}: no serviceAngles["${svc.slug}"] — that location page cannot render`);
      continue;
    }
    const angleWords = angle.trim().split(/\s+/).length;
    if (angleWords < 55 || angleWords > 95) {
      errors.push(`${at}: serviceAngles["${svc.slug}"] is ${angleWords} words, must be 55-95`);
    }
    if (profileWords + angleWords < 150) {
      errors.push(
        `${at}/${svc.slug}: only ${profileWords + angleWords} town-specific words, need 150+`,
      );
    }
  }

  const words = profileWords;
  if (words === 0) {
    errors.push(`${at}: housingProfile is empty — its location pages must not publish`);
  } else if (words < 60 || words > 100) {
    errors.push(`${at}: housingProfile is ${words} words, must be 60-100`);
  }
}

// The adjacency graph is one-directional by design in the source brief. A
// one-way edge means town A links to B but B does not link back, which is a
// real internal-linking asymmetry rather than a data corruption. Surfaced as a
// warning so it stays visible without failing the build.
for (const l of locations) {
  for (const a of l.adjacentSlugs) {
    const other = locations.find((x) => x.slug === a);
    if (other && !other.adjacentSlugs.includes(l.slug)) {
      warnings.push(`adjacency is one-way: ${l.slug} -> ${a} (no return link)`);
    }
  }
}

// ------------------------------------------------------------------ combos --
const comboIds = new Set();
for (const c of combos) {
  const at = `combo ${c.id}`;
  if (comboIds.has(c.id)) errors.push(`${at}: duplicate`);
  comboIds.add(c.id);
  if (c.id !== `${c.serviceSlug}/${c.townSlug}`) errors.push(`${at}: id does not match its parts`);
  if (!serviceSlugs.has(c.serviceSlug)) errors.push(`${at}: unknown service`);
  if (!townSlugs.has(c.townSlug)) errors.push(`${at}: unknown town`);
  const svc = services.find((s) => s.slug === c.serviceSlug);
  if (svc && !svc.locationEnabled) errors.push(`${at}: service has locationEnabled=false`);
  const town = locations.find((t) => t.slug === c.townSlug);
  if (c.published && town && !town.housingProfile.trim()) {
    errors.push(`${at}: published but the town has no housingProfile`);
  }
}
const expected = services.filter((s) => s.locationEnabled).length * locations.length;
if (combos.length !== expected) {
  errors.push(`combos: ${combos.length} entries, expected ${expected} — run npm run data:combos`);
}

// ----------------------------------------------------------------- company --
for (const [k, v] of Object.entries(company)) {
  if (typeof v === 'string' && /\[[A-Z_ ]+\]/.test(v)) warnings.push(`company.${k} is still a placeholder: ${v}`);
}
for (const [k, v] of Object.entries(company.address)) {
  if (typeof v === 'string' && /\[[A-Z_ ]+\]/.test(v)) warnings.push(`company.address.${k} is still a placeholder: ${v}`);
}

// ------------------------------------------------------------------ report --
for (const w of warnings) console.warn(`  WARN  ${w}`);
for (const e of errors) console.error(`  ERROR ${e}`);
console.log(
  `\n${services.length} services, ${locations.length} towns, ${combos.length} combos ` +
    `(${combos.filter((c) => c.published).length} published) ` +
    `| ${errors.length} errors, ${warnings.length} warnings`,
);
process.exit(errors.length ? 1 : 0);
