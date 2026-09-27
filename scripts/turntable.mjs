#!/usr/bin/env node
/**
 * Genera los frames de un turntable a partir de un video de órbita (Flow/Veo)
 * o de una carpeta de stills (Nano Banana).
 *
 *   node scripts/turntable.mjs --in orbit.mp4   --name manuel --frames 17
 *   node scripts/turntable.mjs --in ./stills    --name manuel --frames 17
 *
 * Salida: public/turntable/<name>-000.webp … normalizados a cuadrado, mismo
 * tamaño y misma calidad, listos para <Turntable />.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, extname, resolve } from "node:path";
import sharp from "sharp";

const args = process.argv.slice(2);
const arg = (flag, fallback) => {
  const i = args.indexOf(flag);
  return i === -1 ? fallback : args[i + 1];
};

const input = arg("--in");
const name = arg("--name");
const frames = Number(arg("--frames", 17));
const size = Number(arg("--size", 352));
const quality = Number(arg("--quality", 80));
// Los retratos llevan la cabeza arriba: recortamos desde el borde superior,
// igual que el object-position: top de .member-photo.
const gravity = arg("--gravity", "top");

if (!input || !name) {
  console.error("Uso: node scripts/turntable.mjs --in <video|carpeta> --name <slug> [--frames 17] [--size 352]");
  process.exit(1);
}

const outDir = resolve("public/turntable");
mkdirSync(outDir, { recursive: true });

const IMAGE_EXT = new Set([".png", ".jpg", ".jpeg", ".webp", ".avif"]);

/** Devuelve las rutas de los cuadros de origen, ya ordenadas. */
function collectSources() {
  const isDir = statSync(input).isDirectory();

  if (isDir) {
    return readdirSync(input)
      .filter((f) => IMAGE_EXT.has(extname(f).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, "en", { numeric: true }))
      .map((f) => join(input, f));
  }

  // Video: volcamos todos los cuadros y luego escogemos los N repartidos.
  const scratch = mkdtempSync(join(tmpdir(), "turntable-"));
  execFileSync("ffmpeg", ["-v", "error", "-i", input, join(scratch, "%05d.png")]);
  return readdirSync(scratch).sort().map((f) => join(scratch, f));
}

/** N índices repartidos parejo, extremos incluidos. */
function evenlySpaced(total, n) {
  if (n >= total) return [...Array(total).keys()];
  return Array.from({ length: n }, (_, i) => Math.round((i * (total - 1)) / (n - 1)));
}

const sources = collectSources();
if (sources.length === 0) {
  console.error(`No encontré cuadros en ${input}`);
  process.exit(1);
}

const picked = evenlySpaced(sources.length, frames);
const scratchToClean = sources[0].includes("turntable-") ? resolve(sources[0], "..") : null;

for (const [i, srcIndex] of picked.entries()) {
  const out = join(outDir, `${name}-${String(i).padStart(3, "0")}.webp`);
  await sharp(sources[srcIndex])
    .resize(size, size, { fit: "cover", position: gravity })
    .webp({ quality })
    .toFile(out);
}

if (scratchToClean) rmSync(scratchToClean, { recursive: true, force: true });

const bytes = picked.reduce((sum, _, i) => {
  const f = join(outDir, `${name}-${String(i).padStart(3, "0")}.webp`);
  return sum + statSync(f).size;
}, 0);

console.log(
  `${picked.length} frames → public/turntable/${name}-000…${String(picked.length - 1).padStart(3, "0")}.webp ` +
  `(${size}px, ${(bytes / 1024).toFixed(0)} KB en total)`
);
