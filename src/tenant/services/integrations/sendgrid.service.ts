import { Injectable, Logger, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * SendGridService - Integración con SendGrid para emails
 * 
 * CONTEXTO: TENANT
 * Proporciona integración básica con SendGrid para envío de emails
 * 
 * NOTA: Esta es una estructura base. La implementación completa requiere:
 * - Configuración de API key en CompanySettings
 * - Template management para emails transaccionales
 * - Webhook handlers para delivery status (opened, clicked, bounced, etc.)
 * - Attachment handling
 */
@Injectable({ scope: Scope.REQUEST })
export class SendGridService {
  private readonly logger = new Logger(SendGridService.name);
  private readonly apiKey: string | null = null;
  private readonly fromEmail: string | null = null;
  private readonly fromName: string | null = null;

  constructor(private readonly configService: ConfigService) {
    // TODO: Load configuration from CompanySettings or environment
    // this.apiKey = this.configService.get('SENDGRID_API_KEY') || null;
    // this.fromEmail = this.configService.get('SENDGRID_FROM_EMAIL') || null;
    // this.fromName = this.configService.get('SENDGRID_FROM_NAME') || null;
  }

  /**
   * Send an email via SendGrid
   */
  async sendEmail(
    to: string,
    subject: string,
    content: string,
    options?: {
      toName?: string;
      htmlContent?: string;
      templateId?: string;
      templateData?: Record<string, any>;
      attachments?: Array<{
        content: string; // Base64 encoded
        filename: string;
        type?: string;
      }>;
      replyTo?: string;
      cc?: string[];
      bcc?: string[];
    },
  ): Promise<{
    success: boolean;
    messageId?: string;
    providerMessageId?: string;
    error?: string;
  }> {
    try {
      this.logger.log(`Sending email to ${to}`);

      if (!this.apiKey || !this.fromEmail) {
        this.logger.warn('SendGrid integration not configured');
        return {
          success: false,
          error: 'SendGrid integration not configured. Please configure API key and from email.',
        };
      }

      // TODO: Implement actual SendGrid API call
      // const sgMail = require('@sendgrid/mail');
      // sgMail.setApiKey(this.apiKey);
      //
      // const msg = {
      //   to,
      //   from: {
      //     email: this.fromEmail,
      //     name: this.fromName,
      //   },
      //   subject,
      //   text: content,
      //   html: options?.htmlContent || content,
      //   attachments: options?.attachments,
      //   replyTo: options?.replyTo,
      //   cc: options?.cc,
      //   bcc: options?.bcc,
      // };
      //
      // if (options?.templateId) {
      //   msg.templateId = options.templateId;
      //   msg.dynamicTemplateData = options.templateData;
      // }
      //
      // const [response] = await sgMail.send(msg);
      // return {
      //   success: true,
      //   messageId: response.headers['x-message-id'],
      //   providerMessageId: response.headers['x-message-id'],
      // };

      // Placeholder response
      return {
        success: true,
        messageId: `email_${Date.now()}`,
        providerMessageId: `sg_${Date.now()}`,
      };
    } catch (error: any) {
      this.logger.error(`Failed to send email: ${error.message}`, error.stack);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Handle incoming webhook from SendGrid
   */
  async handleWebhook(payload: any[]): Promise<Array<{
    messageId: string;
    event: 'delivered' | 'opened' | 'clicked' | 'bounced' | 'dropped' | 'deferred';
    timestamp: Date;
    email?: string;
    reason?: string;
  }>> {
    try {
      this.logger.log(`Processing SendGrid webhook with ${payload.length} events`);

      // TODO: Parse SendGrid webhook payload
      // SendGrid sends an array of events
      // Each event has: email, event, timestamp, sg_message_id, etc.

      const events = payload.map((event: any) => ({
        messageId: event.sg_message_id || event['message-id'],
        event: event.event,
        timestamp: new Date(event.timestamp * 1000),
        email: event.email,
        reason: event.reason,
      }));

      return events;
    } catch (error: any) {
      this.logger.error(`Failed to handle SendGrid webhook: ${error.message}`, error.stack);
      return [];
    }
  }

  /**
   * Validate email address format
   */
  validateEmail(email: string): { valid: boolean; error?: string } {
    try {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const valid = emailRegex.test(email);

      if (!valid) {
        return {
          valid: false,
          error: 'Invalid email format',
        };
      }

      return { valid: true };
    } catch (error: any) {
      return {
        valid: false,
        error: error.message,
      };
    }
  }

  /**
   * Check if SendGrid integration is configured
   */
  isConfigured(): boolean {
    return !!(this.apiKey && this.fromEmail);
  }

  /**
   * Get SendGrid configuration info
   */
  getConfigInfo(): { configured: boolean; fromEmail: string | null } {
    return {
      configured: this.isConfigured(),
      fromEmail: this.fromEmail,
    };
  }
}

