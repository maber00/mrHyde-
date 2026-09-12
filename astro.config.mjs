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
  adapter: vercel(),
  experimental: {
    // CSP con hashes automáticos para script/style (efectiva contra XSS).
    // No se define default-src a propósito: así frame-src (Vimeo/YouTube),
    // connect-src (fetch del formulario a Google Apps Script) e img-src
    // quedan sin restricción y nada se rompe.
    // style-src-attr 'unsafe-inline' permite los atributos style="..."
    // estáticos (p. ej. --i del menú) sin debilitar script-src.
    csp: {
      // gtag.js es un script externo: la CSP de Astro sólo emite hashes de los
      // scripts propios, así que sin permitir este host el navegador lo bloquea
      // en silencio (sin error visible) y la medición simplemente no ocurre.
      scriptDirective: {
        resources: ['https://www.googletagmanager.com'],
      },
    },
  },
});