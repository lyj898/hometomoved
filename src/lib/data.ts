/**
 * The single access point for site data. Templates import from here and never
 * read the JSON files directly, so that every page-generating query passes
 * through one place that understands publication batches.
 *
 * Rule: no template may contain a hardcoded list of pages. If a page exists,
 * it is because a record in src/data/ said so.
 */
import servicesJson from '../data/services.json';
import locationsJson from '../data/locations.json';
import combosJson from '../data/combos.json';
import companyJson from '../data/company.json';
import type { Service, Location, Combo, Company } from '../types';

// JSON modules widen string literals (e.g. 'SG' becomes string), so the shape
// is asserted here once. scripts/validate-data.mjs is what actually guards it,
// and it runs before every build via `npm run build`.
export const services = servicesJson as unknown as Service[];
export const locations = locationsJson as unknown as Location[];
export const combos = combosJson as unknown as Combo[];
export const company = companyJson as unknown as Company;

/* -------------------------------------------------------------- lookups -- */

export function getService(slug: string): Service {
  const found = services.find((s) => s.slug === slug);
  if (!found) throw new Error(`Unknown service slug: ${slug}`);
  return found;
}

export function getLocation(slug: string): Location {
  const found = locations.find((l) => l.slug === slug);
  if (!found) throw new Error(`Unknown town slug: ${slug}`);
  return found;
}

/* ------------------------------------------------- publication filtering -- */

/** Service pages that may be built and may enter the sitemap. */
export const publishedServices = services.filter((s) => s.published);

/**
 * Location pages that may enter the sitemap and be linked internally.
 * Unpublished combos are still BUILT, so you can preview them at their real
 * URL before releasing a batch, but they carry noindex and are linked from
 * nowhere. Flip `published` in combos.json to release one.
 */
export const publishedCombos = combos.filter((c) => c.published);

export function isComboPublished(serviceSlug: string, townSlug: string): boolean {
  return combos.some((c) => c.serviceSlug === serviceSlug && c.townSlug === townSlug && c.published);
}

/** Published location pages for a service, in data order. */
export function publishedCombosForService(serviceSlug: string): Combo[] {
  return publishedCombos.filter((c) => c.serviceSlug === serviceSlug);
}

/** Published location pages covering a town, across all services. */
export function publishedCombosForTown(townSlug: string): Combo[] {
  return publishedCombos.filter((c) => c.townSlug === townSlug);
}

/** Services eligible for location pages at all. */
export const locationEnabledServices = services.filter((s) => s.locationEnabled && s.published);

/* ---------------------------------------------------------------- graph -- */

export function adjacentLocations(townSlug: string): Location[] {
  return getLocation(townSlug).adjacentSlugs.map(getLocation);
}

/**
 * Adjacent towns that have a published page for this service. This is what a
 * location page links to -- never the raw adjacency list, or we would emit
 * links to pages that do not exist yet.
 */
export function linkableAdjacentCombos(serviceSlug: string, townSlug: string): Location[] {
  return adjacentLocations(townSlug).filter((t) => isComboPublished(serviceSlug, t.slug));
}

export function relatedServices(service: Service): Service[] {
  return service.relatedServiceSlugs.map(getService).filter((s) => s.published);
}

/* ------------------------------------------------------------------ h1 -- */

/**
 * Service pages render the same template with 'Singapore' in place of a town,
 * so there is exactly one H1 shape per service and no second template to keep
 * in sync.
 */
export function renderH1(service: Service, townName?: string): string {
  return service.h1Template.replace('{town}', townName ?? 'Singapore');
}
