#!/usr/bin/env node
/**
 * Governance check: components and page render files must reference design
 * tokens only — no raw color literals. Flags `#rgb`/`#rrggbb(aa)`, `rgb(`,
 * `rgba(`, `hsl(`, `hsla(`. Token definitions live in app/globals.css (the
 * single source of truth) and config files (manifest/sitemap) are exempt.
 *
 * A file may opt out only with an explicit, justified marker comment:
 *   `check-tokens-disable-file: <reason>`
 * Reserved for render files that run without the theme stylesheet loaded (e.g.
 * app/global-error.tsx, which replaces the root layout), where tokens are
 * unavailable and raw literals are unavoidable.
 *
 * Run: node scripts/check-tokens.mjs   (exit 1 on any violation)
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

const ROOTS = ['components', 'app'];
const EXT = new Set(['.tsx']); // only render files; .ts config (manifest/sitemap) exempt
const COLOR_RE = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/g;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else if (EXT.has(path.extname(full))) out.push(full);
  }
  return out;
}

const violations = [];
for (const root of ROOTS) {
  let files = [];
  try {
    files = walk(root);
  } catch {
    continue;
  }
  for (const file of files) {
    const contents = readFileSync(file, 'utf8');
    if (contents.includes('check-tokens-disable-file:')) continue;
    contents.split('\n').forEach((line, i) => {
      const m = line.match(COLOR_RE);
      if (m) violations.push(`${file}:${i + 1}  ${m.join(', ')}  →  ${line.trim()}`);
    });
  }
}

if (violations.length) {
  console.error(`✗ ${violations.length} raw color literal(s) found — use design tokens instead:\n`);
  for (const v of violations) console.error('  ' + v);
  console.error('\nDefine colors in app/globals.css @theme and reference them via utilities/tokens.');
  process.exit(1);
}
console.log('✓ No raw color literals in components/ or app/ render files — tokens only.');
