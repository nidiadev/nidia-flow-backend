import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Injectable, Scope } from '@nestjs/common';
import { Job } from 'bullmq';
import { TenantPrismaService } from '../services/tenant-prisma.service';
import { NotificationService } from '../services/communications/notification.service';
import { WebSocketEventService } from '../../common/events/websocket-event.service';

/**
 * ActivityReminderProcessor
 * 
 * Procesa recordatorios de actividades en segundo plano
 * Se ejecuta periódicamente para verificar recordatorios pendientes
 * 
 * CONTEXTO: TENANT
 */
@Processor('activity-reminders')
@Injectable({ scope: Scope.DEFAULT })
export class ActivityReminderProcessor extends WorkerHost {
  private readonly logger = new Logger(ActivityReminderProcessor.name);

  constructor(
    private readonly tenantPrisma: TenantPrismaService,
    private readonly notificationService: NotificationService,
    private readonly websocketService: WebSocketEventService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    this.logger.log(`Processing activity reminders job: ${job.id}`);

    try {
      // Get tenantId from context (stored in TenantPrismaService)
      // NOTE: This processor requires tenant context to be set before processing
      const tenantContext = this.tenantPrisma.getTenantContext();
      if (!tenantContext) {
        this.logger.warn('No tenant context available, skipping reminder processing');
        return { processed: 0, success: false, error: 'No tenant context' };
      }
      const tenantId = tenantContext.tenantId;

      const prisma = await this.tenantPrisma.getTenantClient();
      const now = new Date();

      // Find reminders that should be sent (reminderAt <= now and not sent)
      const remindersToSend = await prisma.activityReminder.findMany({
        where: {
          reminderAt: {
            lte: now,
          },
          notificationSent: false,
        },
        include: {
          interaction: {
            include: {
              assignedToUser: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true,
                },
              },
              customer: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  companyName: true,
                },
              },
            },
          },
        },
      });

      this.logger.log(`Found ${remindersToSend.length} reminders to send`);

      for (const reminder of remindersToSend) {
        try {
          await this.sendReminder(reminder, tenantId);
          
          // Mark reminder as sent
          await prisma.activityReminder.update({
            where: { id: reminder.id },
            data: {
              notificationSent: true,
              sentAt: new Date(),
            },
          });

          this.logger.log(`Reminder ${reminder.id} sent successfully`);
        } catch (error: any) {
          this.logger.error(`Failed to send reminder ${reminder.id}: ${error.message}`, error.stack);
          // Continue with next reminder even if one fails
        }
      }

      return {
        processed: remindersToSend.length,
        success: true,
      };
    } catch (error: any) {
      this.logger.error(`Failed to process activity reminders: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Send reminder notification
   */
  private async sendReminder(reminder: any, tenantId: string): Promise<void> {
    const interaction = reminder.interaction;
    const assignedUser = interaction.assignedToUser;

    if (!assignedUser) {
      this.logger.warn(`Interaction ${interaction.id} has no assigned user, skipping reminder`);
      return;
    }

    // Format scheduled time
    const scheduledAt = new Date(interaction.scheduledAt);
    const timeStr = scheduledAt.toLocaleString('es-ES', {
      dateStyle: 'short',
      timeStyle: 'short',
    });

    // Create notification
    const title = `Recordatorio: ${interaction.subject || interaction.type}`;
    const message = `Tienes una actividad programada: ${interaction.subject || interaction.type} con ${interaction.customer?.companyName || interaction.customer?.firstName || 'Cliente'} el ${timeStr}`;

    await this.notificationService.create({
      userId: assignedUser.id,
      type: 'activity_reminder',
      title,
      message,
      entityType: 'interaction',
      entityId: interaction.id,
      actionUrl: `/crm/calendar/activities/${interaction.id}`,
    });

    // Send WebSocket notification
    await this.websocketService.broadcastNotification(
      tenantId,
      {
        title,
        message,
        type: 'info',
        userId: assignedUser.id,
        actionUrl: `/crm/calendar/activities/${interaction.id}`,
      },
    );

    this.logger.log(`Reminder notification sent to user ${assignedUser.id}`);
  }
}

