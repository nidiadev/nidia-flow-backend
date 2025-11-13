-- NIDIA Flow SuperAdmin Database Seed Data
-- This script inserts demo data after Prisma schema is applied

-- Insert initial system settings
INSERT INTO system_settings (id, key, value, description, is_public, updated_at) VALUES
    (gen_random_uuid(), 'app_name', '"NIDIA Flow"', 'Application name', true, NOW()),
    (gen_random_uuid(), 'app_version', '"1.0.0"', 'Application version', true, NOW()),
    (gen_random_uuid(), 'maintenance_mode', 'false', 'Maintenance mode flag', true, NOW()),
    (gen_random_uuid(), 'max_tenants', '1000', 'Maximum number of tenants allowed', false, NOW()),
    (gen_random_uuid(), 'default_trial_days', '30', 'Default trial period in days', false, NOW())
ON CONFLICT (key) DO NOTHING;

-- Insert default plans
INSERT INTO plans (id, name, display_name, description, price_monthly, price_yearly, currency, max_users, max_storage_gb, max_monthly_emails, max_monthly_whatsapp, max_monthly_api_calls, features, enabled_modules, is_active, is_visible, sort_order, created_at, updated_at) VALUES
    (gen_random_uuid(), 'free', 'Plan Gratuito', 'Plan básico gratuito para empezar', 0.00, 0.00, 'USD', 2, 1, 100, 50, 1000, '["basic_crm", "basic_orders"]', ARRAY['crm', 'orders'], true, true, 1, NOW(), NOW()),
    (gen_random_uuid(), 'basic', 'Plan Básico', 'Plan básico para pequeñas empresas', 29.99, 299.99, 'USD', 5, 5, 1000, 500, 10000, '["full_crm", "orders", "tasks", "basic_reports"]', ARRAY['crm', 'orders', 'tasks', 'reports'], true, true, 2, NOW(), NOW()),
    (gen_random_uuid(), 'professional', 'Plan Profesional', 'Plan completo para empresas en crecimiento', 79.99, 799.99, 'USD', 15, 20, 5000, 2000, 50000, '["full_crm", "orders", "tasks", "accounting", "reports", "integrations"]', ARRAY['crm', 'orders', 'tasks', 'accounting', 'reports', 'communications'], true, true, 3, NOW(), NOW()),
    (gen_random_uuid(), 'enterprise', 'Plan Empresarial', 'Plan avanzado para grandes empresas', 199.99, 1999.99, 'USD', 50, 100, 20000, 10000, 200000, '["everything"]', ARRAY['crm', 'orders', 'tasks', 'accounting', 'reports', 'communications', 'analytics'], true, true, 4, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Insert default coupons
INSERT INTO coupons (id, code, name, description, discount_type, discount_value, currency, applies_to, applicable_plan_ids, max_redemptions, max_redemptions_per_tenant, duration, duration_in_months, valid_from, valid_until, is_active, created_at, updated_at) VALUES
    (gen_random_uuid(), 'WELCOME30', 'Bienvenida 30%', 'Descuento de bienvenida del 30%', 'percentage', 30.00, 'USD', 'all', ARRAY[]::text[], 1000, 1, 'once', NULL, NOW(), NOW() + INTERVAL '1 year', true, NOW(), NOW()),
    (gen_random_uuid(), 'FIRST3MONTHS', 'Primeros 3 Meses', 'Descuento para los primeros 3 meses', 'percentage', 50.00, 'USD', 'all', ARRAY[]::text[], 500, 1, 'repeating', 3, NOW(), NOW() + INTERVAL '6 months', true, NOW(), NOW())
ON CONFLICT (code) DO NOTHING;

-- Insert feature flags
INSERT INTO feature_flags (id, name, description, is_enabled, rollout_percentage, enabled_for_tenants, metadata, created_at, updated_at) VALUES
    (gen_random_uuid(), 'whatsapp_integration', 'WhatsApp Business API Integration', true, 100, ARRAY[]::text[], '{}', NOW(), NOW()),
    (gen_random_uuid(), 'advanced_analytics', 'Advanced Analytics Dashboard', false, 0, ARRAY[]::text[], '{}', NOW(), NOW()),
    (gen_random_uuid(), 'mobile_app', 'Mobile Application Access', true, 100, ARRAY[]::text[], '{}', NOW(), NOW()),
    (gen_random_uuid(), 'ai_insights', 'AI-Powered Business Insights', false, 10, ARRAY[]::text[], '{}', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Create initial NIDIA staff user (super admin)
INSERT INTO users (id, tenant_id, email, password_hash, first_name, last_name, system_role, email_verified, is_active, language, timezone, created_at, updated_at) VALUES
    (gen_random_uuid(), NULL, 'admin@nidia.com', '$2b$10$rQZ8qNqZ8qNqZ8qNqZ8qNOJ8qNqZ8qNqZ8qNqZ8qNqZ8qNqZ8qNqZ', 'NIDIA', 'Admin', 'super_admin', true, true, 'es', 'America/Bogota', NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Create demo tenant
INSERT INTO tenants (
    id, name, slug, company_legal_name, tax_id, industry, company_size,
    plan_type, plan_status, db_name, db_host, db_port, db_username, db_password_encrypted,
    billing_email, billing_country, enabled_modules, is_active, provisioned_at, created_at, updated_at
) VALUES (
    gen_random_uuid(), 'Demo Empresa', 'demo-empresa', 'Demo Empresa S.A.S.', '900123456-1', 'technology', 'small',
    'basic', 'active', 'tenant_demo_empresa_prod', 'tenant-db', 5432, 'postgres', 'password',
    'admin@demoempresa.com', 'CO', ARRAY['crm', 'orders', 'tasks', 'accounting', 'reports'], true, NOW(), NOW(), NOW()
) ON CONFLICT (slug) DO NOTHING;

-- Log the seeding
DO $$
BEGIN
    RAISE NOTICE 'SuperAdmin database seeded successfully';
    RAISE NOTICE 'Plans created: %', (SELECT COUNT(*) FROM plans);
    RAISE NOTICE 'Tenants created: %', (SELECT COUNT(*) FROM tenants);
END $$;