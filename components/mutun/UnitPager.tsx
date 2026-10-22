import { Link } from '@/i18n/routing';
import type { PagedUnit } from '@/lib/mutun/units';

/**
 * Previous / index / next links under a باب page. In RTL the previous باب
 * sits on the right (the start side), matching reading order.
 */
export function UnitPager({
  matnId,
  previous,
  next,
  labels,
}: {
  matnId: string;
  previous: PagedUnit | null;
  next: PagedUnit | null;
  labels: { previous: string; next: string; index: string };
}) {
  const cell = 'flex flex-col gap-1 rounded-xl border border-border p-3 transition-colors hover:border-primary';
  return (
    <nav dir="rtl" className="font-arabic mt-12 grid grid-cols-2 gap-3" aria-label={labels.index}>
      {previous ? (
        <Link href={`/mutun/${matnId}/${previous.slug}`} rel="prev" className={cell}>
          <span className="text-sm text-text-muted">{labels.previous}</span>
          <span className="font-semibold text-text">{previous.unit.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={`/mutun/${matnId}/${next.slug}`} rel="next" className={`${cell} text-left`}>
          <span className="text-sm text-text-muted">{labels.next}</span>
          <span className="font-semibold text-text">{next.unit.title}</span>
        </Link>
      ) : (
        <span />
      )}
      <Link
        href={`/mutun/${matnId}`}
        className="col-span-2 text-center text-sm font-medium text-primary hover:underline"
      >
        {labels.index}
      </Link>
    </nav>
  );
}
