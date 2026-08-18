/**
 * Service x town combinations that may generate a location page.
 *
 * Routing reads this file and nothing else. A combo absent from here has no
 * page. A combo present but with published:false has a page that is built but
 * kept out of the sitemap until its batch is released.
 */

export interface Combo {
  serviceSlug: string;
  townSlug: string;
  /** Derived: `${serviceSlug}/${townSlug}`. Stable key for links and tests. */
  id: string;
  /** 2 = twelve highest-population towns. 3 = remainder, released on data. */
  batch: number;
  /** Sitemap and internal-link membership. Flipped by hand, per batch. */
  published: boolean;
}
