import { Link } from '@/i18n/routing';
import { toArabicIndic } from '@/lib/mutun/numerals';
import type { PagedUnit } from '@/lib/mutun/units';

/**
 * The باب index of a paged matn: one link per باب, numbered, with its verse
 * range. Titles come from the JSON; `heading` and `versesLabel` are localized
 * UI chrome resolved by the page.
 */
export function UnitIndex({
  matnId,
  units,
  heading,
  versesLabel,
}: {
  matnId: string;
  units: PagedUnit[];
  heading: string;
  versesLabel: (u: PagedUnit) => string;
}) {
  return (
    <nav dir="rtl" className="font-arabic" aria-labelledby="unit-index-heading">
      <h2 id="unit-index-heading" className="mb-4 text-2xl font-bold text-text">
        {heading}
      </h2>
      <ol className="divide-y divide-border/60 rounded-xl border border-border">
        {units.map((u, i) => (
          <li key={u.slug}>
            <Link
              href={`/mutun/${matnId}/${u.slug}`}
              className="flex items-baseline gap-3 px-4 py-3 transition-colors hover:bg-surface/60"
            >
              <span className="w-8 shrink-0 text-text-muted">{toArabicIndic(i + 1)}</span>
              <span className="flex-1 font-semibold text-text">{u.unit.title ?? toArabicIndic(i + 1)}</span>
              <span className="shrink-0 text-sm text-text-muted">{versesLabel(u)}</span>
            </Link>
          </li>
        ))}
      </ol>
    </nav>
  );
}
