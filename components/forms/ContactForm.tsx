'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslations } from 'next-intl';
import { contactSchema, type ContactFormData } from '@/lib/validation/contact';
import { submitContact } from '@/app/actions/contact';
import { cn } from '@/lib/cn';

type FormStatus = 'idle' | 'submitting' | 'success' | { error: 'rate_limited' | 'send_failed' | 'validation_error' };

export default function ContactForm() {
  const t = useTranslations('support.form');
  const [status, setStatus] = useState<FormStatus>('idle');

  const {
    register,
    handleSubmit,
    reset,
    getValues,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setStatus('submitting');
    const result = await submitContact(data);
    
    if (result.success) {
      setStatus('success');
    } else {
      setStatus({ error: result.error });
    }
  };

  if (status === 'success') {
    return (
      <div role="status" className="bg-surface-elevated p-8 rounded-xl border border-border flex flex-col items-center text-center gap-4">
        <h3 className="text-2xl font-bold text-primary">{t('success.heading')}</h3>
        <p className="text-text-muted">{t('success.body')}</p>
        <button
          onClick={() => {
            reset();
            setStatus('idle');
          }}
          className="mt-4 px-6 py-2 bg-primary text-primary-fg rounded-xl font-medium hover:bg-primary-hover transition-colors"
        >
          {t('success.sendAnother')}
        </button>
      </div>
    );
  }

  const isError = typeof status === 'object' && status !== null;

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6" noValidate>
      {isError && (
        <div role="alert" className="bg-error/10 border border-error/50 p-4 rounded-lg">
          <p className="text-error font-medium">
            {status.error === 'rate_limited' 
              ? t('errors.rateLimited') 
              : t('errors.sendFailed')}
          </p>
        </div>
      )}

      <div className="absolute -top-96 opacity-0 pointer-events-none" aria-hidden="true">
        <label>
          <input {...register('website')} tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="name" className="text-text font-medium text-start">
          {t('labels.name')}
        </label>
        <input
          id="name"
          type="text"
          {...register('name')}
          aria-describedby={errors.name ? "name-error" : undefined}
          className="text-start bg-background border border-border rounded-lg px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder={t('placeholders.name')}
        />
        {errors.name?.message && (
          <p id="name-error" className="text-error text-sm text-start" aria-live="polite">
            {t(`errors.${errors.name.message}` as any)}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="email" className="text-text font-medium text-start">
          {t('labels.email')}
        </label>
        <input
          id="email"
          type="email"
          {...register('email')}
          aria-describedby={errors.email ? "email-error" : undefined}
          className="text-start bg-background border border-border rounded-lg px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder={t('placeholders.email')}
        />
        {errors.email?.message && (
          <p id="email-error" className="text-error text-sm text-start" aria-live="polite">
            {t(`errors.${errors.email.message}` as any)}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="subject" className="text-text font-medium text-start">
          {t('labels.subject')}
        </label>
        <input
          id="subject"
          type="text"
          {...register('subject')}
          aria-describedby={errors.subject ? "subject-error" : undefined}
          className="text-start bg-background border border-border rounded-lg px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary"
          placeholder={t('placeholders.subject')}
        />
        {errors.subject?.message && (
          <p id="subject-error" className="text-error text-sm text-start" aria-live="polite">
            {t(`errors.${errors.subject.message}` as any)}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="message" className="text-text font-medium text-start">
          {t('labels.message')}
        </label>
        <textarea
          id="message"
          rows={5}
          {...register('message')}
          aria-describedby={errors.message ? "message-error" : undefined}
          className="text-start bg-background border border-border rounded-lg px-4 py-3 text-text focus:outline-none focus:ring-2 focus:ring-primary resize-y"
          placeholder={t('placeholders.message')}
        />
        {errors.message?.message && (
          <p id="message-error" className="text-error text-sm text-start" aria-live="polite">
            {t(`errors.${errors.message.message}` as any)}
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={status === 'submitting'}
        className={cn(
          "w-full sm:w-auto sm:ms-auto px-8 py-3 rounded-xl font-bold transition-colors",
          status === 'submitting' 
            ? "bg-surface-elevated text-text-muted cursor-not-allowed" 
            : "bg-primary text-primary-fg hover:bg-primary-hover"
        )}
      >
        {status === 'submitting' ? t('submitting') : t('submit')}
      </button>
    </form>
  );
}