#!/usr/bin/env node
/**
 * Build-time generator for public/sitemap.xml and public/robots.txt.
 *
 * These were app/sitemap.ts and app/robots.ts (Next metadata route handlers),
 * but on OpenNext/Cloudflare those handlers intermittently throw
 * "ComponentMod.handler is not a function" → 500. Emitting them as static files
 * served by the ASSETS binding sidesteps the worker handler entirely.
 *
 * Run before `next build` (wired into the build/deploy scripts). Mirrors the
 * slug logic in lib/lessons/loader.ts and lib/i3rab/loader.ts so the URL set
 * stays identical to the old dynamic sitemap.
 */
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

// Resolve the canonical origin the same way the app does: NEXT_PUBLIC_SITE_URL,
// which `next build` loads from .env.production. This script runs as a separate
// process before the build, so read that file directly when the env isn't set.
function resolveSiteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  const envPath = path.join(ROOT, '.env.production');
  if (existsSync(envPath)) {
    const m = readFileSync(envPath, 'utf8').match(/^\s*NEXT_PUBLIC_SITE_URL\s*=\s*(.+)\s*$/m);
    if (m) return m[1].trim();
  }
  return 'https://alnahwalkafi.com';
}

const SITE = resolveSiteUrl().replace(/\/$/, '');

// Lessons: manifest.en keys (manifest order), matching getAllSlugs().
function lessonSlugs() {
  const manifest = JSON.parse(readFileSync(path.join(ROOT, 'content/lessons/manifest.json'), 'utf8'));
  const ordered = Object.keys(manifest.en ?? {});
  if (ordered.length > 0) return ordered;
  return readdirSync(path.join(ROOT, 'content/lessons/ar'))
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.slice(0, -5));
}

// i3rab: sorted *.json under content/i3rab/ar whose JSON `slug` equals the
// filename, matching loadAll()/getAllI3rabSlugs() (without re-running the zod
// schema — the slug===filename check is the URL-affecting part).
function i3rabSlugs() {
  const dir = path.join(ROOT, 'content/i3rab', 'ar');
  let files = [];
  try {
    files = readdirSync(dir).filter((f) => f.endsWith('.json'));
  } catch {
    return [];
  }
  const slugs = [];
  const seen = new Set();
  for (const file of files.sort()) {
    const name = file.slice(0, -5);
    let data;
    try {
      data = JSON.parse(readFileSync(path.join(dir, file), 'utf8'));
    } catch {
      continue;
    }
    if (data?.slug !== name || seen.has(name)) continue;
    seen.add(name);
    slugs.push(name);
  }
  return slugs;
}

// mutun: manifest `mutun[].id` order, matching getMatnIds().
function mutunIds() {
  try {
    const manifest = JSON.parse(readFileSync(path.join(ROOT, 'content/mutun/manifest.json'), 'utf8'));
    return (manifest.mutun ?? []).map((m) => m.id);
  } catch {
    return [];
  }
}

const xml = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');

function urlEntry({ loc, priority, alternates }) {
  const links = Object.entries(alternates)
    .map(([lang, href]) => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${xml(href)}"/>`)
    .join('\n');
  return [
    '  <url>',
    `    <loc>${xml(loc)}</loc>`,
    '    <changefreq>monthly</changefreq>',
    `    <priority>${priority}</priority>`,
    links,
    '  </url>',
  ].join('\n');
}

function buildSitemap() {
  const STATIC_ROUTES = ['', '/privacy', '/terms', '/support', '/lessons'];
  const LOCALES = ['ar', 'en'];
  const entries = [];

  const routes = [...STATIC_ROUTES, ...lessonSlugs().map((slug) => `/lessons/${slug}`)];
  for (const route of routes) {
    const priority = route === '' ? '1.0' : route.startsWith('/lessons/') ? '0.7' : '0.5';
    for (const locale of LOCALES) {
      const path = locale === 'ar' ? route : `/en${route}`;
      entries.push(
        urlEntry({
          loc: `${SITE}${path || '/'}`,
          priority,
          alternates: { ar: `${SITE}${route || '/'}`, en: `${SITE}/en${route}` },
        }),
      );
    }
  }

  const i3rabRoutes = ['/i3rab', ...i3rabSlugs().map((slug) => `/i3rab/${slug}`)];
  for (const route of i3rabRoutes) {
    entries.push(
      urlEntry({
        loc: `${SITE}${route}`,
        priority: route === '/i3rab' ? '0.6' : '0.7',
        alternates: {
          ar: `${SITE}${route}`,
          en: `${SITE}/en${route}`,
          'x-default': `${SITE}${route}`,
        },
      }),
    );
  }

  const mutunRoutes = ['/mutun', ...mutunIds().map((id) => `/mutun/${id}`)];
  for (const route of mutunRoutes) {
    entries.push(
      urlEntry({
        loc: `${SITE}${route}`,
        priority: route === '/mutun' ? '0.6' : '0.7',
        alternates: {
          ar: `${SITE}${route}`,
          en: `${SITE}/en${route}`,
          'x-default': `${SITE}${route}`,
        },
      }),
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.join('\n')}
</urlset>
`;
}

function buildRobots() {
  return `User-Agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`;
}

const sitemap = buildSitemap();
writeFileSync(path.join(ROOT, 'public', 'sitemap.xml'), sitemap);
writeFileSync(path.join(ROOT, 'public', 'robots.txt'), buildRobots());

const urlCount = (sitemap.match(/<url>/g) ?? []).length;
console.log(`generate-seo: wrote public/sitemap.xml (${urlCount} urls) and public/robots.txt for ${SITE}`);
