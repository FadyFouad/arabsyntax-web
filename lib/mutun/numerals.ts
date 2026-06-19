const ARABIC_INDIC = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

/** Render a non-negative integer with Arabic-Indic digits (e.g. 26 → "٢٦"). */
export function toArabicIndic(n: number): string {
  return Math.trunc(Math.abs(n))
    .toString()
    .split('')
    .map((d) => ARABIC_INDIC[Number(d)])
    .join('');
}
