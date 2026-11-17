import { Link } from '@/i18n/routing';
import type { I3rabEntry } from '@/lib/i3rab/loader';

// Ornate Qur'an brackets / end-of-ayah mark — defensive; current data has none,
// but a future Qur'anic sentence gets the design-system verse-block treatment.
const QURAN_RE = /[﴾﴿۝]/;

interface Props {
  entry: I3rabEntry;
  labels: { words: string; explanation: string; relatedLesson: string };
}

// The entry is Arabic on both locales; only the labels are translated. On /en
// the body is LTR in the Latin font stack, so each Arabic block is marked
// lang/dir and given the Arabic webfont. (No-ops on the Arabic page.)
const ARABIC = { lang: 'ar', dir: 'rtl' } as const;

export default function I3rabWords({ entry, labels }: Props) {
  const isQuran = QURAN_RE.test(entry.sentence);

  return (
    <article>
      <h1
        {...ARABIC}
        className={
          isQuran
            ? 'font-arabic not-prose mb-8 mt-4 rounded-[14px] border border-quote-quran-border/30 bg-quote-quran-bg px-4 py-[18px] text-2xl font-bold leading-loose text-quote-quran-text'
            : 'font-arabic mb-8 mt-4 text-3xl font-bold leading-loose text-text lg:text-4xl'
        }
      >
        {entry.sentence}
      </h1>

      <h2 className="mb-4 text-xl font-bold text-text-secondary">{labels.words}</h2>
      <ol {...ARABIC} className="font-arabic space-y-4">
        {entry.words.map((w, i) => (
          <li key={i} className="rounded-xl border border-border bg-surface p-4">
            <span className="text-lg font-bold text-primary">{w.word}</span>
            <div className="mt-1 space-y-0.5">
              {w.irab.split('\n').map((line, j) => (
                <p key={j} className="text-text-body">
                  {line}
                </p>
              ))}
            </div>
          </li>
        ))}
      </ol>

      {entry.explanation.trim() && (
        <div className="mt-8">
          <h2 className="mb-2 text-xl font-bold text-text-secondary">{labels.explanation}</h2>
          <p {...ARABIC} className="font-arabic text-text-body">
            {entry.explanation}
          </p>
        </div>
      )}

      {entry.lessonName && entry.lessonName.trim() && (
        <p className="mt-8 text-sm text-text-muted">
          {labels.relatedLesson}:{' '}
          {entry.lessonHref ? (
            <Link {...ARABIC} href={entry.lessonHref} className="font-arabic font-medium text-primary hover:underline">
              {entry.lessonName}
            </Link>
          ) : (
            <span {...ARABIC} className="font-arabic text-text-secondary">
              {entry.lessonName}
            </span>
          )}
        </p>
      )}
    </article>
  );
}
