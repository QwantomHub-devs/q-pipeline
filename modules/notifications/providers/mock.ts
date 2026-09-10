import { NotificationProvider, NotificationResult, SendEmailOptions, SendSMSOptions, SendWhatsAppOptions } from '../types';

export class MockNotificationProvider implements NotificationProvider {
  name = 'MockProvider';

  async sendEmail(options: SendEmailOptions): Promise<NotificationResult> {
    console.log(`[MOCK EMAIL DISPATCH] To: ${options.to} | Subject: ${options.subject}`);
    return {
      success: true,
      messageId: `mock-email-${Date.now()}`,
      provider: this.name,
      channel: 'email',
    };
  }

  async sendSMS(options: SendSMSOptions): Promise<NotificationResult> {
    console.log(`[MOCK SMS DISPATCH] To: ${options.to} | Message: ${options.message}`);
    return {
      success: true,
      messageId: `mock-sms-${Date.now()}`,
      provider: this.name,
      channel: 'sms',
    };
  }

  async sendWhatsApp(options: SendWhatsAppOptions): Promise<NotificationResult> {
    console.log(`[MOCK WHATSAPP DISPATCH] To: ${options.to} | Message: ${options.message}`);
    return {
      success: true,
      messageId: `mock-whatsapp-${Date.now()}`,
      provider: this.name,
      channel: 'whatsapp',
    };
  }
}
