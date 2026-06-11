import { describe, it, expect } from 'vitest';
import ar from '@/messages/ar.json';
import en from '@/messages/en.json';

// ─────────────────────────────────────────────────────────────────────────────
// i18n KEY-PARITY GUARD.
//
// next-intl resolves message keys at render time. A key present in one locale but
// missing in the other ships a broken string (or throws) to users of that locale.
// The contact form is the sharpest case: it builds keys DYNAMICALLY from Zod
// message codes — `t(\`errors.${errors.name.message}\`)` — so a missing
// `support.form.errors.<code>` renders the raw code as the user-facing error.
//
// This test pins ar.json and en.json to the same key shape and verifies every
// Zod message code has a translation in BOTH locales. It is cheap insurance: the
// data is clean today, but nothing else stops a future edit from regressing it.
// ─────────────────────────────────────────────────────────────────────────────

type Json = Record<string, unknown>;

/** Flatten a nested messages object to dotted leaf paths (arrays treated as leaves). */
function leafPaths(obj: Json, prefix = ''): string[] {
  const out: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      out.push(...leafPaths(value as Json, path));
    } else {
      out.push(path);
    }
  }
  return out;
}

function get(obj: Json, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, k) => (acc as Json)?.[k], obj);
}

const arPaths = new Set(leafPaths(ar as Json));
const enPaths = new Set(leafPaths(en as Json));

describe('i18n message parity (ar ↔ en)', () => {
  it('every key in ar.json also exists in en.json', () => {
    const missingInEn = [...arPaths].filter((p) => !enPaths.has(p));
    expect(missingInEn, `keys present in ar but missing in en:\n${missingInEn.join('\n')}`).toEqual(
      [],
    );
  });

  it('every key in en.json also exists in ar.json', () => {
    const missingInAr = [...enPaths].filter((p) => !arPaths.has(p));
    expect(missingInAr, `keys present in en but missing in ar:\n${missingInAr.join('\n')}`).toEqual(
      [],
    );
  });

  it('the two locales declare exactly the same number of leaf keys', () => {
    expect(arPaths.size).toBe(enPaths.size);
  });
});

describe('i18n leaf values are non-empty (no blank translations)', () => {
  it.each(['ar', 'en'])('%s has no empty-string leaf values', (loc) => {
    const obj = (loc === 'ar' ? ar : en) as Json;
    const empties = leafPaths(obj).filter((p) => {
      const v = get(obj, p);
      return typeof v === 'string' && v.trim() === '';
    });
    expect(empties, `empty values in ${loc}.json:\n${empties.join('\n')}`).toEqual([]);
  });
});

describe('contact-form dynamic error keys resolve in both locales', () => {
  // These codes come from lib/validation/contact.ts and are interpolated into
  // `support.form.errors.<code>` by components/forms/ContactForm.tsx. The action
  // result codes (rateLimited, etc.) are mapped the same way. ALL must translate.
  const VALIDATION_CODES = [
    'nameRequired',
    'nameMin',
    'emailRequired',
    'emailInvalid',
    'subjectRequired',
    'subjectMin',
    'messageRequired',
    'messageMin',
  ];
  const ACTION_CODES = ['rateLimited', 'rateLimitUnavailable', 'sendFailed'];

  it.each(['ar', 'en'])('%s defines a string for every contact-form error code', (loc) => {
    const obj = (loc === 'ar' ? ar : en) as Json;
    for (const code of [...VALIDATION_CODES, ...ACTION_CODES]) {
      const value = get(obj, `support.form.errors.${code}`);
      expect(typeof value, `${loc}: support.form.errors.${code}`).toBe('string');
      expect((value as string).trim().length, `${loc}: support.form.errors.${code} is blank`).toBeGreaterThan(0);
    }
  });
});
