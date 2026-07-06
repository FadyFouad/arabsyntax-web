import { describe, it, expect } from 'vitest';
import { parseManifest, stageKeyFromFilename } from '@/lib/quiz/manifest';

describe('stageKeyFromFilename', () => {
  it('derives the stage from the filename stem', () => {
    expect(stageKeyFromFilename('primary.json')).toBe('primary');
    expect(stageKeyFromFilename('midOne.json')).toBe('midOne');
  });

  it('maps unstaged.json to the unstaged key', () => {
    expect(stageKeyFromFilename('unstaged.json')).toBe('unstaged');
  });

  it('strips a directory prefix and is case-insensitive on the extension', () => {
    expect(stageKeyFromFilename('data/secondaryTwo.JSON')).toBe('secondaryTwo');
  });
});

describe('parseManifest', () => {
  it('accepts a bare array of filenames and derives stages', () => {
    expect(parseManifest(['primary.json', 'midOne.json'])).toEqual([
      { file: 'primary.json', stage: 'primary' },
      { file: 'midOne.json', stage: 'midOne' },
    ]);
  });

  it('accepts a wrapped { files: [...] } list', () => {
    expect(parseManifest({ files: ['unstaged.json'] })).toEqual([
      { file: 'unstaged.json', stage: 'unstaged' },
    ]);
  });

  it('honours an explicit stage and alternative file keys', () => {
    expect(
      parseManifest([
        { file: 'a.json', stage: 'primary' },
        { filename: 'b.json' },
        { name: 'midTwo.json' },
        { path: 'secondaryOne.json' },
      ]),
    ).toEqual([
      { file: 'a.json', stage: 'primary' },
      { file: 'b.json', stage: 'b' },
      { file: 'midTwo.json', stage: 'midTwo' },
      { file: 'secondaryOne.json', stage: 'secondaryOne' },
    ]);
  });

  it('skips invalid items and de-duplicates by stage', () => {
    expect(
      parseManifest([
        'primary.json',
        'primary.json', // dup stage → dropped
        '', // empty → dropped
        42, // wrong type → dropped
        null,
        { stage: 'x' }, // no file → dropped
        { file: 123 }, // non-string file → dropped
      ]),
    ).toEqual([{ file: 'primary.json', stage: 'primary' }]);
  });

  it('returns an empty list for a non-array, non-{files} shape', () => {
    expect(parseManifest(null)).toEqual([]);
    expect(parseManifest({ nope: true })).toEqual([]);
  });
});
