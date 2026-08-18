/**
 * Location data contract. 27 Singapore residential towns only.
 *
 * Deliberately excluded: MRT stations, industrial estates, individual condo
 * names. Those have no meaningful search volume and produce thin pages.
 */

/**
 * Relative resident-population band, used only to order publication batches.
 * Not a published statistic -- do not render this to users as a number.
 */
export type PopulationTier = 'very-large' | 'large' | 'medium' | 'small';

export interface Location {
  slug: string;
  name: string;
  /** Must be symmetric across the dataset and reference real slugs. */
  adjacentSlugs: string[];
  /**
   * 60-100 words of genuinely town-specific fact: dominant flat types, estate
   * age, lift vs walk-up reality, private/landed stock, moving-specific quirks.
   * This is what stops every location page being the same page with a swapped
   * noun. Empty string = not yet written; page must not publish.
   */
  housingProfile: string;
  /**
   * Town + service specific copy, keyed by service slug. 55-95 words each.
   *
   * housingProfile alone is ~90 words, which is under the 150 town-specific
   * words a location page needs. This is the other half, and it is what makes
   * the page fail the swap test: the copy ties a fact about THIS town to the
   * demands of THIS service, so pasting another town name in would make it
   * factually wrong rather than merely generic.
   *
   * A combo with no angle for its service cannot be published.
   */
  serviceAngles: Record<string, string>;

  /** Internal editorial note. Never rendered. */
  notes: string;
  populationTier: PopulationTier;
}
