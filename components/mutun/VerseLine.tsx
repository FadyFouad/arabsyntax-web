import { toArabicIndic } from '@/lib/mutun/numerals';

/**
 * One بيت (verse line): صدر + عجز, grouped as a single unit.
 *
 * Responsive: stacked and centered on narrow widths (never wrapping a hemistich
 * into a broken two-column shape); the classic two-column diwan line on wide
 * widths (md+). In RTL flex-row the first child (صدر) sits on the right and عجز
 * on the left, matching the diwan reading order.
 *
 * A small gap separates صدر↔عجز; the larger gap + faint divider between
 * consecutive أبيات is applied by the parent (omitted before the first بيت).
 * The بيت number is muted and uses Arabic-Indic numerals, 1-based within its باب.
 */
export function VerseLine({ sadr, ajz, number }: { sadr: string; ajz: string; number: number }) {
  return (
    <div className="grid grid-cols-[2ch_1fr] items-baseline gap-x-3 leading-[2.4]">
      <span aria-hidden className="select-none text-sm text-text-muted">
        {toArabicIndic(number)}
      </span>
      <div className="flex flex-col items-center gap-y-1 text-center text-lg text-text md:flex-row md:items-baseline md:justify-center md:gap-x-12 md:text-start">
        <span className="md:flex-1 md:text-center">{sadr}</span>
        <span className="md:flex-1 md:text-center">{ajz}</span>
      </div>
    </div>
  );
}
