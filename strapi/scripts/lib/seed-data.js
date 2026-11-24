'use strict';

/**
 * Shared description of the demo content in data/seed.json, used by both seed scripts.
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');

/** Collection types, in the order they are seeded */
const TYPES = [
  {
    key: 'blogPosts',
    slug: 'blog-post',
    uid: 'api::blog-post.blog-post',
    label: 'blog posts',
    // media fields, as paths (component fields use dots)
    media: ['thumbnail', 'author.photo', 'seo.metaImage'],
    blocks: ['body'],
  },
  {
    key: 'careers',
    slug: 'career',
    uid: 'api::career.career',
    label: 'careers',
    media: ['seo.metaImage'],
    blocks: ['description'],
  },
  {
    key: 'caseStudies',
    slug: 'case-study',
    uid: 'api::case-study.case-study',
    label: 'case studies',
    media: ['coverImage', 'cardImage', 'logo', 'quoteAuthor.photo', 'seo.metaImage'],
    blocks: ['body'],
  },
];

const MIME = { '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };

function loadSeed() {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'seed.json'), 'utf8'));
}

/**
 * Returns a copy of a seed entry ready for Strapi:
 * - media keys -> `await mediaId(key)` (numeric file ids)
 * - Blocks image nodes `{ $media, alt }` -> the file object with that alternative text
 */
async function prepareEntry(type, entry, { mediaId, mediaFile }) {
  const data = JSON.parse(JSON.stringify(entry));
  for (const fieldPath of type.media) {
    const [field, sub] = fieldPath.split('.');
    const holder = sub ? data[field] : data;
    const prop = sub ?? field;
    if (!holder || !(prop in holder)) continue;
    if (holder[prop]) holder[prop] = await mediaId(holder[prop]);
    else delete holder[prop];
  }
  for (const field of type.blocks) {
    const nodes = [];
    for (const node of data[field] ?? []) {
      if (node.type === 'image' && node.image?.$media) {
        const file = await mediaFile(node.image.$media);
        nodes.push({ ...node, image: { ...file, alternativeText: node.image.alt || file.alternativeText || null } });
      } else nodes.push(node);
    }
    data[field] = nodes;
  }
  return data;
}

module.exports = { DATA_DIR, TYPES, MIME, loadSeed, prepareEntry };
