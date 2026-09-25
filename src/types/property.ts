/**
 * Property-type pages: /property/{type}/
 *
 * A second axis alongside services and towns. Evidence for this page type came
 * from the sister site hometoclean.com, whose /property/{type}/ pages sit at
 * roughly position 3.9 while everything else on both sites averages ~68.
 *
 * Prices are NOT stored here. priceRefs point at tiers in services.json so
 * there is exactly one place a figure can be wrong.
 */

export type PropertyCategory = 'hdb' | 'condo' | 'landed';

/** Points at a priceTier in services.json by service slug + tier label. */
export interface PriceRef {
  serviceSlug: string;
  tierLabel: string;
}

export interface PropertyType {
  slug: string;
  name: string;
  /** Used in the <title> where name would push it past 60 chars. */
  shortName?: string;
  category: PropertyCategory;
  /** null where the type spans too wide a range to state honestly. */
  floorAreaSqm: { min: number; max: number } | null;
  lorry: string;
  crew: string;
  hours: { min: number; max: number };
  priceRefs: PriceRef[];
  /**
   * 80-120 words of copy specific to moving THIS property type. Must fail the
   * swap test: replacing the type name should make it factually wrong.
   */
  movingNotes: string;
  batch: number;
  published: boolean;
}
