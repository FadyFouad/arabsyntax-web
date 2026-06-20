import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { splitSymbolSpans } from '@/lib/mutun/symbols';
import { matnContentSchema, type Section } from '@/lib/mutun/schema';

describe('splitSymbolSpans', () => {
  it('returns a single text segment when there are no symbols', () => {
    expect(splitSymbolSpans('كلام بلا رموز')).toEqual([
      { type: 'text', value: 'كلام بلا رموز' },
    ]);
  });

  it('detects a Quran run ﴿…﴾ and keeps the honoring brackets inside the span', () => {
    expect(splitSymbolSpans('قال ﴿إنا أنزلناه﴾ نصًّا')).toEqual([
      { type: 'text', value: 'قال ' },
      { type: 'symbol', kind: 'quran', value: '﴿إنا أنزلناه﴾' },
      { type: 'text', value: ' نصًّا' },
    ]);
  });

  it('detects an example run «…» as kind=example', () => {
    expect(splitSymbolSpans('كـ «الرجلِ» مثلاً')).toEqual([
      { type: 'text', value: 'كـ ' },
      { type: 'symbol', kind: 'example', value: '«الرجلِ»' },
      { type: 'text', value: ' مثلاً' },
    ]);
  });

  it('detects multiple, mixed runs in source order', () => {
    const segs = splitSymbolSpans('﴿آية﴾ ثم «مثال» ثم ﴿أخرى﴾');
    expect(segs.map((s) => (s.type === 'symbol' ? s.kind : '·'))).toEqual([
      'quran',
      '·',
      'example',
      '·',
      'quran',
    ]);
  });

  it('leaves an unclosed opener as plain text (never a runaway span)', () => {
    expect(splitSymbolSpans('نص ﴿ بلا إغلاق')).toEqual([
      { type: 'text', value: 'نص ﴿ بلا إغلاق' },
    ]);
  });

  it('does not let one run swallow the next', () => {
    const segs = splitSymbolSpans('«أ» «ب»');
    expect(segs.filter((s) => s.type === 'symbol').map((s) => s.value)).toEqual([
      '«أ»',
      '«ب»',
    ]);
  });
});

describe('qatr_alnada symbols are balanced (render-time styling will be complete)', () => {
  const file = path.join(process.cwd(), 'content', 'mutun', 'qatr_alnada.json');
  const matn = matnContentSchema.parse(JSON.parse(readFileSync(file, 'utf8')));
  const texts = matn.units.flatMap((u) =>
    (u.body.sections as Section[]).map((s) => s.text ?? ''),
  );

  it('every ﴿ pairs with a ﴾ and every « pairs with a » across all paragraphs', () => {
    const joined = texts.join('\n');
    expect((joined.match(/﴿/g) ?? []).length).toBe((joined.match(/﴾/g) ?? []).length);
    expect((joined.match(/«/g) ?? []).length).toBe((joined.match(/»/g) ?? []).length);
  });

  it('finds Quran and example runs to style', () => {
    const kinds = texts.flatMap((t) =>
      splitSymbolSpans(t).flatMap((s) => (s.type === 'symbol' ? [s.kind] : [])),
    );
    expect(kinds.filter((k) => k === 'quran').length).toBeGreaterThan(0);
    expect(kinds.filter((k) => k === 'example').length).toBeGreaterThan(0);
  });
});
