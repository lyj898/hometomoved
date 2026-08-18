/**
 * The swap test, run against the built output.
 *
 * Standard: if you swapped the town name, would the page still be accurate?
 * If yes, the page is too thin.
 *
 * Method: take each location page, rename its town to a comparison town, and
 * count how many sentences no longer appear on that comparison town's real
 * page. Those sentences are the ones that would become factually wrong. The
 * floor is 150 words.
 *
 *   npm run build && node scripts/swap-test.mjs
 *
 * Exits non-zero if any pair falls below the floor.
 */
import { readFileSync, existsSync } from 'node:fs';

const DIST = new URL('../dist/', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const FLOOR = 150;

const services = JSON.parse(readFileSync(new URL('../src/data/services.json', import.meta.url), 'utf8'));
const locations = JSON.parse(readFileSync(new URL('../src/data/locations.json', import.meta.url), 'utf8'));

function mainText(serviceSlug, townSlug) {
  const file = `${DIST}moving/${serviceSlug}/${townSlug}/index.html`;
  if (!existsSync(file)) return null;
  const html = readFileSync(file, 'utf8');
  const main = html.match(/<main[^>]*>([\s\S]*?)<\/main>/)?.[1] ?? '';
  return main
    .replace(/<script[\s\S]*?<\/script>/g, ' ')
    // The unreleased-preview banner is scaffolding, not copy. Drop it so it
    // cannot inflate the score of a page that has not been released.
    .replace(/Unreleased preview[\s\S]*?combos\.json to release it\./g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z]+;|&#\d+;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const sentences = (text) =>
  text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);

const failures = [];
const scores = [];

for (const service of services.filter((s) => s.locationEnabled)) {
  for (let i = 0; i < locations.length; i++) {
    const a = locations[i];
    // Compare against the next town in the list, wrapping around. Every town is
    // tested exactly once, against a town it is not identical to.
    const b = locations[(i + 1) % locations.length];

    const textA = mainText(service.slug, a.slug);
    const textB = mainText(service.slug, b.slug);
    if (textA === null || textB === null) continue;

    const normA = sentences(textA).map((s) => s.split(a.name).join('<TOWN>'));
    const normB = new Set(sentences(textB).map((s) => s.split(b.name).join('<TOWN>')));

    const wouldBeWrong = normA.filter((s) => !normB.has(s));
    const words = wouldBeWrong.join(' ').split(/\s+/).filter(Boolean).length;

    scores.push(words);
    if (words < FLOOR) {
      failures.push(`${service.slug}: ${a.name} -> ${b.name} only ${words} words would become wrong`);
    }
  }
}

const min = Math.min(...scores);
const max = Math.max(...scores);
const avg = Math.round(scores.reduce((n, x) => n + x, 0) / scores.length);

console.log(`Swap test over ${scores.length} location pages (floor ${FLOOR} words)`);
console.log(`  words that would become factually wrong: min ${min}, avg ${avg}, max ${max}`);

if (failures.length) {
  console.error('\nTOO THIN:');
  for (const f of failures) console.error('  - ' + f);
  process.exit(1);
}
console.log('  All location pages pass the swap test.');
