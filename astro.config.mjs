// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import config from './src/config/config.json';
import strapiMedia from './integrations/strapi-media.mjs';

// https://astro.build/config
export default defineConfig({
  site: config.site.base_url,
  trailingSlash: config.site.trailing_slash ? 'always' : 'ignore',
  integrations: [strapiMedia()],
  // Same family and weights the template loads from Google Fonts (self-hosted by Astro)
  fonts: [
    {
      provider: fontProviders.google(),
      name: 'Inter Tight',
      cssVariable: '--font-inter-tight',
      weights: [300, 400, 500, 600, 700, 800, 900],
      styles: ['normal'],
      fallbacks: ['sans-serif'],
    },
  ],
  vite: {
    // pre-bundle GSAP and Lenis so the first dev page load registers the plugins
    // before the interaction runtime (public/js/webflow.js) starts
    optimizeDeps: {
      include: ['gsap', 'gsap/ScrollTrigger', 'gsap/SplitText', 'lenis'],
    },
    server: {
      // the bundled Strapi backend lives in ./strapi and has its own toolchain
      watch: { ignored: ['**/strapi/**'] },
    },
  },
});
