/**
 * Every URL on the site is built here.
 *
 * The architecture is a one-way door and is enforced by two rules:
 *   1. Every path except the root ends in a trailing slash.
 *   2. Canonicals are absolute, built from the `site` value in astro.config.mjs.
 *
 * Nothing outside this file may write a path literal.
 */
import { company } from './data';

/** https://hometomoved.com -- no trailing slash. */
export const SITE_ORIGIN = company.siteUrl.replace(/\/$/, '');

export const paths = {
  home: '/',
  areas: '/areas/',
  vendorStandards: '/vendor-standards/',
  pricing: '/pricing/',
  about: '/about/',
  contact: '/contact/',
  privacy: '/privacy/',
  terms: '/terms/',
  service: (serviceSlug: string): string => `/moving/${serviceSlug}/`,
  location: (serviceSlug: string, townSlug: string): string => `/moving/${serviceSlug}/${townSlug}/`,
} as const;

/** Batch 0: the static pages that ship first and are always in the sitemap. */
export const BATCH_0_PATHS: string[] = [
  paths.home,
  paths.vendorStandards,
  paths.pricing,
  paths.about,
  paths.contact,
  paths.areas,
  paths.privacy,
  paths.terms,
];

/**
 * Absolute canonical URL for a site-relative path.
 * Throws on a path that breaks the trailing-slash rule, so a malformed link
 * fails the build instead of quietly creating a duplicate.
 */
export function canonical(path: string): string {
  if (!path.startsWith('/')) throw new Error(`Path must start with "/": ${path}`);
  if (path !== '/' && !path.endsWith('/')) {
    throw new Error(`Path must end with a trailing slash: ${path}`);
  }
  if (path !== path.toLowerCase()) throw new Error(`Path must be lowercase: ${path}`);
  return `${SITE_ORIGIN}${path}`;
}
