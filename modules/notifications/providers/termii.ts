import { NotificationProvider, NotificationResult, SendEmailOptions, SendSMSOptions, SendWhatsAppOptions } from '../types';

export class TermiiMessagingProvider implements NotificationProvider {
  name = 'Termii';
  private apiKey: string;
  private senderId: string;

  constructor(apiKey?: string, senderId?: string) {
    this.apiKey = apiKey || process.env.TERMII_API_KEY || '';
    this.senderId = senderId || process.env.TERMII_SENDER_ID || 'QwantomHub';
  }

  async sendSMS(options: SendSMSOptions): Promise<NotificationResult> {
    if (!this.apiKey) {
      return {
        success: false,
        provider: this.name,
        channel: 'sms',
        error: 'TERMII_API_KEY environment variable is not configured',
      };
    }

    try {
      const response = await fetch('https://api.ng.termii.com/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: options.to,
          from: this.senderId,
          sms: options.message,
          type: 'plain',
          channel: 'generic',
          api_key: this.apiKey,
        }),
      });

      const data = await response.json();

      if (!response.ok || (data.code && data.code !== 'ok')) {
        return {
          success: false,
          provider: this.name,
          channel: 'sms',
          error: data.message || `Termii HTTP error ${response.status}`,
        };
      }

      return {
        success: true,
        messageId: data.message_id,
        provider: this.name,
        channel: 'sms',
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown Termii error';
      return {
        success: false,
        provider: this.name,
        channel: 'sms',
        error: errorMsg,
      };
    }
  }

  async sendWhatsApp(options: SendWhatsAppOptions): Promise<NotificationResult> {
    if (!this.apiKey) {
      return {
        success: false,
        provider: this.name,
        channel: 'whatsapp',
        error: 'TERMII_API_KEY environment variable is not configured',
      };
    }

    try {
      const response = await fetch('https://api.ng.termii.com/api/sms/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: options.to,
          from: this.senderId,
          sms: options.message,
          type: 'plain',
          channel: 'whatsapp',
          api_key: this.apiKey,
        }),
      });

      const data = await response.json();

      return {
        success: response.ok,
        messageId: data.message_id,
        provider: this.name,
        channel: 'whatsapp',
        error: response.ok ? undefined : data.message,
      };
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown Termii error';
      return {
        success: false,
        provider: this.name,
        channel: 'whatsapp',
        error: errorMsg,
      };
    }
  }

  async sendEmail(): Promise<NotificationResult> {
    return {
      success: false,
      provider: this.name,
      channel: 'email',
      error: 'Termii is configured for SMS/WhatsApp dispatch only. Use Brevo for Email.',
    };
  }
}
