export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: {
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