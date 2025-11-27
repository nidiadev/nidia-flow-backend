import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { CronExpression } from '@nestjs/schedule';

/**
 * ActivityReminderService
 * 
 * Servicio para programar y gestionar recordatorios de actividades
 * Programa jobs periódicos para procesar recordatorios pendientes
 */
@Injectable()
export class ActivityReminderService implements OnModuleInit {
  private readonly logger = new Logger(ActivityReminderService.name);
  private static readonly REPEATABLE_JOB_KEY = 'activity-reminder-check';

  constructor(
    @InjectQueue('activity-reminders') private readonly reminderQueue: Queue,
  ) {}

  async onModuleInit() {
    this.logger.log('ActivityReminderService initialized');
    // Programar job inicial solo una vez
    await this.scheduleReminderCheck();
  }

  /**
   * Schedule periodic reminder check
   * Runs every minute to check for reminders that need to be sent
   * 
   * NOTE: This processor works per-tenant. Each tenant needs to have
   * its context set before processing reminders.
   * 
   * IMPORTANT: This should only be called once during initialization.
   * BullMQ's repeatable jobs handle the scheduling automatically.
   */
  async scheduleReminderCheck() {
    try {
      // Check if repeatable job already exists using getRepeatableJobs
      const repeatableJobs = await this.reminderQueue.getRepeatableJobs();
      const existingJob = repeatableJobs.find(
        job => job.key === ActivityReminderService.REPEATABLE_JOB_KEY
      );

      if (existingJob) {
        this.logger.debug('Reminder check repeatable job already exists, skipping creation');
        return;
      }

      // Add repeatable job to queue
      // NOTE: This job will process reminders for the current tenant context
      // For multi-tenant processing, each tenant should trigger its own job
      await this.reminderQueue.add(
        'check-reminders',
        {},
        {
          repeat: {
            pattern: CronExpression.EVERY_MINUTE,
          },
          jobId: ActivityReminderService.REPEATABLE_JOB_KEY,
        },
      );

      this.logger.log('Reminder check repeatable job scheduled successfully');
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

