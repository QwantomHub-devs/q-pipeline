import { describe, it, expect, vi } from 'vitest';
import { sendEmail, sendSMS, sendWhatsApp, sendIntakeConfirmationEmail } from '../service';
import { BrevoEmailProvider } from '../providers/brevo';
import { TermiiMessagingProvider } from '../providers/termii';

describe('Notifications Module & Provider Abstraction (Rule 5 & Vendor Integration)', () => {
  describe('Mock Provider Dispatch (Dev/Test Mode)', () => {
    it('dispatches transactional email via mock provider when API keys absent', async () => {
      const result = await sendEmail({
        to: 'fellow@qwantomhub.com',
        subject: 'Welcome Candidate',
        htmlContent: '<p>Hello Fellow</p>',
      });

      expect(result.success).toBe(true);
      expect(result.channel).toBe('email');
      expect(result.provider).toBe('MockProvider');
      expect(result.messageId).toContain('mock-email-');
    });

    it('dispatches SMS message via mock provider', async () => {
      const result = await sendSMS({
        to: '+2348001112223',
        message: 'Your QwantomHub assessment code is 123456',
      });

      expect(result.success).toBe(true);
      expect(result.channel).toBe('sms');
      expect(result.provider).toBe('MockProvider');
    });

    it('dispatches WhatsApp message via mock provider', async () => {
      const result = await sendWhatsApp({
        to: '+2348001112223',
        message: 'Your QwantomHub cohort update is ready.',
      });

      expect(result.success).toBe(true);
      expect(result.channel).toBe('whatsapp');
      expect(result.provider).toBe('MockProvider');
    });

    it('renders and dispatches intake confirmation template email', async () => {
      const result = await sendIntakeConfirmationEmail('candidate@example.com', 'Chukwuemeka', '2026-Q3');

      expect(result.success).toBe(true);
      expect(result.channel).toBe('email');
    });
  });

  describe('Zod Validation Constraints (Rule 5)', () => {
    it('rejects invalid email formats', async () => {
      await expect(
        sendEmail({
          to: 'invalid-email',
          subject: 'Test',
          htmlContent: 'Hello',
        })
      ).rejects.toThrow();
    });

    it('rejects empty SMS content or invalid phone formats', async () => {
      await expect(
        sendSMS({
          to: '12', // Less than 5 digits
          message: 'Hello',
        })
      ).rejects.toThrow();
    });
  });

  describe('Brevo Provider Key Isolation', () => {
    it('gracefully handles missing BREVO_API_KEY without crashing', async () => {
      const brevo = new BrevoEmailProvider('');
      const result = await brevo.sendEmail({
        to: 'test@example.com',
        subject: 'Test',
        htmlContent: '<p>Test</p>',
      });

      expect(result.success).toBe(false);
      expect(result.provider).toBe('Brevo');
      expect(result.error).toContain('BREVO_API_KEY environment variable is not configured');
    });
  });

  describe('Termii Provider Key Isolation', () => {
    it('gracefully handles missing TERMII_API_KEY without crashing', async () => {
      const termii = new TermiiMessagingProvider('');
      const result = await termii.sendSMS({
        to: '+2348001112223',
        message: 'Test SMS',
      });

      expect(result.success).toBe(false);
      expect(result.provider).toBe('Termii');
      expect(result.error).toContain('TERMII_API_KEY environment variable is not configured');
    });
  });
});
