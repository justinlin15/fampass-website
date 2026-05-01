import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://fampass.io',
  output: 'static',
  build: {
    format: 'file'
  },
  compressHTML: true
});
