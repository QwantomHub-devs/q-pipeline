export type NotificationChannel = 'email' | 'sms' | 'whatsapp';

export type NotificationTemplate =
  | 'intake_received'
  | 'assessment_invite'
  | 'assessment_passed'
  | 'placement_update';

export interface SendEmailOptions {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  senderName?: string;
  senderEmail?: string;
}

export interface SendSMSOptions {
  to: string; // E.164 or local phone format
  message: string;
}

export interface SendWhatsAppOptions {
  to: string;
  message: string;
  mediaUrl?: string;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  provider: string;
  channel: NotificationChannel;
  error?: string;
}

export interface NotificationProvider {
  name: string;
  sendEmail(options: SendEmailOptions): Promise<NotificationResult>;
  sendSMS(options: SendSMSOptions): Promise<NotificationResult>;
  sendWhatsApp(options: SendWhatsAppOptions): Promise<NotificationResult>;
}
