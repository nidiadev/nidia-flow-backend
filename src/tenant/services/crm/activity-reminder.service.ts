import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Cron, CronExpression } from '@nestjs/schedule';

/**
 * ActivityReminderService
 * 
 * Servicio para programar y gestionar recordatorios de actividades
 * Programa jobs periódicos para procesar recordatorios pendientes
 */
@Injectable()
export class ActivityReminderService implements OnModuleInit {
  private readonly logger = new Logger(ActivityReminderService.name);

  constructor(
    @InjectQueue('activity-reminders') private readonly reminderQueue: Queue,
  ) {}

  async onModuleInit() {
    this.logger.log('ActivityReminderService initialized');
    // Programar job inicial
    await this.scheduleReminderCheck();
  }

  /**
   * Schedule periodic reminder check
   * Runs every minute to check for reminders that need to be sent
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async scheduleReminderCheck() {
    try {
      // Check if job already exists
      const jobs = await this.reminderQueue.getJobs(['waiting', 'delayed', 'active']);
      const existingJob = jobs.find(job => job.name === 'check-reminders');

      if (existingJob) {
        this.logger.debug('Reminder check job already scheduled');
        return;
      }

      // Add job to queue
      await this.reminderQueue.add(
        'check-reminders',
        {},
        {
          repeat: {
            pattern: CronExpression.EVERY_MINUTE,
          },
          jobId: 'activity-reminder-check',
        },
      );

      this.logger.log('Reminder check job scheduled');
    } catch (error: any) {
      this.logger.error(`Failed to schedule reminder check: ${error.message}`, error.stack);
    }
  }

  /**
   * Manually trigger reminder check (for testing)
   */
  async triggerReminderCheck(): Promise<void> {
    try {
      await this.reminderQueue.add('check-reminders', {});
      this.logger.log('Manual reminder check triggered');
    } catch (error: any) {
      this.logger.error(`Failed to trigger reminder check: ${error.message}`, error.stack);
      throw error;
    }
  }
}

