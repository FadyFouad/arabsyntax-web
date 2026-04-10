# Data Model: Marketing Landing Page

**Feature**: 002-landing-page | **Date**: 2026-04-10

No database entities. All page data is static content defined in locale message
files and loaded at build time via Server Components.

---

## Section Registry (Render Order)

The landing page renders sections in this fixed order:

| Order | Component | id attribute | Server/Client |
|-------|-----------|-------------|---------------|
| 1 | Hero | (none — above fold) | Server |
| 2 | Features | `features` | Server |
| 3 | HowItWorks | `how-it-works` | Server |
| 4 | Screenshots | `screenshots` | Server |
| 5 | Pricing | `pricing` | Server |
| 6 | Audiences | `audiences` | Server |
| 7 | FAQ | `faq` | Server (`<details>/<summary>`) |
| 8 | FinalCTA | (none — page end) | Server |

Anchor links from the header use `#features`, `#pricing`, `#faq`. The other
section IDs are present but not linked from the header.

---

## Feature Card (6 instances)

```typescript
type FeatureCard = {
  key: string;          // Message key suffix: 'audioLessons' | 'structured' | 'quizzes'
                        //                    | 'examPrep' | 'irab' | 'offline'
  iconName: string;     // lucide-react icon name (e.g., 'Headphones', 'BookOpen')
  titleKey: string;     // landing.features.cards.{key}.title
  descriptionKey: string; // landing.features.cards.{key}.description
};
```

**Six cards (in order)**:

| Key | Icon | Title (Arabic) | Title (English) |
|-----|------|----------------|-----------------|
| `audioLessons` | `Headphones` | دروس صوتية | Audio Lessons |
| `structured` | `BookOpen` | محتوى منظَّم | Structured Content |
| `quizzes` | `BrainCircuit` | اختبارات تفاعلية | Interactive Quizzes |
| `examPrep` | `GraduationCap` | تحضير للثانوية العامة | Thanaweya Amma Prep |
| `irab` | `PenLine` | أمثلة بإعراب مفصَّل | Worked Examples with إعراب |
| `offline` | `WifiOff` | وصول بلا إنترنت | Offline Access |

---

## How It Works Step (3 instances)

```typescript
type HowItWorksStep = {
  number: 1 | 2 | 3;
  titleKey: string;       // landing.howItWorks.steps.{n}.title
  descriptionKey: string; // landing.howItWorks.steps.{n}.description
};
```

| Step | Title (Arabic) | Title (English) |
|------|----------------|-----------------|
| 1 | اختر درساً | Pick a Lesson |
| 2 | استمع وتعلَّم | Listen and Learn |
| 3 | اختبِر نفسك | Test Yourself |

---

## App Screenshot (minimum 3 instances)

```typescript
type AppScreenshot = {
  filename: string;   // e.g., 'lesson.png', 'quiz.png', 'examples.png'
  width: number;      // explicit pixel width (e.g., 390)
  height: number;     // explicit pixel height (e.g., 844)
  altKey: string;     // landing.screenshots.alts.{name}
};
```

Placeholder screenshots during development: solid dark rectangles labeled with
section name. Real screenshots to be replaced before feature is marked done.

---

## Pricing Tier (4 instances)

```typescript
type PricingTier = {
  key: 'free' | 'monthly' | 'yearly' | 'lifetime';
  nameKey: string;           // landing.pricing.tiers.{key}.name
  priceKey: string;          // landing.pricing.tiers.{key}.price (placeholder)
  featuresKey: string[];     // landing.pricing.tiers.{key}.features (array of strings)
  isPopular: boolean;        // true for 'yearly' only
  ctaKey: string;            // landing.pricing.tiers.{key}.cta
  ctaUrl: string | null;     // Play Store URL for paid; null for free
};
```

| Tier | Popular | Price (placeholder) |
|------|---------|---------------------|
| free | false | — (free) |
| monthly | false | ٣٩ ج.م / شهر |
| yearly | **true** | ٢٩٩ ج.م / سنة |
| lifetime | false | ٤٩٩ ج.م مرة واحدة |

The legacy purchaser note is a standalone string key:
`landing.pricing.legacyNote`.

---

## Audience Callout (2 instances)

```typescript
type AudienceCallout = {
  key: 'students' | 'learners';
  iconName: string;           // lucide-react icon
  headingKey: string;         // landing.audiences.{key}.heading
  descriptionKey: string;     // landing.audiences.{key}.description
};
```

| Key | Icon | Heading (Arabic) | Heading (English) |
|-----|------|-----------------|-------------------|
| `students` | `GraduationCap` | لطلاب الثانوية العامة | For Thanaweya Amma Students |
| `learners` | `BookHeart` | لمحبِّي العربية | For Arabic Language Learners |

---

## FAQ Item (minimum 6 instances)

```typescript
type FaqItem = {
  key: string;           // e.g., 'freePaid', 'offline', 'ios', 'legacy', 'exam', 'update'
  questionKey: string;   // landing.faq.items.{key}.question
  answerKey: string;     // landing.faq.items.{key}.answer
};
```

**Six required topics** (keys and topic area):

| Key | Topic |
|-----|-------|
| `freePaid` | Difference between free and paid tiers |
| `offline` | Offline access — what works without internet |
| `ios` | iOS availability (answer: not yet, Android only) |
| `legacy` | Legacy purchasers — they keep all premium features |
| `exam` | Exam prep relevance for ثانوية عامة |
| `update` | How often content is updated |

---

## New UI Components (compile-time, no data)

| Component | Type | Reusability |
|-----------|------|-------------|
| `AnimatedSection` | Client (framer-motion) | Wraps any section with fade-up |
| `PlayStoreBadge` | Server | Hero + FinalCTA |
| `AppStoreBadge` | Server (returns null) | Future use |
| `Card` | Server | Features, Pricing, Audiences |
| `SectionHeading` | Server | All sections |

---

## Message File Extension

Existing top-level namespaces: `common`, `nav`, `footer`.
New namespace to add: `landing`.

```
landing.hero.*
landing.features.*
landing.howItWorks.*
landing.screenshots.*
landing.pricing.*
landing.audiences.*
landing.faq.*
landing.finalCta.*
```

See `contracts/message-schema.md` for the full key tree.
