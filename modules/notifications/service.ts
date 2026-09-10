import { NotificationResult, SendEmailOptions, SendSMSOptions, SendWhatsAppOptions } from './types';
import { sendEmailSchema, sendSMSOptionsSchema, sendWhatsAppOptionsSchema } from './validation';
import { BrevoEmailProvider } from './providers/brevo';
import { TermiiMessagingProvider } from './providers/termii';
import { MockNotificationProvider } from './providers/mock';

// Instance singletons
const brevoProvider = new BrevoEmailProvider();
const termiiProvider = new TermiiMessagingProvider();
const mockProvider = new MockNotificationProvider();

function isDevOrMockMode(): boolean {
  return (
    process.env.NODE_ENV === 'test' ||
    process.env.NOTIFICATIONS_MOCK_MODE === 'true' ||
    (!process.env.BREVO_API_KEY && !process.env.TERMII_API_KEY)
  );
}

/**
 * Sends a transactional email notification via Brevo (or Mock Provider in dev/test mode).
 */
export async function sendEmail(options: SendEmailOptions): Promise<NotificationResult> {
  const validated = sendEmailSchema.parse(options);

  if (isDevOrMockMode()) {
    return mockProvider.sendEmail(validated);
  }

  return brevoProvider.sendEmail(validated);
}

/**
 * Sends an SMS message via Termii (or Mock Provider in dev/test mode).
 */
export async function sendSMS(options: SendSMSOptions): Promise<NotificationResult> {
  const validated = sendSMSOptionsSchema.parse(options);

  if (isDevOrMockMode()) {
    return mockProvider.sendSMS(validated);
  }

  return termiiProvider.sendSMS(validated);
}

/**
 * Sends a WhatsApp message via Termii (or Mock Provider in dev/test mode).
 */
export async function sendWhatsApp(options: SendWhatsAppOptions): Promise<NotificationResult> {
  const validated = sendWhatsAppOptionsSchema.parse(options);

  if (isDevOrMockMode()) {
    return mockProvider.sendWhatsApp(validated);
  }

  return termiiProvider.sendWhatsApp(validated);
}

/**
 * Template Helper: Sends an Application Intake Confirmation email to a candidate upon signup.
 */
export async function sendIntakeConfirmationEmail(
  toEmail: string,
  firstName: string,
  cohortWindow: string
): Promise<NotificationResult> {
  const subject = `Welcome to QwantomHub Talent Pipeline (${cohortWindow})`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; color: #46335c; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #bfb5cf; rounded: 8px;">
      <h2 style="color: #46335c;">Application Received, ${firstName}!</h2>
      <p style="color: #5b4e6d; line-height: 1.6;">
        Thank you for submitting your Discover-stage intake application for cohort window <strong>${cohortWindow}</strong>.
      </p>
      <p style="color: #5b4e6d; line-height: 1.6;">
        Your profile identity spine has been created. Your application will proceed to <strong>Stage 0 (Baseline Coding Screen)</strong> and <strong>Stage 1 (AI Code Review)</strong>.
      </p>
      <div style="margin-top: 25px; padding: 15px; background-color: #d4d1e1; border-radius: 6px;">
        <p style="margin: 0; font-size: 14px; color: #2a2136;">
          <strong>Next Steps:</strong> Check your email and candidate dashboard for assessment invitations.
        </p>
      </div>
    </div>
  `;

  return sendEmail({
    to: toEmail,
    subject,
    htmlContent,
  });
}
