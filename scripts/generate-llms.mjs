// Genera dist/llms-full.txt a partir del HTML ya construido.
//
// Se ejecuta después de `astro build` (ver el script "build" en package.json).
// La idea es que el volcado para agentes salga del contenido real publicado y
// no de un archivo paralelo que hay que acordarse de actualizar a mano.

import { readFile, writeFile, readdir, stat } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';

const DIST = new URL('../dist/', import.meta.url).pathname;
const SITE = 'https://srhide.com';

// Orden de lectura pensado para un agente: primero español (la raíz del
// sitio), después inglés. Dentro de cada idioma, home y luego servicios.
const ORDER = [
  '/',
  '/comerciales-con-ia-colombia/',
  '/contenido-redes-sociales-ia-bogota/',
  '/postproduccion-con-ia/',
  '/zero-data-retention-produccion-audiovisual/',
  '/en/',
  '/en/ai-commercials-colombia/',
  '/en/social-media-content-bogota/',
  '/en/ai-post-production-colombia/',
  '/en/zero-data-retention-video-production/',
];

const ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'",
  '&apos;': "'", '&nbsp;': ' ', '&mdash;': '—', '&ndash;': '–', '&hellip;': '…',
};

function decode(text) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&[a-z#0-9]+;/gi, (entity) => ENTITIES[entity] ?? entity);
}

function clean(html) {
  return decode(html.replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
}

// Quita todo lo que no es contenido: scripts, estilos, navegación y pie.
// El pie y el menú se repiten en las diez páginas y sólo añaden ruido.
function contentOf(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<header[\s\S]*?<\/header>/gi, '')
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')
    .replace(/<nav[\s\S]*?<\/nav>/gi, '');
}

function extract(html) {
  const title = clean(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? '');
  const description = decode(
    html.match(/<meta\s+name="description"\s+content="([^"]*)"/i)?.[1] ?? ''
  );

  const blocks = [];
  const body = contentOf(html);
  const re = /<(h1|h2|h3|summary|p|li)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let match;

  while ((match = re.exec(body)) !== null) {
    const [, tag, inner] = match;
    const text = clean(inner);
    if (!text) continue;

    if (tag === 'h1') blocks.push(`\n## ${text}`);
    else if (tag === 'h2') blocks.push(`\n### ${text}`);
    else if (tag === 'h3') blocks.push(`\n**${text}**`);
    else if (tag === 'summary') blocks.push(`\nP: ${text}`);
    else if (tag === 'li') blocks.push(`- ${text}`);
    else blocks.push(text);
  }

  // Las páginas comparten el formulario de contacto y el CTA final: si el
  // mismo párrafo ya salió antes en la página, no lo repetimos.
  const seen = new Set();
  const unique = blocks.filter((block) => {
    if (seen.has(block)) return false;
    seen.add(block);
    return true;
  });

  return { title, description, body: unique.join('\n') };
}

async function findPages(dir, found = []) {
  for (const entry of await readdir(dir)) {
    const full = join(dir, entry);
    if ((await stat(full)).isDirectory()) await findPages(full, found);
    else if (entry === 'index.html') {
      const route = `/${relative(DIST, full).split(sep).slice(0, -1).join('/')}`;
      found.push(route === '/' ? '/' : `${route}/`);
    }
  }
  return found;
}

const available = await findPages(DIST);
const routes = [
  ...ORDER.filter((route) => available.includes(route)),
  ...available.filter((route) => !ORDER.includes(route) && route !== '/404/'),
];

// Primero se extrae todo, porque el índice de arriba necesita los títulos.
const pages = [];
for (const route of routes) {
  const html = await readFile(join(DIST, route.slice(1), 'index.html'), 'utf8');
  pages.push({ route, ...extract(html) });
}

const parts = [
  '# Sr. Hide — contenido completo del sitio',
  '',
  '> Volcado en texto plano de srhide.com, generado automáticamente en cada',
  '> build a partir del HTML publicado. Índice resumido en /llms.txt.',
  `> Última generación: ${new Date().toISOString().slice(0, 10)}`,
  '',
  'Estudio de producción audiovisual con IA en Bogotá, Colombia. Opera en toda',
  'América Latina. Único estudio en LATAM con Zero Data Retention sobre Google',
  'Vertex AI. Contacto: hola@srhide.com · WhatsApp +57 301 787 2595.',
  '',
  '## Índice',
  '',
  // Enlaces en Markdown: es el formato que espera tanto llmstxt.org como el
  // validador de Lighthouse, y le ahorra a un agente tener que inferir rutas.
  ...pages.map((p) => `- [${p.title}](${SITE}${p.route})`),
  '',
  '---',
];

for (const { route, title, description, body } of pages) {
  parts.push(
    '',
    `# ${title}`,
    '',
    `URL: [${SITE}${route}](${SITE}${route})`,
    `Idioma: ${route.startsWith('/en/') ? 'en' : 'es'}`,
    description ? `Resumen: ${description}` : '',
    body,
    '',
    '---'
  );
}

const output = parts.filter((part) => part !== '').join('\n').replace(/\n{3,}/g, '\n\n');

// El adaptador de Vercel ya copió dist/ a .vercel/output/static antes de que
// este script corra, así que hay que escribir en los dos sitios: dist para
// `astro preview` y el output de Vercel para lo que realmente se despliega.
const targets = [DIST, new URL('../.vercel/output/static/', import.meta.url).pathname];
const written = [];

for (const target of targets) {
  try {
    await stat(target);
  } catch {
    continue;
  }
  await writeFile(join(target, 'llms-full.txt'), `${output}\n`, 'utf8');
  written.push(relative(new URL('../', import.meta.url).pathname, target) || '.');
}

console.log(
  `llms-full.txt generado — ${routes.length} páginas, ` +
    `${(output.length / 1024).toFixed(1)} KB → ${written.join(', ')}`
);
