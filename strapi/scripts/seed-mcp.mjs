/**
 * Pushes the Synthora demo content (data/seed.json) into a RUNNING Strapi through the
 * Strapi MCP server (https://docs.strapi.io/cms/features/strapi-mcp-server).
 *
 *  1. Images (data/uploads) are uploaded with the admin Upload API: the MCP server
 *     cannot upload new files ("Known limitations" in the docs).
 *  2. Their alternative texts are set with the MCP `media_update_asset` tool.
 *  3. Blog posts, careers and case studies are created with the MCP `create_*` tools,
 *     published with `publish_*` and checked with `list_*`.
 *  4. The Public role gets read access (find / findOne) so the Astro site can fetch content.
 *
 * Usage (Strapi must be running, see README.md > MCP server):
 *   STRAPI_URL=http://localhost:1337 STRAPI_ADMIN_EMAIL=... STRAPI_ADMIN_PASSWORD=... STRAPI_MCP_TOKEN=... npm run seed:mcp
 *
 * STRAPI_MCP_TOKEN is an Admin token (Settings > Admin tokens) with read, create, update and
 * publish on the three collections plus Media Library read/update. The script is idempotent:
 * files and entries that already exist (same file name / slug) are skipped.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createMcpClient } from './lib/mcp-client.mjs';

const require = createRequire(import.meta.url);
const { DATA_DIR, TYPES, MIME, loadSeed, prepareEntry } = require('./lib/seed-data.js');

const STRAPI_URL = (process.env.STRAPI_URL || 'http://localhost:1337').replace(/\/+$/, '');
const { STRAPI_ADMIN_EMAIL, STRAPI_ADMIN_PASSWORD, STRAPI_MCP_TOKEN } = process.env;

if (!STRAPI_ADMIN_EMAIL || !STRAPI_ADMIN_PASSWORD || !STRAPI_MCP_TOKEN) {
  console.error('Set STRAPI_ADMIN_EMAIL, STRAPI_ADMIN_PASSWORD and STRAPI_MCP_TOKEN (an Admin token, Settings > Admin tokens).');
  process.exit(1);
}

const seed = loadSeed();
const mcp = createMcpClient({ url: STRAPI_URL, token: STRAPI_MCP_TOKEN });

// ---------- admin session (Upload API and role permissions)

async function adminJwt() {
  const res = await fetch(`${STRAPI_URL}/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: STRAPI_ADMIN_EMAIL, password: STRAPI_ADMIN_PASSWORD }),
  });
  if (!res.ok) throw new Error(`Admin login failed: ${res.status} ${await res.text()}`);
  return (await res.json()).data.token;
}

/** Uploads every seed image that is not in the Media Library yet; returns file name -> file */
async function uploadMedia(jwt) {
  const headers = { Authorization: `Bearer ${jwt}` };
  const existing = await (await fetch(`${STRAPI_URL}/upload/files?pageSize=500`, { headers })).json();
  const byName = new Map((existing.results ?? existing).map((f) => [f.name, f]));
  for (const { file } of Object.values(seed.media)) {
    if (byName.has(file)) continue;
    const form = new FormData();
    form.append('files', new Blob([await fs.readFile(path.join(DATA_DIR, 'uploads', file))], { type: MIME[path.extname(file)] }), file);
    const res = await fetch(`${STRAPI_URL}/upload`, { method: 'POST', headers, body: form });
    if (!res.ok) throw new Error(`Upload ${file} failed: ${res.status} ${await res.text()}`);
    const [uploaded] = await res.json();
    byName.set(file, uploaded);
    console.log(`  uploaded ${file}`);
  }
  return byName;
}

async function allowPublicRead(jwt) {
  const headers = { Authorization: `Bearer ${jwt}`, 'Content-Type': 'application/json' };
  const { roles } = await (await fetch(`${STRAPI_URL}/users-permissions/roles`, { headers })).json();
  const pub = roles.find((r) => r.type === 'public');
  const { role } = await (await fetch(`${STRAPI_URL}/users-permissions/roles/${pub.id}`, { headers })).json();
  for (const t of TYPES) {
    const controller = role.permissions[`api::${t.slug}`]?.controllers?.[t.slug];
    if (!controller) throw new Error(`No permissions entry for api::${t.slug}`);
    controller.find.enabled = true;
    controller.findOne.enabled = true;
  }
  const res = await fetch(`${STRAPI_URL}/users-permissions/roles/${pub.id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ name: role.name, description: role.description, permissions: role.permissions }),
  });
  if (!res.ok) throw new Error(`Updating the Public role failed: ${res.status} ${await res.text()}`);
}

// ---------- MCP helpers

const rows = (result) => result?.data ?? result?.results ?? result?.items ?? [];

async function listAll(slug) {
  const out = [];
  for (let page = 1; ; page++) {
    const result = await mcp.call(`list_${slug}`, { status: 'draft', page, pageSize: 100 });
    const items = rows(result);
    out.push(...items);
    const pageCount = result?.meta?.pagination?.pageCount ?? result?.pagination?.pageCount ?? 1;
    if (page >= pageCount || items.length === 0) return out;
  }
}

// ---------- run

const jwt = await adminJwt();
const init = await mcp.initialize();
console.log(`MCP: ${init.serverInfo?.name ?? 'strapi'} (protocol ${init.protocolVersion})`);
const tools = (await mcp.listTools()).map((t) => t.name);
for (const t of TYPES) {
  for (const op of ['list', 'create', 'publish']) {
    if (!tools.includes(`${op}_${t.slug}`)) throw new Error(`MCP tool ${op}_${t.slug} is missing: check the Admin token permissions.`);
  }
}

console.log('Media');
const files = await uploadMedia(jwt);
const fileOf = (key) => files.get(seed.media[key].file);
for (const [key, { alt }] of Object.entries(seed.media)) {
  const file = fileOf(key);
  if (alt && file.alternativeText !== alt) await mcp.call('media_update_asset', { id: file.id, alternativeText: alt });
}
console.log(`  ${files.size} files in the Media Library`);

const resolvers = { mediaId: async (key) => fileOf(key).id, mediaFile: async (key) => fileOf(key) };

for (const t of TYPES) {
  const existing = new Set((await listAll(t.slug)).map((e) => e.slug));
  let created = 0;
  // creation order = seed order (oldest first), which the site uses for "newest first" lists
  for (const entry of seed[t.key]) {
    if (existing.has(entry.slug)) continue;
    const data = await prepareEntry(t, entry, resolvers);
    const result = await mcp.call(`create_${t.slug}`, { data });
    const documentId = result?.data?.documentId ?? result?.documentId;
    if (!documentId) throw new Error(`create_${t.slug} returned no documentId: ${JSON.stringify(result).slice(0, 300)}`);
    await mcp.call(`publish_${t.slug}`, { documentId });
    created++;
  }
  const published = rows(await mcp.call(`list_${t.slug}`, { status: 'published', pageSize: 100 })).length;
  console.log(`${t.key}: ${created} created, ${published} published`);
}

await allowPublicRead(jwt);
console.log('Public read access enabled for blog posts, careers and case studies.');
