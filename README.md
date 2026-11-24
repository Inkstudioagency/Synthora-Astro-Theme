# Synthora — Astro theme with Strapi CMS

Synthora is a dark AI startup theme for [Astro](https://astro.build), built for agent automation platforms and SaaS products. Blog posts, careers and case studies are managed in [Strapi](https://strapi.io), which is included in the `strapi/` folder with demo content.

- 15 pages: Home (3 versions), About (3 versions), Contact (3 versions), Pricing, Integrations, Blog, Careers, Style Guide and 404
- Detail pages generated from Strapi: `/blog/[slug]`, `/career/[slug]`, `/case-study/[slug]`
- Page-load, scroll and hover animations (GSAP), smooth scrolling (Lenis), animated counters, sliders, tabs, FAQ accordions, a mega menu, a mobile menu, a video lightbox and Lottie illustrations
- Static output: no server needed in production, the site is rebuilt when content changes
- Strapi MCP server enabled, so AI assistants can manage the content

## Requirements

- Node.js 22.23.4 or newer (Strapi supports Node 20 to 26)
- npm (any package manager works; the scripts below use npm)

## Quick start

```bash
# 1. Install the theme and the CMS
npm install
npm run cms:install

# 2. Create the CMS settings (then replace every "tobemodified" value with a random secret)
cp strapi/.env.example strapi/.env

# 3. Load the demo content into Strapi (blog posts, careers, case studies and media)
npm run cms:seed

# 4. Start Strapi on http://localhost:1337 (create your admin user at /admin)
npm run cms:dev

# 5. In a second terminal: configure and start Astro on http://localhost:4321
cp .env.example .env
npm run dev
```

`npm run build` writes the static site to `dist/`. The content is fetched from Strapi at build time, so Strapi must be reachable while building.

### Demo mode (no Strapi)

When `STRAPI_URL` is not set, the site is built from the demo content bundled in `strapi/data/seed.json` (the same data `npm run cms:seed` imports), and its images are served from `/cms-demo/`. This is how the live demo is deployed, and it lets you preview the theme with just `npm install && npm run build`. Set `STRAPI_URL` to switch to your Strapi content.

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `STRAPI_URL` | yes, for your own content | Base URL of the Strapi server, e.g. `http://localhost:1337`. Leave it unset to build with the demo content. |
| `STRAPI_TOKEN` | no | Read-only API token. Leave empty if the Public role can read the content (the seed script allows `find` and `findOne`). |
| `STRAPI_MEDIA` | no | By default the build downloads the Strapi images it uses into `dist/cms/`, so the site never depends on Strapi at runtime. Set it to `remote` to keep the Strapi URLs (e.g. when Strapi serves media from a CDN). |
| `PUBLIC_FORM_ENDPOINT` | no | URL that receives form submissions (Formspree, Basin, Getform or your own API). Without it, forms show their success message but send nothing. |

The Strapi server has its own `strapi/.env` (secrets, port, database, `MCP_ENABLED`); see `strapi/.env.example`.

## Project structure

```text
├── public/
│   ├── images/            # theme images, icons and favicons
│   ├── documents/         # Lottie animations (JSON)
│   └── js/                # interaction runtime (site.js) and jQuery
├── integrations/          # CMS media in the build (demo images, Strapi downloads)
├── src/
│   ├── components/
│   │   ├── layout/        # Header, Footer
│   │   ├── sections/      # page sections, one folder per page + shared/ for sections used on several pages
│   │   ├── ui/            # Icon, PrimaryButton
│   │   └── SeoMeta.astro
│   ├── config/            # config.json, menu.json, social.json
│   ├── layouts/           # BaseLayout
│   ├── lib/               # Strapi client, demo content, content queries, rich text renderer, helpers
│   ├── pages/             # routes, including the blog/, career/ and case-study/ [slug] pages
│   ├── scripts/           # animations (GSAP, Lenis, counters) and forms (client side)
│   ├── styles/            # theme CSS
│   └── content.config.ts  # Strapi-backed content collections
└── strapi/                # Strapi 5 project (content types, seed data and scripts)
```

## Content model (Strapi)

| Collection | Main fields | Used on |
| --- | --- | --- |
| **Blog Post** | title, slug, category, published date, excerpt, lead, thumbnail, author (name, photo), read time, featured, body (rich text), SEO | Home V1–V3, About V1–V3, `/blogs`, `/blog/[slug]` |
| **Career** | title, slug, location, experience, summary, employment type, working days, salary, description (rich text), SEO | `/careers`, `/career/[slug]` |
| **Case Study** | title, slug, summary, company, industry, company size, cover / card images, logo, stats (up to 2), quote and its author (name, role, photo), body (rich text), SEO | Home V3, About V3 (case study slider), `/case-study/[slug]` |

Components: `shared.person`, `shared.stat`, `shared.seo` (meta title, description and sharing image). Rich text uses Strapi's Blocks editor and is rendered with the template's rich text styles (`src/lib/blocks.ts`).

Which entries appear where (as in the original template):

- **Blog**: latest published date first. The home and about pages show the three latest posts; `/blogs` shows the two latest posts marked *Featured* at the top and every post in the grid.
- **Careers**: newest first. `/careers` lists every position; a career page shows the four newest (the current one included).
- **Case studies**: newest first, all of them in the Home V3 / About V3 slider.

The queries live in `src/lib/content.ts`.

### Publishing changes

The site is static, so published changes appear after the next build. In production, add a webhook in Strapi (Settings > Webhooks) that calls your host's deploy hook on entry publish/unpublish.

### Strapi MCP server

The [Strapi MCP server](https://docs.strapi.io/cms/features/strapi-mcp-server) is enabled in `strapi/config/server.ts` (endpoint `POST /mcp`), so AI assistants can list, create, update and publish blog posts, careers and case studies and manage the Media Library. Create an admin token in the Strapi admin (Settings > Admin tokens), then connect, for example with Claude Code:

```bash
claude mcp add strapi-mcp --transport http http://localhost:1337/mcp -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
```

`npm run cms:seed:mcp` imports the demo content into a running Strapi through the MCP server. See `strapi/README.md` for token permissions and caveats. Set `MCP_ENABLED=false` in `strapi/.env` to turn it off.

## Customization

- **Site settings, SEO defaults, navigation texts and button, footer texts**: `src/config/config.json`
- **Navigation, mega menu and footer links**: `src/config/menu.json`; **social links**: `src/config/social.json`
- **Page titles and descriptions**: the `BaseLayout` props in each file in `src/pages`
- **Colors, spacing and typography**: the CSS variables at the top of `src/styles/synthora.css`
- **Font** (Inter Tight): `fonts` in `astro.config.mjs` (self-hosted by Astro)
- **Forms**: set `PUBLIC_FORM_ENDPOINT`; the handler is `src/scripts/forms.ts`

### Animations

Animations are attached with attributes such as `hero-title`, `page-load-1`, `reveal-anim-1`, `data-reveal="stagger"` and `data-counter`, and played by the interaction runtime in `public/js/site.js` (with GSAP, see `src/scripts/animations.ts`), which also runs the dropdowns, tabs, sliders, mobile menu, lightbox and Lottie animations. Each page passes its `wfPage` id to `BaseLayout`; keep it when you edit a page, because the runtime uses it to find that page's animations. Elements with a `data-wf-target` attribute are hooked to interactions (for example the button hover effect); keep that attribute when you copy them. The header takes a `variant` prop (`base` or `transparent`, used by the V2 pages).

## Deployment

Build with `npm run build` and deploy `dist/` to any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages...). Set `STRAPI_URL` (and `STRAPI_TOKEN` if used) in the host's build settings, and set `site.base_url` in `src/config/config.json` to your domain.

Deploy Strapi separately (Strapi Cloud, a VPS or a container), with a production database such as PostgreSQL; see `strapi/config/database.ts`.

## Troubleshooting

- **Build fails with "Could not reach Strapi"**: start Strapi (`npm run cms:dev`) or check `STRAPI_URL` in `.env`.
- **Build fails with a 401/403 from Strapi**: run `npm run cms:seed` (it allows public read access) or set `STRAPI_TOKEN`.
- **Port 1337 is already in use** (another Strapi project is running): set `PORT` in `strapi/.env` (e.g. `1338`) and use the same port in `STRAPI_URL`.
- **`An Application Control policy has blocked this file` on Windows**: Windows Smart App Control can block newly published native modules (Astro's compiler, sharp). Install the WebAssembly build of the blocked module without saving it, e.g. `npm install --no-save --force @astrojs/compiler-binding-wasm32-wasi` or `npm --prefix strapi install --no-save @img/sharp-wasm32` (repeat after each `npm install`), or run the project in WSL.

## Credits

Designed by [Ink Studio](https://inks.studio/).
