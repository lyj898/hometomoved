/**
 * Operating entity. Rendered in the footer, the Organization JSON-LD node,
 * and the legal pages.
 *
 * Deliberately carries no UEN, address, phone or email: the site publishes no
 * contact details at all, and the enquiry form is the only channel. If those
 * ever need to come back, add them here, to organizationNode() in
 * src/lib/schema.ts, and to the footer.
 */

export interface Company {
  /** Registered entity. */
  legalName: string;
  /** Public-facing brand. */
  tradingName: string;
  /**
   * Where the registered entity name links to. Every visible mention of the
   * legal name is rendered through EntityLink.astro and points here.
   */
  entityUrl: string;
  /** The operating brand customers may already know, e.g. on the about page. */
  parentBrandName: string;
  parentBrandDescription: string;
  /**
   * How many vendors we have actually referred work to and seen perform.
   * null until a real figure is supplied -- the about page drops the number
   * from the sentence rather than printing a guess or a [PLACEHOLDER].
   */
  vettedVendorCount: number | null;
  yearEstablished: number;
  foundingDate: string;
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
