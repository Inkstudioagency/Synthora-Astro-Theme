/**
 * Queries used by the pages. Each helper reproduces the sort, filter and limit of the
 * matching collection list in the original template.
 */
import { getCollection, type CollectionEntry } from 'astro:content';

export type BlogPost = CollectionEntry<'blogPosts'>['data'];
export type Career = CollectionEntry<'careers'>['data'];
export type CaseStudy = CollectionEntry<'caseStudies'>['data'];

type Sortable = { createdAt: Date; entryId: number };

/** Newest first (creation date, then entry id for entries created at the same moment) */
const newestFirst = (a: Sortable, b: Sortable) => b.createdAt.getTime() - a.createdAt.getTime() || b.entryId - a.entryId;

// ---------- blog posts

/** Posts by publication date, latest first */
export async function getPosts(): Promise<BlogPost[]> {
  return (await getCollection('blogPosts'))
    .map((e) => e.data)
    .sort((a, b) => b.publishedDate.getTime() - a.publishedDate.getTime() || b.entryId - a.entryId);
}

/** The latest posts (home and about pages show three) */
export async function getLatestPosts(limit = 3): Promise<BlogPost[]> {
  return (await getPosts()).slice(0, limit);
}

/** Posts marked "featured", latest first (the two cards at the top of /blogs) */
export async function getFeaturedPosts(limit = 2): Promise<BlogPost[]> {
  return (await getPosts()).filter((p) => p.featured).slice(0, limit);
}

// ---------- careers

/** Open positions, newest first */
export async function getCareers(limit?: number): Promise<Career[]> {
  return (await getCollection('careers')).map((e) => e.data).sort(newestFirst).slice(0, limit);
}

// ---------- case studies

/** Case studies, newest first */
export async function getCaseStudies(): Promise<CaseStudy[]> {
  return (await getCollection('caseStudies')).map((e) => e.data).sort(newestFirst);
}

// ---------- formatting

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "October 2, 2026" (Webflow's default date format) */
export function formatDate(date: Date): string {
  return `${MONTHS[date.getUTCMonth()]} ${date.getUTCDate()}, ${date.getUTCFullYear()}`;
}

/** URLs of the detail pages (the collection template paths of the original site) */
export const postUrl = (slug: string) => `/blog/${slug}`;
export const careerUrl = (slug: string) => `/career/${slug}`;
export const caseStudyUrl = (slug: string) => `/case-study/${slug}`;
