# Synthora CMS (Strapi 5)

The content backend of the Synthora Astro theme. It stores the blog posts, careers and case studies; the Astro site reads them through the REST API at build time.

## Setup

```bash
npm install
cp .env.example .env   # then replace every "tobemodified" value with a random secret
npm run seed           # demo content + public read access
npm run develop        # http://localhost:1337/admin
```

`npm run seed` only runs on an empty database. Use `npm run seed -- --force` to delete the three collections and import the demo content again. If port 1337 is taken by another project, set `PORT` in `.env` and use the same port in the Astro site's `STRAPI_URL`.

## Content types

| Type | API | Notes |
| --- | --- | --- |
| Blog Post | `/api/blog-posts` | `body` uses the Blocks editor; `featured` puts a post in the featured cards on `/blogs`; `author` is a `shared.person` component; `readTime` is stored but not displayed by the theme |
| Career | `/api/careers` | `description` uses the Blocks editor |
| Case Study | `/api/case-studies` | `stats` is a repeatable `shared.stat` component (max 2, shown on the card and the case study page); `quoteAuthor` is a `shared.person` component; `body` uses the Blocks editor |

All three types have an optional `seo` component (`shared.seo`: meta title, description and sharing image) and use Draft & Publish; the site only shows published entries. Schemas live in `src/api/*/content-types/*/schema.json` and `src/components`.

Image alternative texts: blog thumbnails and rich text images use the Media Library's alternative text. Case study images use the entry title (cover, card), the company name (logo) and the person's name (quote author photo), like the original template.

## Demo data

`data/seed.json` and `data/uploads/` hold the demo content. The Astro site also reads `data/seed.json` directly when it is built without a Strapi server (demo mode). `scripts/lib/seed-data.js` describes the media and rich text fields of each type for both seed scripts.

## MCP server

The Strapi MCP server is enabled (`config/server.ts`, `MCP_ENABLED` in `.env`). It listens on `POST /mcp` (Streamable HTTP) and authenticates with an **admin token** (Settings > Admin tokens), not an API token. It requires Strapi 5.47 or newer (5.54 for the Media Library tools); this project uses 5.60.

```bash
claude mcp add strapi-mcp --transport http http://localhost:1337/mcp -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

The tools a client sees follow the token's permissions. A token with read, create, update and publish on Blog Post, Career and Case Study plus Media Library read and update exposes `list_blog-post`, `get_blog-post`, `create_blog-post`, `update_blog-post`, `publish_blog-post`, `unpublish_blog-post`, `discard_blog-post_draft`, the same for `career` and `case-study`, and the `media_*` tools. Grant delete only if the assistant should be able to delete entries.

### Importing the demo content through MCP

`npm run seed:mcp` pushes the demo content into a **running** Strapi through the MCP server: images are uploaded with the Upload API (MCP cannot upload files), their alt texts are set with `media_update_asset`, entries are created with `create_*` and published with `publish_*`, and the Public role gets read access. It skips files and entries that already exist.

```bash
STRAPI_URL=http://localhost:1337 STRAPI_ADMIN_EMAIL=you@example.com STRAPI_ADMIN_PASSWORD=... STRAPI_MCP_TOKEN=... npm run seed:mcp
```

Good to know:

- `update_*` validates the entry, so an update must include the type's required fields (Blog Post: `title`, `slug`, `category`, `publishedDate`, `excerpt`, `thumbnail`; Career: `title`, `slug`, `location`, `experience`, `summary`; Case Study: `title`, `slug`, `summary`, `company`, `coverImage`, `cardImage`, `logo`, `quote`). Fields you leave out keep their values.
- Media fields take the numeric id of an existing asset (find it with `media_list_assets`). Upload new images in the Media Library first.
- Created and updated entries are drafts until `publish_*` is called. The site shows them after the next build.
- Content types themselves are edited in the Content-Type Builder or in the schema files, not through MCP.

## Troubleshooting

- **`Could not load the "sharp" module` / `An Application Control policy has blocked this file` on Windows**: Windows Smart App Control is blocking the native image library that Strapi's Media Library uses. Run Strapi in Docker or WSL, or install sharp's WebAssembly build (`npm install --no-save @img/sharp-wasm32`, repeat after each `npm install`).
- **`Too many requests` on admin login**: Strapi rate-limits admin logins; wait a few minutes or restart the server.

## Production

- Use PostgreSQL or MySQL instead of SQLite (`config/database.ts`, `DATABASE_*` variables).
- Run `npm run build` then `npm run start`.
- Add a webhook (Settings > Webhooks) that triggers a rebuild of the Astro site when entries are published or unpublished.
- If you prefer not to expose the API publicly, remove the Public role's `find`/`findOne` permissions and give the site a read-only API token (`STRAPI_TOKEN`).
