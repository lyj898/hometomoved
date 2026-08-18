/**
 * Sitemap, generated from the data files.
 *
 * Contains canonical URLs and nothing else: no unpublished combos, no 404, no
 * alternates, no paginated variants. Every entry here must return 200 and must
 * match the self-referencing canonical on the page it points to.
 *
 * Astro's sitemap integration is deliberately not used -- it would emit every
 * built route, including the unreleased batch pages.
 */
import type { APIRoute } from 'astro';
import { publishedServices, publishedCombos } from '../lib/data';
import { canonical, paths, BATCH_0_PATHS } from '../lib/urls';

export const GET: APIRoute = () => {
  const urls: string[] = [
    // Batch 0: static pages
    ...BATCH_0_PATHS,
    // Batch 1: service pages
    ...publishedServices.map((service) => paths.service(service.slug)),
    // Batch 2 and 3: location pages, released by flipping `published` in combos.json
    ...publishedCombos.map((combo) => paths.location(combo.serviceSlug, combo.townSlug)),
  ];

  const seen = new Set<string>();
  for (const url of urls) {
    if (seen.has(url)) throw new Error(`Duplicate sitemap entry: ${url}`);
    seen.add(url);
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${canonical(url)}</loc></url>`).join('\n')}
</urlset>
`;

  return new Response(body, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
