export interface AuthResponse {
  message?: string;
  status?: 'success' | 'provisioning' | 'failed';
  accessToken?: string;
  refreshToken?: string;
  tenantId?: string;
  email?: string;
  estimatedTime?: string;
  user?: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    systemRole: string;
    tenantId?: string;
    avatarUrl?: string;
    language: string;
    timezone: string;
  };
}