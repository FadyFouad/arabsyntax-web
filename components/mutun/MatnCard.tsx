import { Link } from '@/i18n/routing';
import Card from '@/components/ui/Card';
import { labelsFor } from '@/lib/mutun/labels';
import { toArabicIndic } from '@/lib/mutun/numerals';
import type { ManifestEntry } from '@/lib/mutun/schema';

/**
 * One matn list card. Every visible matn string (titleAr, author, era) comes
 * from the manifest entry; the `levelLabel` is localized UI chrome resolved by
 * the page. The unit count is always "<n> أبواب" — a matn's units are أبواب for
 * both prose and verse.
 */
export function MatnCard({ entry, levelLabel }: { entry: ManifestEntry; levelLabel: string }) {
  const count = `${toArabicIndic(entry.unitCount)} ${labelsFor(entry.type).unitCountWord}`;
  return (
    <Link href={`/mutun/${entry.id}`} className="block h-full">
      <Card className="h-full transition-colors hover:border-primary">
        <div dir="rtl" className="font-arabic flex h-full flex-col gap-2">
          <h2 className="text-xl font-bold text-text">{entry.titleAr}</h2>
          <p className="text-sm text-text-muted">{entry.author}</p>
          <p className="text-sm text-text-muted">{entry.era}</p>
          <div className="mt-auto flex items-center justify-between pt-3 text-sm">
            <span className="rounded-md bg-surface-elevated px-2 py-0.5 text-text-secondary">
              {levelLabel}
            </span>
            <span className="text-text-muted">{count}</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
