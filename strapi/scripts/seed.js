'use strict';

/**
 * Seeds the Synthora demo content (blog posts, careers, case studies and their images)
 * from data/seed.json.
 *
 *   npm run seed            # only when the database has no content yet
 *   npm run seed -- --force # wipe the three collections and seed again
 *
 * It also allows the Public role to read (find / findOne) the three collections,
 * so the Astro site can fetch published content without a token.
 */

const fs = require('fs');
const path = require('path');
const { compileStrapi, createStrapi } = require('@strapi/strapi');
const { DATA_DIR, TYPES, MIME, loadSeed, prepareEntry } = require('./lib/seed-data');

const seed = loadSeed();
const force = process.argv.includes('--force');

/** media key -> uploaded file entity */
const uploaded = new Map();

async function uploadMedia(key) {
  if (uploaded.has(key)) return uploaded.get(key);
  const { file, alt } = seed.media[key];
  const filepath = path.join(DATA_DIR, 'uploads', file);
  const [entity] = await strapi
    .plugin('upload')
    .service('upload')
    .upload({
      files: { filepath, originalFilename: file, mimetype: MIME[path.extname(file)], size: fs.statSync(filepath).size },
      data: { fileInfo: { name: file, alternativeText: alt, caption: '' } },
    });
  uploaded.set(key, entity);
  return entity;
}

const resolvers = {
  mediaId: async (key) => (await uploadMedia(key)).id,
  mediaFile: uploadMedia,
};

async function isEmpty() {
  for (const { uid } of TYPES) {
    if ((await strapi.documents(uid).count({})) > 0) return false;
  }
  return true;
}

async function wipe() {
  for (const { uid } of TYPES) {
    const docs = await strapi.documents(uid).findMany({ fields: ['documentId'], status: 'draft' });
    for (const { documentId } of docs) await strapi.documents(uid).delete({ documentId });
  }
}

async function allowPublicRead() {
  const role = await strapi.db.query('plugin::users-permissions.role').findOne({ where: { type: 'public' } });
  for (const { uid } of TYPES) {
    for (const verb of ['find', 'findOne']) {
      const action = `${uid}.${verb}`;
      const exists = await strapi.db.query('plugin::users-permissions.permission').findOne({ where: { action, role: role.id } });
      if (!exists) await strapi.db.query('plugin::users-permissions.permission').create({ data: { action, role: role.id } });
    }
  }
}

async function run() {
  if (!(await isEmpty())) {
    if (!force) {
      console.log('Content already exists, skipping seed (use --force to replace it).');
      return;
    }
    console.log('Removing existing content...');
    await wipe();
  }

  // Entries are created in the seed's order (oldest first): the site sorts "newest first"
  // lists by creation date, like the original template.
  for (const type of TYPES) {
    for (const entry of seed[type.key]) {
      await strapi.documents(type.uid).create({ data: await prepareEntry(type, entry, resolvers), status: 'published' });
    }
    console.log(`${type.label}: ${seed[type.key].length}`);
  }
  console.log(`media files: ${uploaded.size}`);
}

async function main() {
  const appContext = await compileStrapi();
  const app = await createStrapi(appContext).load();
  app.log.level = 'error';
  try {
    await run();
    await allowPublicRead();
    console.log('Public read access enabled for blog posts, careers and case studies.');
  } finally {
    await app.destroy();
  }
}

main().then(
  () => process.exit(0),
  (error) => {
    console.error(error);
    process.exit(1);
  },
);
