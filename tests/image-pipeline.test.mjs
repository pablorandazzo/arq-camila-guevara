import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, access, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';

test('Sveltia WebP uploads and SVG media produce usable image metadata', async () => {
  const tempRoot = join(tmpdir(), 'opencode');
  await mkdir(tempRoot, { recursive: true });
  const root = await mkdtemp(join(tempRoot, 'sveltia-images-'));
  try {
    await mkdir(join(root, 'assets/images'), { recursive: true });
    await mkdir(join(root, 'src/content/projects'), { recursive: true });
    await mkdir(join(root, 'src/lib'), { recursive: true });
    const photo = '/assets/images/cms-photo.webp';
    const vector = '/assets/images/cms-diagram.svg';
    await sharp({ create: { width: 1800, height: 1200, channels: 3, background: '#c4ae9d' } })
      .webp({ quality: 82 }).toFile(join(root, photo.slice(1)));
    await writeFile(join(root, vector.slice(1)), '<svg xmlns="http://www.w3.org/2000/svg" width="240" height="120" viewBox="0 0 240 120"><rect width="240" height="120"/></svg>');
    await writeFile(join(root, 'src/content/site.json'), JSON.stringify({ home: { sections: [{ type: 'home_hero', image: photo }, { image: vector }] } }));

    await promisify(execFile)(process.execPath, [fileURLToPath(new URL('../scripts/prepare-images.mjs', import.meta.url))], { cwd: root });
    const manifest = JSON.parse(await readFile(join(root, 'src/lib/image-manifest.json'), 'utf8'));
    assert.equal(manifest[photo].width, 1800);
    assert.equal(manifest[photo].height, 1200);
    assert.deepEqual(manifest[photo].sources.map(source => source.width), [640, 800, 1280, 1600, 1800]);
    const variant = join(root, manifest[photo].sources[1].src.slice(1));
    await access(variant);
    assert.equal((await sharp(await readFile(variant)).metadata()).format, 'webp');
    const mobileHero = join(root, manifest[photo].mobileHero.src.slice(1));
    assert.equal((await sharp(await readFile(mobileHero)).metadata()).format, 'heif');
    assert.ok(manifest[photo].mobileHero.height > manifest[photo].mobileHero.width * 2, 'mobile hero uses a portrait crop');
    assert.deepEqual(manifest[vector], { width: 240, height: 120, sources: [{ width: 240, src: vector }] });
  } finally {
    await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});
