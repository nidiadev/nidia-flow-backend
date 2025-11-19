import { SetMetadata } from '@nestjs/common';

export enum LimitType {
  USERS = 'users',
  STORAGE = 'storage',
  MONTHLY_EMAILS = 'monthly_emails',
  MONTHLY_WHATSAPP = 'monthly_whatsapp',
  MONTHLY_API_CALLS = 'monthly_api_calls',
}

export const CHECK_LIMIT_KEY = 'checkLimit';

export const CheckLimit = (limitType: LimitType) => SetMetadata(CHECK_LIMIT_KEY, limitType);

