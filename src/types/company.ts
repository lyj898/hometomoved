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
