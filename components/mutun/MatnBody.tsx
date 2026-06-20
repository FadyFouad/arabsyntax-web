import { Markup } from './Markup';
import { VerseLine } from './VerseLine';
import type { MatnContent, Section, Unit } from '@/lib/mutun/schema';

// The matn body is ALWAYS Arabic / RTL, regardless of the site's UI locale, so
// this surface forces dir+font itself rather than inheriting the page's.

function Paragraph({ section }: { section: Section }) {
  if (!section.text) return null;
  return (
    <p className="whitespace-pre-line leading-[2.2] text-text-body">
      <Markup text={section.text} />
    </p>
  );
}

function ProseSections({ sections }: { sections: Section[] }) {
  // Prose أبواب are mostly paragraphs, but a prose matn (e.g. قطر الندى) embeds
  // poetic شواهد as `verse` sections — render those as أبيات inline rather than
  // dropping them. شاهد numbering is 1-based among the verses within this باب.
  const isVerse = (s: Section) => s.type === 'verse' && !!s.sadr && !!s.ajz;
  return (
    <div className="space-y-4">
      {sections.map((s, i) => {
        if (isVerse(s)) {
          const number = sections.slice(0, i + 1).filter(isVerse).length;
          return <VerseLine key={i} sadr={s.sadr!} ajz={s.ajz!} number={number} />;
        }
        return <Paragraph key={i} section={s} />;
      })}
    </div>
  );
}

function VerseSections({ sections }: { sections: Section[] }) {
  // Only `verse` sections carry أبيات; numbering is 1-based within this باب. A
  // faint divider + larger gap separates consecutive أبيات (never before the
  // first). Non-verse sections (none in the verse matn) are skipped defensively.
  const abyat = sections.filter(
    (s): s is Section & { sadr: string; ajz: string } =>
      s.type === 'verse' && !!s.sadr && !!s.ajz,
  );
  return (
    <div>
      {abyat.map((s, idx) => (
        <div key={idx} className={idx > 0 ? 'mt-6 border-t border-border/40 pt-6' : undefined}>
          <VerseLine sadr={s.sadr} ajz={s.ajz} number={idx + 1} />
        </div>
      ))}
    </div>
  );
}

function UnitView({ unit, type, sharhLabel }: { unit: Unit; type: MatnContent['type']; sharhLabel: string }) {
  const Body = type === 'verse' ? VerseSections : ProseSections;
  return (
    <section className="space-y-5">
      {unit.title && <h2 className="text-2xl font-bold text-text">{unit.title}</h2>}
      <Body sections={unit.body.sections as Section[]} />
      {unit.sharh && unit.sharh.sections.length > 0 && (
        <details className="rounded-xl border border-border bg-surface/50 p-4 open:pb-5">
          <summary className="cursor-pointer font-semibold text-primary">{sharhLabel}</summary>
          <div className="mt-3">
            <ProseSections sections={unit.sharh.sections as Section[]} />
          </div>
        </details>
      )}
    </section>
  );
}

export function MatnBody({ matn, sharhLabel }: { matn: MatnContent; sharhLabel: string }) {
  const units = [...matn.units].sort((a, b) => a.order - b.order);
  return (
    <article dir="rtl" className="font-arabic space-y-12">
      {units.map((unit) => (
        <UnitView key={unit.order} unit={unit} type={matn.type} sharhLabel={sharhLabel} />
      ))}
    </article>
  );
}
