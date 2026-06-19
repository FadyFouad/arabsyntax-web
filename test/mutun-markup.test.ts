import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  parseMarkup,
  stripMarkup,
  stripTashkeel,
  normalizeForCompare,
  type MarkupNode,
} from '@/lib/mutun/markup';
import { toArabicIndic } from '@/lib/mutun/numerals';
import { labelsFor } from '@/lib/mutun/labels';

const flatten = (nodes: MarkupNode[]): string =>
  nodes.map((n) => (n.type === 'text' ? n.value : flatten(n.children))).join('');

describe('parseMarkup', () => {
  it('returns plain text untouched', () => {
    expect(parseMarkup('plain text')).toEqual([{ type: 'text', value: 'plain text' }]);
  });

  it('parses each known tag into a tag node', () => {
    for (const tag of ['term', 'ex', 'mark', 'rule'] as const) {
      const nodes = parseMarkup(`a [[${tag}:x]] b`);
      expect(nodes).toEqual([
        { type: 'text', value: 'a ' },
        { type: 'tag', tag, children: [{ type: 'text', value: 'x' }] },
        { type: 'text', value: ' b' },
      ]);
    }
  });

  it('parses nested markup', () => {
    const nodes = parseMarkup('[[term:x [[mark:y]] z]]');
    expect(nodes).toEqual([
      {
        type: 'tag',
        tag: 'term',
        children: [
          { type: 'text', value: 'x ' },
          { type: 'tag', tag: 'mark', children: [{ type: 'text', value: 'y' }] },
          { type: 'text', value: ' z' },
        ],
      },
    ]);
  });

  it('never leaks raw [[ or ]] — stray/unknown brackets are dropped', () => {
    for (const input of ['a ]] b', 'a [[ b', 'a [[bogus:z] b', '[[term:unterminated', ']]]]', '[[[[']) {
      const text = flatten(parseMarkup(input));
      expect(text).not.toMatch(/\[\[|\]\]/);
    }
  });

  it('closes an unclosed tag implicitly, keeping its inner text', () => {
    expect(flatten(parseMarkup('[[term:abc'))).toBe('abc');
  });

  it('round-trips every section in the real assets to bracket-free text equal to stripMarkup', () => {
    const MUTUN = path.join(process.cwd(), 'content', 'mutun');
    for (const file of ['aljurrumiyya.json', 'alimriti.json']) {
      const matn = JSON.parse(readFileSync(path.join(MUTUN, file), 'utf8')) as {
        units: { body: { sections: { text?: string; sadr?: string; ajz?: string }[] } }[];
      };
      const texts = matn.units.flatMap((u) =>
        u.body.sections.flatMap((s) => [s.text, s.sadr, s.ajz].filter((v): v is string => !!v)),
      );
      for (const text of texts) {
        const rendered = flatten(parseMarkup(text));
        expect(rendered).not.toMatch(/\[\[|\]\]/);
        expect(rendered).toBe(stripMarkup(text));
      }
    }
  });
});

describe('stripMarkup / stripTashkeel / normalizeForCompare', () => {
  it('stripMarkup removes openers and closers, keeps inner text', () => {
    expect(stripMarkup('[[term:الكلام]] هو')).toBe('الكلام هو');
  });

  it('stripTashkeel removes harakat, shadda, dagger alif and tatweel', () => {
    expect(stripTashkeel('الْكَلَامُ')).toBe('الكلام');
    expect(stripTashkeel('اللَّفْظُ')).toBe('اللفظ');
    expect(stripTashkeel('كــلام')).toBe('كلام');
  });

  it('normalizeForCompare strips markup + tashkeel and collapses whitespace', () => {
    expect(normalizeForCompare('[[term:الْكَلَامُ]]   هُوَ')).toBe('الكلام هو');
  });
});

describe('toArabicIndic', () => {
  it('maps Western digits to Arabic-Indic', () => {
    expect(toArabicIndic(0)).toBe('٠');
    expect(toArabicIndic(26)).toBe('٢٦');
    expect(toArabicIndic(33)).toBe('٣٣');
    expect(toArabicIndic(1234567890)).toBe('١٢٣٤٥٦٧٨٩٠');
  });

  it('handles negative / fractional inputs by magnitude-truncation', () => {
    expect(toArabicIndic(-5)).toBe('٥');
    expect(toArabicIndic(7.9)).toBe('٧');
  });
});

describe('labelsFor', () => {
  it('verse uses البيت/الأبيات; unit count word is أبواب', () => {
    const l = labelsFor('verse');
    expect(l.section).toBe('البيت');
    expect(l.sections).toBe('الأبيات');
    expect(l.unitCountWord).toBe('أبواب');
  });

  it('prose uses الفقرة/الفقرات; unit count word is أبواب', () => {
    const l = labelsFor('prose');
    expect(l.section).toBe('الفقرة');
    expect(l.unitCountWord).toBe('أبواب');
  });
});
