/**
 * Service data contract.
 *
 * HomeToMoved is a MATCHING SERVICE. Every price in this file describes what
 * matched vendors charge in the Singapore market -- never what "we" charge.
 * Copy generated from these fields must never imply we perform the move.
 */

export interface Faq {
  q: string;
  a: string;
}

/** How the market prices this service. Drives the pricing copy on the page. */
export type PricingModel =
  | 'per-truck-load'
  | 'per-item'
  | 'per-hour'
  | 'per-trip'
  | 'per-box'
  | 'per-project';

export interface PriceRangeSGD {
  /** null = we do not have a defensible figure yet. Never guess. */
  min: number | null;
  max: number | null;
  /** Human-readable basis, e.g. "per move (whole-flat, one lorry load)". */
  unit: string;
  /** Basis, GST position, and what still needs confirming. */
  notes: string;
  /**
   * false = figure came from a public market survey, not from our vendor
   * network's rate card. Must be confirmed before the price is published.
   */
  verifiedAgainstVendorRates: boolean;
}

/** Granular published tiers, e.g. per flat type or per item type. */
export interface PriceTier {
  label: string;
  min: number | null;
  max: number | null;
  unit: string;
  notes: string;
}

/** One step of how the job actually runs, start to finish. */
export interface ProcessStep {
  title: string;
  body: string;
}

export interface Service {
  slug: string;
  name: string;
  /** Supports {town}. Service pages use the string with {town} stripped. */
  h1Template: string;
  shortDescription: string;
  longDescription: string;
  inclusions: string[];
  exclusions: string[];
  pricingModel: PricingModel;
  priceRangeSGD: PriceRangeSGD;
  priceTiers: PriceTier[];
  /** Service-specific, not a generic 4-step marketing ladder. */
  process: ProcessStep[];
  durationTypical: string;
  faqs: Faq[];
  relatedServiceSlugs: string[];
  /** true = this service is eligible for /moving/{service}/{town}/ pages. */
  locationEnabled: boolean;
  /** Publication batch. 1 = all service pages. Controls sitemap entry. */
  batch: number;
  published: boolean;
}
