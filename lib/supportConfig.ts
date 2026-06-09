import { siteConfig } from '@/lib/siteConfig';

export function getSupportEmail() {
  return process.env.SUPPORT_EMAIL || siteConfig.developer.email;
}

export function getResendFromEmail() {
  return process.env.RESEND_FROM_EMAIL || siteConfig.developer.email;
}

export function getContactEmailConfig() {
  return {
    apiKey: process.env.RESEND_API_KEY,
    fromEmail: getResendFromEmail(),
    supportEmail: getSupportEmail(),
  };
}
