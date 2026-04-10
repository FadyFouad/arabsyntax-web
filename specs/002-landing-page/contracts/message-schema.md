# Contract: Landing Page Message Schema

**Feature**: 002-landing-page
**Applies to**: `messages/ar.json`, `messages/en.json` (extends existing files)

This contract defines the `landing` namespace added to both locale message files.
All existing keys (`common`, `nav`, `footer`) are unchanged.

---

## Schema

```typescript
type LandingMessages = {
  landing: {
    hero: {
      tagline: string;          // Short tagline (1 line)
      headline: string;         // App name / main headline
      valueProposition: string; // One-sentence value prop
      ctaLabel: string;         // Badge label: "تحميل من Google Play" / "Get it on Google Play"
      mockupAlt: string;        // Alt text for the phone mockup image
    };

    features: {
      heading: string;          // Section h2
      subtitle: string;         // Section subtitle
      cards: {
        audioLessons: { title: string; description: string };
        structured:   { title: string; description: string };
        quizzes:      { title: string; description: string };
        examPrep:     { title: string; description: string };
        irab:         { title: string; description: string };
        offline:      { title: string; description: string };
      };
    };

    howItWorks: {
      heading: string;
      subtitle: string;
      steps: {
        1: { title: string; description: string };
        2: { title: string; description: string };
        3: { title: string; description: string };
      };
    };

    screenshots: {
      heading: string;
      subtitle: string;
      alts: {
        lesson:   string;       // Alt for lesson screenshot
        quiz:     string;       // Alt for quiz screenshot
        examples: string;       // Alt for examples screenshot
      };
    };

    pricing: {
      heading: string;
      subtitle: string;
      legacyNote: string;       // Legacy purchaser notice
      tiers: {
        free: {
          name: string;
          price: string;        // e.g., "مجاني" / "Free"
          features: string[];   // Array of feature strings
          cta: string;          // "ابدأ الآن" / "Get Started"
        };
        monthly: {
          name: string;
          price: string;        // TODO: replace with real value. Placeholder: "٣٩ ج.م / شهر"
          features: string[];
          cta: string;          // "اشترك شهرياً" / "Subscribe Monthly"
        };
        yearly: {
          name: string;
          popularLabel: string; // "الأكثر شيوعاً" / "Most Popular"
          price: string;        // TODO: replace with real value. Placeholder: "٢٩٩ ج.م / سنة"
          features: string[];
          cta: string;          // "اشترك سنوياً" / "Subscribe Yearly"
        };
        lifetime: {
          name: string;
          price: string;        // TODO: replace with real value. Placeholder: "٤٩٩ ج.م مرة واحدة"
          features: string[];
          cta: string;          // "احصل على الوصول الدائم" / "Get Lifetime Access"
        };
      };
    };

    audiences: {
      heading: string;
      subtitle: string;
      students: {
        heading: string;        // "لطلاب الثانوية العامة"
        description: string;
      };
      learners: {
        heading: string;        // "لمحبِّي العربية"
        description: string;
      };
    };

    faq: {
      heading: string;
      subtitle: string;
      items: {
        freePaid: { question: string; answer: string };
        offline:  { question: string; answer: string };
        ios:      { question: string; answer: string };
        legacy:   { question: string; answer: string };
        exam:     { question: string; answer: string };
        update:   { question: string; answer: string };
      };
    };

    finalCta: {
      headline: string;
      subtitle: string;
      ctaLabel: string;         // Same as hero.ctaLabel or different CTA phrasing
    };
  };
};
```

---

## Key Constraints

1. **Every key in `ar.json` MUST have a matching key in `en.json`** at the same
   path. A mismatch is a contract violation.
2. **`pricing.tiers.monthly.price`, `.yearly.price`, `.lifetime.price`** are
   placeholders. They MUST each have an inline TODO comment in the message file
   pointing to the final value source.
3. **`pricing.tiers.*.features`** is a JSON array of strings. Each string is one
   feature bullet point for that tier.
4. **All Arabic copy must be real Arabic** — no Latin characters, no Lorem Ipsum,
   no transliterations, except the brand name "ArabSyntax" which may appear as-is.
5. **`hero.mockupAlt` and `screenshots.alts.*`** must be descriptive, locale-
   appropriate alt text (not empty, not generic "screenshot").
6. **The `landing` namespace is loaded per-section**: each section component calls
   `getTranslations('landing.hero')`, `getTranslations('landing.features')`, etc.
   This prevents loading the entire landing namespace into a single component.
