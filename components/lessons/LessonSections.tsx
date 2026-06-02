import type { Attribution, Locale, ResolvedLesson, ResolvedSection, TableCell } from '@/lib/lessons/loader';

// Wrap any AR words flagged as `underlined` (all occurrences) without touching
// the surrounding text or its newlines.
function withUnderlines(text: string, underlined?: string[]): React.ReactNode {
  const tokens = (underlined ?? []).filter(Boolean);
  if (tokens.length === 0) return text;
  const escaped = tokens.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const re = new RegExp(`(${escaped.join('|')})`, 'g');
  return text.split(re).map((seg, i) =>
    tokens.includes(seg) ? (
      <strong key={i} className="font-bold underline decoration-primary decoration-2 underline-offset-4">
        {seg}
      </strong>
    ) : (
      <span key={i}>{seg}</span>
    ),
  );
}

function attributionCaption(a: Attribution, locale: Locale): string | null {
  const range = a.ayahStart && a.ayahEnd ? `${a.ayahStart}-${a.ayahEnd}` : a.ayah != null ? `${a.ayah}` : '';
  if (a.isQuran) {
    if (locale === 'en') {
      const ref = a.surahNumber != null ? `${a.surahNumber}${range ? `:${range}` : ''}` : range;
      const base = `— Qurʼan${ref ? ` ${ref}` : ''}`;
      return a.translationSource ? `${base} · Translation: ${a.translationSource}` : base;
    }
    const surah = a.surahAr ?? '';
    return `— ${surah}${range ? ` ${range}` : ''}`.trim() || null;
  }
  if (a.isPoetry) {
    const who = a.poet ?? a.source;
    return who ? `— ${who}` : null;
  }
  return null;
}

function CellContent({ cell, locale }: { cell: TableCell; locale: Locale }) {
  if (locale === 'ar') return <>{cell.ar}</>;
  const text = cell.en?.text && cell.en.text.trim() ? cell.en.text : cell.ar;
  return (
    <>
      {cell.en?.transliteration && (
        <span className="block text-xs italic text-text-muted">{cell.en.transliteration}</span>
      )}
      <span>{text}</span>
    </>
  );
}

function Section({ section, locale }: { section: ResolvedSection; locale: Locale }) {
  const text = (ar: string, en?: string) => (locale === 'en' ? en ?? ar : ar);

  switch (section.type) {
    case 'paragraph':
      return <p className="whitespace-pre-line">{text(section.ar, section.en)}</p>;

    case 'heading':
      return <h2 className="text-2xl font-bold text-text">{text(section.ar, section.en)}</h2>;

    case 'question':
      return <p className="whitespace-pre-line font-semibold text-primary">{text(section.ar, section.en)}</p>;

    case 'highlight': {
      const label = locale === 'en' ? section.labelEn ?? section.labelAr : section.labelAr;
      return (
        <aside className="not-prose my-6 rounded-xl border border-hl-purple-border bg-hl-purple-bg p-5">
          {label && (
            <div className="mb-2 inline-block rounded-md bg-hl-purple-border/30 px-2 py-0.5 text-sm font-bold text-hl-purple-text">
              {label}
            </div>
          )}
          <p className="whitespace-pre-line text-hl-purple-text">{text(section.ar, section.en)}</p>
        </aside>
      );
    }

    case 'quote': {
      const caption = section.attribution ? attributionCaption(section.attribution, locale) : null;
      // Qur'an verses get the high-contrast block; everything else is a plain
      // quote with a logical inline-start border (flips correctly in RTL/LTR).
      if (section.attribution?.isQuran) {
        return (
          <blockquote className="not-prose my-6 rounded-[14px] border border-quote-quran-border/30 bg-quote-quran-bg px-4 py-[18px]">
            <p className="whitespace-pre-line text-quote-quran-text">{text(section.ar, section.en)}</p>
            {caption && <footer className="mt-2 text-sm not-italic text-quote-quran-text">{caption}</footer>}
          </blockquote>
        );
      }
      return (
        <blockquote className="not-prose my-6 border-s-4 border-quote-border ps-4">
          <p className="whitespace-pre-line italic text-quote-text">{text(section.ar, section.en)}</p>
          {caption && <footer className="mt-2 text-sm not-italic text-text-muted">{caption}</footer>}
        </blockquote>
      );
    }

    case 'list': {
      const items = locale === 'en' ? section.itemsEn ?? section.itemsAr : section.itemsAr;
      return (
        <ul>
          {items.map((item, i) => (
            <li key={i} className="whitespace-pre-line">
              {item}
            </li>
          ))}
        </ul>
      );
    }

    case 'example':
      return (
        <div className="not-prose my-6 space-y-3 rounded-xl border border-border bg-surface/50 p-5">
          {section.items.map((item, i) => {
            if (locale === 'en') {
              const enText = item.en?.text && item.en.text.trim() ? item.en.text : item.ar.text;
              return (
                <div key={i}>
                  {item.en?.transliteration && (
                    <p className="text-sm italic text-text-muted">{item.en.transliteration}</p>
                  )}
                  <p className="whitespace-pre-line text-text">{enText}</p>
                </div>
              );
            }
            return (
              <p key={i} className="whitespace-pre-line text-text">
                {withUnderlines(item.ar.text, item.ar.underlined)}
              </p>
            );
          })}
        </div>
      );

    case 'table':
      return (
        <div className="not-prose my-6 overflow-x-auto">
          <table className="w-full border-collapse text-start">
            <thead>
              <tr>
                {section.headers.map((h, c) => (
                  <th key={c} className="border border-border bg-surface px-3 py-2 text-start font-bold text-text">
                    <CellContent cell={h} locale={locale} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c} className="border border-border px-3 py-2 align-top text-text">
                      <CellContent cell={cell} locale={locale} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

export default function LessonSections({ lesson }: { lesson: ResolvedLesson }) {
  return (
    <article className="prose max-w-none">
      {lesson.sections.map((section) => (
        <Section key={section.id} section={section} locale={lesson.locale} />
      ))}
    </article>
  );
}
