import { siteConfig } from '@/lib/siteConfig';

// Fallbacks point at the public domain support address (never a personal inbox)
// so a missing env var degrades safely instead of leaking/rerouting to a person.
export function getSupportEmail() {
  return process.env.SUPPORT_EMAIL || siteConfig.supportEmail;
}

export function getResendFromEmail() {
  return process.env.RESEND_FROM_EMAIL || siteConfig.supportEmail;
}

export function getContactEmailConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: getResendFromEmail(),
    supportEmail: getSupportEmail(),
  };
}
