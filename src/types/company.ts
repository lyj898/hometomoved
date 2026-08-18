/**
 * Operating entity. Rendered in the footer, the Organization JSON-LD node,
 * and the legal pages. Placeholders are marked with [SQUARE BRACKETS] and
 * must be replaced before launch.
 */

export interface Company {
  /** Registered entity. Must appear in the footer verbatim. */
  legalName: string;
  /** Public-facing brand. */
  tradingName: string;
  uen: string;
  yearEstablished: number;
  foundingDate: string;
  address: {
    street: string;
    unit: string;
    postalCode: string;
    country: 'SG';
  };
  phone: string;
  email: string;
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
