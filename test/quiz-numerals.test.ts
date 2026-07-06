import { describe, it, expect } from 'vitest';
import { toArabicIndic } from '@/lib/quiz/numerals';

describe('quiz numerals re-export', () => {
  it('renders digits with Arabic-Indic numerals', () => {
    expect(toArabicIndic(2026)).toBe('٢٠٢٦');
  });
});
