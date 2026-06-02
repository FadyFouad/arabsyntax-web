export const siteConfig = {
  name: {
    en: "Al-Nahw Al-Kafi",
    ar: "النحو الكافي",
  },
  developer: {
    name: "ETA TECH",
    contact: "Fady Fouad",
    email: "fady.fouad.a@gmail.com",
  },
  stores: {
    googlePlay: "https://play.google.com/store/apps/details?id=com.etateck.arabsyntax",
    appStore: "https://apps.apple.com/us/app/%D8%A7%D9%84%D9%86%D8%AD%D9%88-%D8%A7%D9%84%D9%83%D8%A7%D9%81%D9%8A/id6448959921",
  },
  rating: {
    stars: 4.7,
    reviewCount: 2600,
    source: "Google Play",
  },
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
} as const;

export type SiteConfig = typeof siteConfig;
