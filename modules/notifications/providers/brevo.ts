import { NotificationProvider, NotificationResult, SendEmailOptions, SendSMSOptions, SendWhatsAppOptions } from '../types';

export class BrevoEmailProvider implements NotificationProvider {
  name = 'Brevo';
  private apiKey: string;
  private defaultSenderEmail: string;
  private defaultSenderName: string;

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.BREVO_API_KEY || '';
    this.defaultSenderEmail = process.env.BREVO_SENDER_EMAIL || 'no-reply@qwantomhub.com';
    this.defaultSenderName = process.env.BREVO_SENDER_NAME || 'QwantomHub Pipeline';
  }

  async sendEmail(options: SendEmailOptions): Promise<NotificationResult> {
    if (!this.apiKey) {
      return {
        success: false,
        provider: this.name,
        channel: 'email',
        error: 'BREVO_API_KEY environment variable is not configured',
      };
    }

    try {
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'content-type': 'application/json',
          'api-key': this.apiKey,
        },
        body: JSON.stringify({
          sender: {
            name: options.senderName || this.defaultSenderName,
            email: options.senderEmail || this.defaultSenderEmail,
          },
          to: [{ email: options.to }],
          subject: options.subject,
          htmlContent: options.htmlContent,
          textContent: options.textContent,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          provider: this.name,
          channel: 'email',
          error: data.message || `Brevo HTTP error ${response.status}`,
        };
      }

      return {
        success: true,
        messageId: data.messageId,
        provider: this.name,
        channel: 'email',
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown Brevo error';
      return {
        success: false,
        provider: this.name,
        channel: 'email',
        error: errorMsg,
      };
    }
  }

  async sendSMS(): Promise<NotificationResult> {
    return {
      success: false,
      provider: this.name,
      channel: 'sms',
      error: 'Brevo is configured for Email dispatch only. Use Termii for SMS.',
    };
  }

  async sendWhatsApp(): Promise<NotificationResult> {
    return {
      success: false,
      provider: this.name,
      channel: 'whatsapp',
      error: 'Brevo is configured for Email dispatch only. Use Termii for WhatsApp.',
    };
  }
}
