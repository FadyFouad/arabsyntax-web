import { siteConfig } from '@/lib/siteConfig';

// Fallbacks point at the public domain support address (never a personal inbox)
// so a missing env var degrades safely instead of leaking/rerouting to a person.
export function getSupportEmail() {
  return process.env.SUPPORT_EMAIL || siteConfig.supportEmail;
}

export function getResendFromEmail() {
  // RESEND_FROM_EMAIL must be a Resend-verified sender on the domain. The
  // siteConfig fallback keeps the address on-brand, but warn so a missing env
  // var in production is visible rather than silently risking failed delivery.
  if (!process.env.RESEND_FROM_EMAIL) {
    console.warn(
      'RESEND_FROM_EMAIL is not set; falling back to siteConfig.supportEmail. ' +
        'Ensure this address is a verified Resend sender or delivery will fail.'
    );
  }
  return process.env.RESEND_FROM_EMAIL || siteConfig.supportEmail;
}

export function getContactEmailConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: getResendFromEmail(),
    supportEmail: getSupportEmail(),
  };
}
