import { readFile, readdir, mkdir, writeFile, stat } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join, basename, extname, resolve } from 'node:path';
import sharp from 'sharp';

const imageRoot = resolve('assets/images');
const output = join(imageRoot, 'optimized');
const manifest = {};
const paths = new Set();

function collect(value) {
  if (typeof value === 'string' && /^\/assets\/images\/[^/]+\.(jpe?g|png|webp|svg)$/i.test(value)) paths.add(value);
  else if (Array.isArray(value)) value.forEach(collect);
  else if (value && typeof value === 'object') Object.values(value).forEach(collect);
}

const site = JSON.parse(await readFile('src/content/site.json', 'utf8'));
collect(site);
const mobileHeroCrops = new Map((site.home?.sections ?? [])
  .filter(section => section.type === 'home_hero').map(section => [section.image, { ratio: 390 / 844, position: .58 }]));
for (const name of await readdir('src/content/projects')) {
  if (!name.endsWith('.json')) continue;
  const project = JSON.parse(await readFile(join('src/content/projects', name), 'utf8'));
  collect(project);
  if (project.image && !mobileHeroCrops.has(project.image)) mobileHeroCrops.set(project.image, { ratio: 390 / 750, position: .5 });
}
await mkdir(output, { recursive: true });

for (const path of [...paths].sort()) {
  const source = join(imageRoot, basename(path));
  const bytes = await readFile(source);
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 10);
  const { width, height } = await sharp(bytes).metadata();
  if (!width || !height) throw new Error(`Invalid image: ${path}`);
  if (extname(path).toLowerCase() === '.svg') {
    // Preserve vectors and their intrinsic ratio instead of rasterizing them.
    manifest[path] = { width, height, sources: [{ width, src: path }] };
    continue;
  }
  const widths = [...new Set([640, 800, 1280, 1600, 2400].filter(size => size < width).concat(Math.min(width, 2400)))].sort((a, b) => a - b);
  const sources = [];
  for (const size of widths) {
    const filename = `${basename(path, extname(path))}-${hash}-${size}.webp`;
    const target = join(output, filename);
    try { await stat(target); }
    catch { await sharp(bytes).resize({ width: size, withoutEnlargement: true }).webp({ quality: 78, effort: 4 }).toFile(target); }
    sources.push({ width: size, src: `/assets/images/optimized/${filename}` });
  }
  manifest[path] = { width, height, sources };
  if (mobileHeroCrops.has(path)) {
    // The full-screen mobile hero displays only a narrow vertical crop of a landscape photo.
    // Encode that visible crop separately so the same download budget carries more useful pixels.
    const { ratio, position } = mobileHeroCrops.get(path);
    const cropWidth = Math.min(width, Math.round(height * ratio));
    const left = Math.round((width - cropWidth) * position);
    const mobileWidth = Math.min(800, cropWidth);
    const encodeMobile = async (quality) => {
      const filename = `${basename(path, extname(path))}-${hash}-mobile${quality}-${mobileWidth}.avif`;
      const target = join(output, filename);
      try { await stat(target); }
      catch {
        await sharp(bytes).extract({ left, top: 0, width: cropWidth, height })
          .resize({ width: mobileWidth, withoutEnlargement: true })
          .avif({ quality, effort: 4 }).toFile(target);
      }
      return { src: `/assets/images/optimized/${filename}`, bytes: (await stat(target)).size };
    };
    const fallback = sources.find(source => source.width >= mobileWidth) ?? sources.at(-1);
    const budget = (await stat(join(output, basename(fallback.src)))).size;
    let mobile = await encodeMobile(40);
    if (mobile.bytes > budget) mobile = await encodeMobile(35);
    if (mobile.bytes <= budget) {
      manifest[path].mobileHero = { src: mobile.src, width: mobileWidth, height: Math.round(height * mobileWidth / cropWidth) };
    }
  }
}

await writeFile('src/lib/image-manifest.json', `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`Prepared ${paths.size} responsive images`);
