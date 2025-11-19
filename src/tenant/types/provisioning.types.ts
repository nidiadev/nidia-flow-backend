export enum ProvisioningStatus {
  PENDING = 'pending',
  PROVISIONING = 'provisioning',
  CREATING_DATABASE = 'creating_database',
  RUNNING_MIGRATIONS = 'running_migrations',
  CREATING_INITIAL_USER = 'creating_initial_user',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface TenantProvisioningData {
  tenantId: string;
  slug: string;
  dbName: string;
  adminEmail: string;
  adminPassword: string; // Ya hasheado
  adminFirstName?: string;
  adminLastName?: string;
  companyName: string;
}

export interface ProvisioningProgress {
  status: ProvisioningStatus;
  progress: number; // 0-100
  currentStep: string;
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

