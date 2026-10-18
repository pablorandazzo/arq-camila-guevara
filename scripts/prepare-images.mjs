import { readFile, readdir, mkdir, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, basename, extname, resolve } from 'node:path';
import sharp from 'sharp';

const imageRoot = resolve('assets/images');
const output = join(imageRoot, 'optimized');
const manifest = {};
const paths = new Set();

function collect(value) {
  if (typeof value === 'string' && /^\/assets\/images\/[^/]+\.(jpe?g|png)$/i.test(value)) paths.add(value);
  else if (Array.isArray(value)) value.forEach(collect);
  else if (value && typeof value === 'object') Object.values(value).forEach(collect);
}

collect(JSON.parse(await readFile('src/content/site.json', 'utf8')));
for (const name of await readdir('src/content/projects')) {
  if (name.endsWith('.json')) collect(JSON.parse(await readFile(join('src/content/projects', name), 'utf8')));
}
await mkdir(output, { recursive: true });

for (const path of [...paths].sort()) {
  const source = join(imageRoot, basename(path));
  const bytes = await readFile(source);
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 10);
  const { width, height } = await sharp(bytes).metadata();
  if (!width || !height) throw new Error(`Invalid image: ${path}`);
  const widths = [...new Set([640, 1280, 1600, 2400].filter(size => size < width).concat(Math.min(width, 2400)))].sort((a, b) => a - b);
  const sources = [];
  for (const size of widths) {
    const filename = `${basename(path, extname(path))}-${hash}-${size}.webp`;
    const target = join(output, filename);
    try { await stat(target); }
    catch { await sharp(bytes).resize({ width: size, withoutEnlargement: true }).webp({ quality: 78, effort: 4 }).toFile(target); }
    sources.push({ width: size, src: `/assets/images/optimized/${filename}` });
  }
  manifest[path] = { width, height, sources };
}

await writeFile('src/lib/image-manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Prepared ${paths.size} responsive images`);
