/**
 * Content collections backed by Strapi (see ./strapi).
 *
 * Each loader fetches the published entries at build time (or when the dev server
 * syncs content), normalises Strapi's response and validates it with a schema.
 * Entry ids are the slugs, so pages can use getEntry('caseStudies', slug).
 */
import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { fetchCollection, mediaUrl, type StrapiMedia } from './lib/strapi';

// ---------- shared shapes

const imageSchema = z.object({
  url: z.string(),
  alt: z.string(),
  width: z.number().nullable(),
  height: z.number().nullable(),
});

// Strapi "Blocks" rich text, rendered by src/lib/blocks.ts
const blocksSchema = z.array(z.any()).default([]);

const personSchema = z.object({ name: z.string(), role: z.string(), photo: imageSchema.nullable() });

const seoSchema = z.object({
  metaTitle: z.string().nullable(),
  metaDescription: z.string().nullable(),
  metaImage: imageSchema.nullable(),
});

const text = z.string().default('');

/** Normalises a Strapi media object; `fallbackAlt` is used when the file has no alternative text */
function image(media: StrapiMedia | null | undefined, fallbackAlt = '') {
  if (!media) return null;
  return {
    url: mediaUrl(media.url),
    alt: media.alternativeText || fallbackAlt,
    width: media.width ?? null,
    height: media.height ?? null,
  };
}

function blocks(nodes: any[] | null | undefined) {
  return (nodes ?? []).map((node) =>
    node.type === 'image' && node.image ? { ...node, image: { ...node.image, url: mediaUrl(node.image.url) } } : node,
  );
}

const str = (value: unknown) => (typeof value === 'string' ? value : '');

const person = (p: any) => ({ name: str(p?.name), role: str(p?.role), photo: image(p?.photo, str(p?.name)) });

const seo = (value: any) => ({
  metaTitle: value?.metaTitle || null,
  metaDescription: value?.metaDescription || null,
  metaImage: image(value?.metaImage),
});

/** Fields every entry carries for sorting: creation date and Strapi id (creation order) */
const meta = (e: any) => ({ id: e.slug, slug: e.slug, createdAt: e.createdAt, entryId: e.id });
const metaSchema = { slug: z.string(), createdAt: z.coerce.date(), entryId: z.number() };

const SEO_POPULATE = { populate: { metaImage: true } } as const;

// ---------- collections

const blogPosts = defineCollection({
  loader: async () => {
    const posts = await fetchCollection<any>('blog-posts', {
      thumbnail: true,
      author: { populate: { photo: true } },
      seo: SEO_POPULATE,
    });
    return posts.map((p) => ({
      ...meta(p),
      title: p.title,
      category: str(p.category),
      publishedDate: p.publishedDate,
      excerpt: str(p.excerpt),
      lead: str(p.lead),
      thumbnail: image(p.thumbnail, p.title),
      author: person(p.author),
      readTime: str(p.readTime),
      featured: Boolean(p.featured),
      body: blocks(p.body),
      seo: seo(p.seo),
    }));
  },
  schema: z.object({
    ...metaSchema,
    title: z.string(),
    category: text,
    publishedDate: z.coerce.date(),
    excerpt: text,
    lead: text,
    thumbnail: imageSchema.nullable(),
    author: personSchema,
    readTime: text,
    featured: z.boolean(),
    body: blocksSchema,
    seo: seoSchema,
  }),
});

const careers = defineCollection({
  loader: async () => {
    const items = await fetchCollection<any>('careers', { seo: SEO_POPULATE });
    return items.map((c) => ({
      ...meta(c),
      title: c.title,
      location: str(c.location),
      experience: str(c.experience),
      summary: str(c.summary),
      employmentType: str(c.employmentType),
      workingDays: str(c.workingDays),
      salary: str(c.salary),
      description: blocks(c.description),
      seo: seo(c.seo),
    }));
  },
  schema: z.object({
    ...metaSchema,
    title: z.string(),
    location: text,
    experience: text,
    summary: text,
    employmentType: text,
    workingDays: text,
    salary: text,
    description: blocksSchema,
    seo: seoSchema,
  }),
});

const caseStudies = defineCollection({
  loader: async () => {
    const items = await fetchCollection<any>('case-studies', {
      coverImage: true,
      cardImage: true,
      logo: true,
      stats: true,
      quoteAuthor: { populate: { photo: true } },
      seo: SEO_POPULATE,
    });
    return items.map((c) => ({
      ...meta(c),
      title: c.title,
      summary: str(c.summary),
      company: str(c.company),
      industry: str(c.industry),
      companySize: str(c.companySize),
      // like the template, the cover and card images are described by the title and the logo by the company
      coverImage: image(c.coverImage && { ...c.coverImage, alternativeText: null }, c.title),
      cardImage: image(c.cardImage && { ...c.cardImage, alternativeText: null }, c.title),
      logo: image(c.logo && { ...c.logo, alternativeText: null }, str(c.company)),
      stats: (c.stats ?? []).map((s: any) => ({ value: str(s.value), label: str(s.label) })),
      quote: str(c.quote),
      quoteAuthor: person(c.quoteAuthor),
      body: blocks(c.body),
      seo: seo(c.seo),
    }));
  },
  schema: z.object({
    ...metaSchema,
    title: z.string(),
    summary: text,
    company: text,
    industry: text,
    companySize: text,
    coverImage: imageSchema.nullable(),
    cardImage: imageSchema.nullable(),
    logo: imageSchema.nullable(),
    stats: z.array(z.object({ value: z.string(), label: z.string() })),
    quote: text,
    quoteAuthor: personSchema,
    body: blocksSchema,
    seo: seoSchema,
  }),
});

export const collections = { blogPosts, careers, caseStudies };
