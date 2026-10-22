import { describe, it, expect } from 'vitest';
import { findPagedUnit, pagedUnits, unitSlug } from '@/lib/mutun/units';
import type { MatnContent, Unit } from '@/lib/mutun/schema';

const verse = (id: string) => ({ type: 'verse', id, sadr: 'صدر', ajz: 'عجز' });
const unit = (order: number, title: string, sections: Record<string, unknown>[]): Unit => ({
  order,
  kind: 'bab',
  title,
  body: { sections },
});
const matn = (units: Unit[]): MatnContent => ({
  id: 'ibn_aqil',
  titleAr: 'شرح',
  titleEn: 'Sharh',
  author: 'ابن عقيل',
  era: 'ت ٧٦٩ هـ',
  level: 'advanced',
  type: 'prose',
  units,
});

// Listed out of order on purpose: pages follow `order`, not array position.
const fixture = () =>
  matn([
    unit(2, 'الكلام', [{ type: 'paragraph', text: 'شرح' }, verse('alfiyya_0008'), verse('alfiyya_0014')]),
    unit(1, 'المقدمة', [verse('alfiyya_0001'), { type: 'quote', text: 'شاهد' }, verse('alfiyya_0007')]),
    unit(3, 'فصل', [verse('alfiyya_0015')]),
  ]);

describe('unitSlug', () => {
  it('is the id of the first verse, skipping non-verse sections', () => {
    expect(unitSlug(fixture().units[0])).toBe('alfiyya_0008');
  });

  it('is null for a باب with no verse id', () => {
    expect(unitSlug(unit(1, 'نثر', [{ type: 'paragraph', text: 'نثر' }]))).toBeNull();
  });
});

describe('pagedUnits', () => {
  it('lists the أبواب in order with their verse range', () => {
    expect(pagedUnits(fixture()).map((u) => [u.slug, u.firstVerse, u.lastVerse])).toEqual([
      ['alfiyya_0001', 1, 7],
      ['alfiyya_0008', 8, 14],
      ['alfiyya_0015', 15, 15],
    ]);
  });

  it('keeps every slug when a باب is inserted before them', () => {
    const before = pagedUnits(fixture()).map((u) => u.slug);
    const m = fixture();
    m.units.push(unit(0, 'جديد', [verse('alfiyya_0000')]));
    const after = pagedUnits(m).map((u) => u.slug);
    expect(after.slice(1)).toEqual(before);
  });
});

describe('findPagedUnit', () => {
  it('returns the باب and its neighbours', () => {
    const found = findPagedUnit(fixture(), 'alfiyya_0008');
    expect(found?.current.unit.title).toBe('الكلام');
    expect(found?.previous?.slug).toBe('alfiyya_0001');
    expect(found?.next?.slug).toBe('alfiyya_0015');
  });

  it('has no previous on the first باب and no next on the last', () => {
    expect(findPagedUnit(fixture(), 'alfiyya_0001')?.previous).toBeNull();
    expect(findPagedUnit(fixture(), 'alfiyya_0015')?.next).toBeNull();
  });

  it.each(['alfiyya_0007', '2', '', '../manifest'])('returns null for %j, which is not a باب slug', (slug) => {
    expect(findPagedUnit(fixture(), slug)).toBeNull();
  });
});
