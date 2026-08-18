// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Absolute base for every canonical URL, the sitemap and the JSON-LD graph.
  // Nothing in the codebase may hardcode the domain -- it comes from here.
  site: 'https://hometomoved.com',

  // Singapore only, English only. No i18n config, no /en/ prefix. Ever.

  output: 'static',

  // One-way door: every URL except the root carries a trailing slash.
  // build.format 'directory' emits /about/index.html, which Cloudflare Pages
  // serves at /about/. Combined with the _redirects rules this gives exactly
  // one canonical form per page and no slash/no-slash duplication.
  trailingSlash: 'always',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },

  // Phase 5 adds the lead form endpoint and GA4 via env vars. Nothing here yet.
  vite: {
    plugins: [tailwindcss()],
    build: {
      assetsInlineLimit: 2048,
    },
  },
});
