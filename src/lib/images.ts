import manifest from './image-manifest.json';

export function imageProps(path: string, sizes: string) {
  const image = manifest[path as keyof typeof manifest];
  if (!image) throw new Error(`Missing optimized image: ${path}. Run npm run prepare:images.`);
  return {
    src: image.sources.at(-1)!.src,
    srcset: image.sources.map(source => `${source.src} ${source.width}w`).join(', '),
    sizes,
    width: image.width,
    height: image.height,
  };
}

export function mobileHeroSource(path: string) {
  const image = manifest[path as keyof typeof manifest];
  if (!image) throw new Error(`Missing optimized image: ${path}. Run npm run prepare:images.`);
  return 'mobileHero' in image ? image.mobileHero : null;
}
