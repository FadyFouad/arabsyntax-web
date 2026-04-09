# Contract: Locale Message File Schema

**Feature**: 001-site-foundation
**Applies to**: `messages/ar.json`, `messages/en.json`

This contract defines the required shape of both locale message files for the
foundation feature. Every key listed here MUST be present in both files before
implementation is considered complete. Additional keys for future features MAY
be added later following the same nesting convention.

---

## Schema

```typescript
type Messages = {
  common: {
    appName: string;          // Brand name: "ArabSyntax"
    appNameAr: string;        // Arabic name: "النحو العربي"
    skipToContent: string;    // Accessibility skip link label
  };
  nav: {
    features: string;         // "المميزات" / "Features"
    pricing: string;          // "الأسعار" / "Pricing"
    faq: string;              // "الأسئلة الشائعة" / "FAQ"
    support: string;          // "الدعم" / "Support"
    openMenu: string;         // Mobile menu aria-label: "فتح القائمة" / "Open menu"
    closeMenu: string;        // Mobile menu aria-label: "إغلاق القائمة" / "Close menu"
  };
  footer: {
    product: {
      heading: string;        // Column heading: "المنتج" / "Product"
      features: string;       // "المميزات" / "Features"
      pricing: string;        // "الأسعار" / "Pricing"
    };
    legal: {
      heading: string;        // Column heading: "قانوني" / "Legal"
      privacy: string;        // "سياسة الخصوصية" / "Privacy Policy"
      terms: string;          // "شروط الاستخدام" / "Terms of Service"
    };
    support: {
      heading: string;        // Column heading: "الدعم" / "Support"
      contact: string;        // "تواصل معنا" / "Contact Us"
      faq: string;            // "الأسئلة الشائعة" / "FAQ"
    };
    langSwitcher: {
      label: string;          // Aria-label: "تغيير اللغة" / "Change language"
      ar: string;             // "العربية" / "Arabic"
      en: string;             // "English" / "English"
    };
    copyright: string;        // "© {year} ArabSyntax. جميع الحقوق محفوظة."
                              // "© {year} ArabSyntax. All rights reserved."
  };
}
```

---

## Key Constraints

1. **No hardcoded strings in components**: Every user-visible string MUST be
   read via `useTranslations()` (client components) or `getTranslations()`
   (server components) from next-intl using these keys.

2. **Brand name exception**: "ArabSyntax" as a brand token may appear in
   component JSX directly (not through messages) since it is not translatable.
   The Arabic app name "النحو العربي" MUST come from `common.appNameAr`.

3. **Copyright year**: The `footer.copyright` string uses an ICU-format
   placeholder `{year}` that is substituted at render time with the server's
   current year. Example: `"© {year} ArabSyntax. جميع الحقوق محفوظة."`.

4. **Real Arabic copy required**: `messages/ar.json` MUST contain real Arabic
   strings — not transliterated text or placeholders — because the Cairo font
   requires actual Arabic glyphs to validate rendering.

5. **Message key nesting**: All keys use camelCase. Nested objects group keys
   by feature area. This schema is the authoritative reference; any addition
   to `ar.json` MUST have a corresponding entry in `en.json` and vice versa.
