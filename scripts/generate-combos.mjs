/**
 * Regenerates src/data/combos.json from services.json + locations.json.
 *
 * Run after adding a town, or after flipping `locationEnabled` on a service:
 *   npm run data:combos
 *
 * Batch rules:
 *   batch 2 = towns in the very-large and large population tiers (12 towns)
 *   batch 3 = everything else
 *
 * `published` is NEVER set by this script. It is owned by a human and controls
 * sitemap membership. Existing published flags are preserved on regeneration.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const services = read('../src/data/services.json');
const locations = read('../src/data/locations.json');

const combosPath = new URL('../src/data/combos.json', import.meta.url);
const existing = existsSync(combosPath)
  ? new Map(JSON.parse(readFileSync(combosPath, 'utf8')).map((c) => [c.id, c]))
  : new Map();

const BATCH_2_TIERS = new Set(['very-large', 'large']);

const combos = [];
for (const service of services.filter((s) => s.locationEnabled)) {
  for (const town of locations) {
    const id = `${service.slug}/${town.slug}`;
    combos.push({
      serviceSlug: service.slug,
      townSlug: town.slug,
      id,
      batch: BATCH_2_TIERS.has(town.populationTier) ? 2 : 3,
      published: existing.get(id)?.published ?? false,
    });
  }
}

writeFileSync(combosPath, JSON.stringify(combos, null, 2) + '\n');

const b2 = combos.filter((c) => c.batch === 2).length;
console.log(
  `combos.json: ${combos.length} combos ` +
    `(${services.filter((s) => s.locationEnabled).length} services x ${locations.length} towns) ` +
    `| batch 2: ${b2} | batch 3: ${combos.length - b2} | published: ${combos.filter((c) => c.published).length}`,
);
