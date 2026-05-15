import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

// We keep `output: 'static'` so the marketing pages, blog reader, and
// admin shell still pre-render to plain HTML (no SSR cost for the 99%
// of traffic that's just reading the site).
//
// The Vercel adapter lets individual routes opt OUT of prerendering
// with `export const prerender = false;` at the top of the file —
// those become serverless functions automatically. We use that for
// the TikTok OAuth endpoints at /auth/tiktok/start + callback.
export default defineConfig({
  site: 'https://fampass.io',
  output: 'static',
  adapter: vercel(),
  build: {
    format: 'file'
  },
  compressHTML: true
});
