/**
 * Demo content for builds without a Strapi server (STRAPI_URL not set), e.g. the
 * theme's live demo. It reads the same data the Strapi seed script imports
 * (strapi/data/seed.json) and returns it in the shape of the Strapi REST API.
 * The images are served from /cms-demo/ (see integrations/strapi-media.mjs).
 */
import fs from 'node:fs';
import path from 'node:path';

export const DEMO_MEDIA_PATH = '/cms-demo/';

type Entry = Record<string, any>;

interface Seed {
  media: Record<string, { file: string; alt: string; width?: number | null; height?: number | null }>;
  blogPosts: Entry[];
  careers: Entry[];
  caseStudies: Entry[];
}

/** Per collection: the seed key, media fields (dots for component fields) and Blocks fields */
const COLLECTIONS: Record<string, { key: keyof Omit<Seed, 'media'>; media: string[]; blocks: string[] }> = {
  'blog-posts': { key: 'blogPosts', media: ['thumbnail', 'author.photo', 'seo.metaImage'], blocks: ['body'] },
  careers: { key: 'careers', media: ['seo.metaImage'], blocks: ['description'] },
  'case-studies': {
    key: 'caseStudies',
    media: ['coverImage', 'cardImage', 'logo', 'quoteAuthor.photo', 'seo.metaImage'],
    blocks: ['body'],
  },
};

let seed: Seed | undefined;
function loadSeed(): Seed {
  seed ??= JSON.parse(fs.readFileSync(path.join(process.cwd(), 'strapi', 'data', 'seed.json'), 'utf8')) as Seed;
  return seed;
}

export function demoCollection(pluralApiId: string): Entry[] {
  const s = loadSeed();
  const collection = COLLECTIONS[pluralApiId];
  if (!collection) throw new Error(`No demo content for "${pluralApiId}"`);
  const media = (k?: string | null, alt?: string) => {
    if (!k) return null;
    const { file, alt: fileAlt, width = null, height = null } = s.media[k];
    return { id: 0, url: DEMO_MEDIA_PATH + file, alternativeText: alt || fileAlt, width, height, mime: '' };
  };
  // The seed lists entries oldest first, like the order the seed script creates them in Strapi
  return s[collection.key].map((entry, i) => {
    const out: Entry = { id: i + 1, createdAt: new Date(Date.UTC(2026, 0, 1, 0, i)).toISOString(), ...structuredClone(entry) };
    for (const fieldPath of collection.media) {
      const [field, sub] = fieldPath.split('.');
      const holder = sub ? out[field] : out;
      const prop = sub ?? field;
      if (holder && prop in holder) holder[prop] = media(holder[prop]);
    }
    for (const f of collection.blocks) {
      out[f] = (out[f] ?? []).map((n: Entry) => (n.type === 'image' ? { ...n, image: media(n.image.$media, n.image.alt) } : n));
    }
    return out;
  });
}
