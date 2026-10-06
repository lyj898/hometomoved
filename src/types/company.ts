/**
 * The site's own identity. Rendered in the header, the footer, the
 * Organization JSON-LD node and the legal pages.
 *
 * HomeToMoved is part of the OurKampung family and is run by the OurKampung
 * team. No company runs it, so none is named: no legal name, UEN, address,
 * founding year or person (independence, 6 Oct 2026,
 * jtc-family/briefs/independence.md).
 *
 * Nor does it carry a phone number or email: the site publishes no contact
 * details at all, and the enquiry form is the only channel.
 * scripts/validate-data.mjs fails the build if any of those keys come back.
 */

export interface Company {
  /** The brand, as it appears in the header, footer and schema. */
  brandName: string;
  /** The family this site belongs to. Its team runs every family site. */
  family: {
    /** "OurKampung". Copy says the site is run by "the OurKampung team". */
    name: string;
    /** The mother site's home page: every footer's "Part of OurKampung" link. */
    url: string;
    /** The mother site's page listing the family, linked from /about/. */
    sitesUrl: string;
  };
  operatingHours: {
    /** schema.org openingHours day tokens. */
    days: string;
    opens: string;
    closes: string;
    label: string;
  }[];
  areaServed: 'Singapore';
  siteUrl: string;
  /**
   * How GST is presented on the site. Vendor quotes vary by whether the
   * individual vendor is GST-registered, so this must be stated explicitly
   * wherever a price appears.
   */
  gstPosition: string;
  /** One-line statement of what we are. Reused in legal pages and schema. */
  businessModelStatement: string;
}
