import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import vercel from '@astrojs/vercel';
import icon from 'astro-icon';

export default defineConfig({
  site: 'https://srhide.com',
  integrations: [
    tailwind(),
    mdx(),
    sitemap(),
    icon()
  ],
  output: 'static',
  adapter: vercel({
    analytics: true, 
    imageService: true, 
  })
});