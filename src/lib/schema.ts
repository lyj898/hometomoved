/**
 * JSON-LD graph construction.
 *
 * Deliberate omissions, each of them a decision rather than an oversight:
 *
 *   - No LocalBusiness on location pages. We have no premises in these towns.
 *     Asserting one would be false structured data about physical presence.
 *   - No AggregateRating anywhere, until reviews have genuinely been collected.
 *   - FAQPage is emitted because the markup is accurate, but Google deprecated
 *     FAQ rich results in May 2026. It is not a ranking lever and no layout
 *     decision anywhere depends on it.
 *
 * Placeholder company values ([UEN], [PHONE] ...) are stripped rather than
 * emitted, so the graph never publishes a literal placeholder.
 */
import type { Service, Location } from '../types';
import { company, realValue } from './data';
import { SITE_ORIGIN, canonical, paths } from './urls';

export const ORG_ID = `${SITE_ORIGIN}/#org`;

type Json = Record<string, unknown>;

/** Drops keys whose value is undefined, so no empty properties are emitted. */
function compact(obj: Json): Json {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
}

/* --------------------------------------------------------- organization -- */

export function organizationNode(): Json {
  const street = realValue(company.address.street);
  const postal = realValue(company.address.postalCode);
  const unit = realValue(company.address.unit);

  const address =
    street || postal
      ? compact({
          '@type': 'PostalAddress',
          streetAddress: [street, unit].filter(Boolean).join(', ') || undefined,
          postalCode: postal,
          addressCountry: 'SG',
          addressLocality: 'Singapore',
        })
      : undefined;

  return compact({
    '@type': 'Organization',
    '@id': ORG_ID,
    name: company.tradingName,
    legalName: company.legalName,
    // UEN is the Singapore entity identifier. Omitted entirely while it is a
    // placeholder rather than emitted as "[UEN]".
    identifier: realValue(company.uen),
    url: SITE_ORIGIN,
    foundingDate: company.foundingDate,
    telephone: realValue(company.phone),
    email: realValue(company.email),
    address,
    areaServed: { '@type': 'Country', name: 'Singapore' },
    description: company.businessModelStatement,
  });
}

/* -------------------------------------------------------------- service -- */

/**
 * `areaServed` is the town on a location page and Singapore on a service page.
 * `provider` references the single Organization node by @id -- the entity is
 * never re-declared per page.
 */
export function serviceNode(service: Service, town?: Location): Json {
  const url = town ? canonical(paths.location(service.slug, town.slug)) : canonical(paths.service(service.slug));

  return compact({
    '@type': 'Service',
    '@id': `${url}#service`,
    name: town ? `${service.name} in ${town.name}` : `${service.name} in Singapore`,
    serviceType: service.name,
    description: town ? `${service.shortDescription} Serving ${town.name}.` : service.shortDescription,
    url,
    provider: { '@id': ORG_ID },
    areaServed: town
      ? { '@type': 'Place', name: `${town.name}, Singapore` }
      : { '@type': 'Country', name: 'Singapore' },
  });
}

/* ---------------------------------------------------------- breadcrumbs -- */

export interface Crumb {
  name: string;
  path: string;
}

export function breadcrumbNode(crumbs: Crumb[]): Json {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((crumb, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: crumb.name,
      item: canonical(crumb.path),
    })),
  };
}

/* -------------------------------------------------------------- faqpage -- */

export function faqNode(faqs: { q: string; a: string }[]): Json | undefined {
  if (faqs.length === 0) return undefined;
  return {
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.q,
      acceptedAnswer: { '@type': 'Answer', text: faq.a },
    })),
  };
}

/* ---------------------------------------------------------------- graph -- */

/** Wraps nodes into a single @graph. One script tag per page, always. */
export function buildGraph(nodes: (Json | undefined)[]): string {
  return JSON.stringify(
    {
      '@context': 'https://schema.org',
      '@graph': nodes.filter((n): n is Json => n !== undefined),
    },
    null,
    2,
  );
}
