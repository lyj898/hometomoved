/**
 * Title and meta description construction, with the length limits enforced at
 * build time rather than checked by hand afterwards.
 *
 * A title over 60 characters or a description over 155 throws and fails the
 * build. That is deliberate: adding a town with a long name should break the
 * build loudly, not silently ship a truncated SERP snippet.
 */
import type { Service, Location } from '../types';

export const TITLE_MAX = 60;
export const DESCRIPTION_MAX = 155;

const BRAND = 'HomeToMoved';

export function assertTitle(title: string, where: string): string {
  if (title.length > TITLE_MAX) {
    throw new Error(`Title is ${title.length} chars (max ${TITLE_MAX}) on ${where}: "${title}"`);
  }
  if (!title.trim()) throw new Error(`Empty title on ${where}`);
  return title;
}

export function assertDescription(description: string, where: string): string {
  if (description.length > DESCRIPTION_MAX) {
    throw new Error(
      `Meta description is ${description.length} chars (max ${DESCRIPTION_MAX}) on ${where}: "${description}"`,
    );
  }
  if (!description.trim()) throw new Error(`Empty meta description on ${where}`);
  return description;
}

/* --------------------------------------------------------------- titles -- */

export function serviceTitle(service: Service): string {
  return assertTitle(`${service.name} Singapore | ${BRAND}`, `service/${service.slug}`);
}

export function locationTitle(service: Service, town: Location): string {
  return assertTitle(`${service.name} in ${town.name} | ${BRAND}`, `location/${service.slug}/${town.slug}`);
}

/* --------------------------------------------------------- descriptions -- */

export function serviceDescription(service: Service): string {
  return assertDescription(service.shortDescription, `service/${service.slug}`);
}

export function locationDescription(service: Service, town: Location): string {
  const text = `${service.name} in ${town.name}. Get matched with vetted, insured movers who know the estate, and compare quotes for your move.`;
  return assertDescription(text, `location/${service.slug}/${town.slug}`);
}
