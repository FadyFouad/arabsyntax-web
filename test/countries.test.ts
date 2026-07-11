import { describe, expect, it } from 'vitest';
import { COUNTRY_CODES, countryOptions } from '@/lib/countries';

describe('COUNTRY_CODES', () => {
  it('is a de-duplicated list of ISO 3166-1 alpha-2 codes', () => {
    expect(new Set(COUNTRY_CODES).size).toBe(COUNTRY_CODES.length);
    for (const code of COUNTRY_CODES) {
      expect(code).toMatch(/^[A-Z]{2}$/);
    }
  });

  it('contains the audience-critical codes', () => {
    for (const code of ['EG', 'SA', 'AE', 'JO', 'MA', 'DZ', 'US', 'GB']) {
      expect(COUNTRY_CODES).toContain(code);
    }
  });
});

describe('countryOptions', () => {
  it('resolves Arabic names from CLDR data', () => {
    const options = countryOptions('ar');
    expect(options.find((option) => option.code === 'EG')?.name).toBe('مصر');
    // Every entry resolved to a real name, not the code fallback.
    expect(options.every((option) => option.name !== option.code)).toBe(true);
  });

  it('resolves English names', () => {
    const options = countryOptions('en');
    expect(options.find((option) => option.code === 'EG')?.name).toBe('Egypt');
  });

  it('sorts by localized name for the given locale', () => {
    for (const locale of ['ar', 'en']) {
      const names = countryOptions(locale).map((option) => option.name);
      const sorted = [...names].sort((a, b) => a.localeCompare(b, locale));
      expect(names).toEqual(sorted);
    }
  });
});
