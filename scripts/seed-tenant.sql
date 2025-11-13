-- NIDIA Flow Tenant Database Seed Data
-- This script inserts demo data after Prisma schema is applied

-- Insert default roles
INSERT INTO roles (id, name, description, permissions, is_system_role, created_at, updated_at) VALUES
    (gen_random_uuid(), 'admin', 'Administrador', '["*"]', true, NOW(), NOW()),
    (gen_random_uuid(), 'manager', 'Gerente', '["crm:*", "orders:*", "tasks:read", "reports:read", "settings:read"]', true, NOW(), NOW()),
    (gen_random_uuid(), 'sales', 'Vendedor', '["crm:*", "orders:*", "customers:*"]', true, NOW(), NOW()),
    (gen_random_uuid(), 'operator', 'Operario', '["tasks:*", "orders:read", "customers:read"]', true, NOW(), NOW()),
    (gen_random_uuid(), 'accountant', 'Contador', '["accounting:*", "reports:*", "orders:read"]', true, NOW(), NOW()),
    (gen_random_uuid(), 'viewer', 'Visualizador', '["*:read"]', true, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- Insert demo admin user
INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, created_at, updated_at) VALUES
    (gen_random_uuid(), 'admin@demoempresa.com', '$2b$10$rQZ8qNqZ8qNqZ8qNqZ8qNOJ8qNqZ8qNqZ8qNqZ8qNqZ8qNqZ8qNqZ', 'Demo', 'Admin', 'admin', true, NOW(), NOW())
ON CONFLICT (email) DO NOTHING;

-- Insert company settings
INSERT INTO company_settings (id, company_name, country, primary_color, secondary_color, business_hours, timezone, currency, locale, default_tax_rate, enabled_modules, settings, updated_at) VALUES
    (gen_random_uuid(), 'Demo Empresa', 'CO', '#3B82F6', '#10B981', 
     '{"monday": {"open": "08:00", "close": "18:00", "isOpen": true}, "tuesday": {"open": "08:00", "close": "18:00", "isOpen": true}, "wednesday": {"open": "08:00", "close": "18:00", "isOpen": true}, "thursday": {"open": "08:00", "close": "18:00", "isOpen": true}, "friday": {"open": "08:00", "close": "18:00", "isOpen": true}, "saturday": {"open": "08:00", "close": "14:00", "isOpen": true}, "sunday": {"open": "00:00", "close": "00:00", "isOpen": false}}',
     'America/Bogota', 'COP', 'es-CO', 19.00, 
     ARRAY['crm', 'orders', 'tasks', 'accounting', 'reports'], 
     '{}', NOW());

-- Insert demo categories
INSERT INTO categories (id, name, description, is_active, sort_order, created_at, updated_at) VALUES
    (gen_random_uuid(), 'Servicios', 'Servicios principales de la empresa', true, 1, NOW(), NOW()),
    (gen_random_uuid(), 'Productos', 'Productos físicos', true, 2, NOW(), NOW()),
    (gen_random_uuid(), 'Mantenimiento', 'Servicios de mantenimiento', true, 3, NOW(), NOW());

-- Insert demo products/services
DO $$
DECLARE
    servicios_id uuid;
    productos_id uuid;
    mantenimiento_id uuid;
    admin_user_id uuid;
BEGIN
    -- Get category IDs
    SELECT id INTO servicios_id FROM categories WHERE name = 'Servicios' LIMIT 1;
    SELECT id INTO productos_id FROM categories WHERE name = 'Productos' LIMIT 1;
    SELECT id INTO mantenimiento_id FROM categories WHERE name = 'Mantenimiento' LIMIT 1;
    SELECT id INTO admin_user_id FROM users WHERE email = 'admin@demoempresa.com' LIMIT 1;

    -- Insert demo products
    INSERT INTO products (id, type, name, description, sku, category_id, price, cost, tax_rate, track_inventory, stock_quantity, stock_min, is_active, created_by, created_at, updated_at) VALUES
        (gen_random_uuid(), 'service', 'Instalación de Sistema', 'Instalación completa de sistema empresarial', 'SRV-INST-001', servicios_id, 500000.00, 300000.00, 19.00, false, 0, 0, true, admin_user_id, NOW(), NOW()),
        (gen_random_uuid(), 'service', 'Consultoría Técnica', 'Consultoría técnica especializada por hora', 'SRV-CONS-001', servicios_id, 150000.00, 100000.00, 19.00, false, 0, 0, true, admin_user_id, NOW(), NOW()),
        (gen_random_uuid(), 'product', 'Licencia Software', 'Licencia anual de software', 'PROD-LIC-001', productos_id, 1200000.00, 800000.00, 19.00, true, 50, 10, true, admin_user_id, NOW(), NOW()),
        (gen_random_uuid(), 'service', 'Mantenimiento Mensual', 'Servicio de mantenimiento mensual', 'SRV-MANT-001', mantenimiento_id, 200000.00, 120000.00, 19.00, false, 0, 0, true, admin_user_id, NOW(), NOW())
    ON CONFLICT (sku) DO NOTHING;
END $$;

-- Insert demo customers
DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    SELECT id INTO admin_user_id FROM users WHERE email = 'admin@demoempresa.com' LIMIT 1;

    INSERT INTO customers (id, type, first_name, last_name, company_name, email, phone, lead_source, lead_score, city, country, assigned_to, created_by, created_at, updated_at) VALUES
        (gen_random_uuid(), 'active', 'Juan', 'Pérez', 'Empresa ABC', 'juan.perez@empresaabc.com', '+57 300 123 4567', 'website', 85, 'Bogotá', 'CO', admin_user_id, admin_user_id, NOW(), NOW()),
        (gen_random_uuid(), 'prospect', 'María', 'González', 'Comercial XYZ', 'maria.gonzalez@comercialxyz.com', '+57 301 234 5678', 'referral', 70, 'Medellín', 'CO', admin_user_id, admin_user_id, NOW(), NOW()),
        (gen_random_uuid(), 'lead', 'Carlos', 'Rodríguez', 'Servicios 123', 'carlos.rodriguez@servicios123.com', '+57 302 345 6789', 'whatsapp', 60, 'Cali', 'CO', admin_user_id, admin_user_id, NOW(), NOW())
    ON CONFLICT (email) DO NOTHING;
END $$;

-- Insert demo budget categories
INSERT INTO budget_categories (id, name, type, monthly_budget, is_active, created_at, updated_at) VALUES
    (gen_random_uuid(), 'Ventas de Servicios', 'income', 10000000.00, true, NOW(), NOW()),
    (gen_random_uuid(), 'Ventas de Productos', 'income', 5000000.00, true, NOW(), NOW()),
    (gen_random_uuid(), 'Gastos Operativos', 'expense', 3000000.00, true, NOW(), NOW()),
    (gen_random_uuid(), 'Salarios', 'expense', 4000000.00, true, NOW(), NOW()),
    (gen_random_uuid(), 'Marketing', 'expense', 1000000.00, true, NOW(), NOW());

-- Insert demo bank account
INSERT INTO bank_accounts (id, account_name, bank_name, account_type, currency, initial_balance, current_balance, is_active, is_primary, created_at, updated_at) VALUES
    (gen_random_uuid(), 'Cuenta Corriente Principal', 'Banco de Bogotá', 'checking', 'COP', 5000000.00, 5000000.00, true, true, NOW(), NOW());

-- Insert demo message templates
DO $$
DECLARE
    admin_user_id uuid;
BEGIN
    SELECT id INTO admin_user_id FROM users WHERE email = 'admin@demoempresa.com' LIMIT 1;

    INSERT INTO message_templates (id, name, channel, type, subject, body, is_active, created_by, created_at, updated_at) VALUES
        (gen_random_uuid(), 'Bienvenida Cliente', 'email', 'welcome', 'Bienvenido a Demo Empresa', 'Hola {{customerName}}, bienvenido a nuestra empresa. Estamos aquí para ayudarte.', true, admin_user_id, NOW(), NOW()),
        (gen_random_uuid(), 'Confirmación de Orden', 'whatsapp', 'order_confirmation', NULL, 'Hola {{customerName}}, tu orden #{{orderNumber}} ha sido confirmada. Te contactaremos pronto.', true, admin_user_id, NOW(), NOW()),
        (gen_random_uuid(), 'Recordatorio de Cita', 'whatsapp', 'appointment_reminder', NULL, 'Recordatorio: Tienes una cita programada para {{appointmentDate}} a las {{appointmentTime}}.', true, admin_user_id, NOW(), NOW());
END $$;

-- Log the seeding
DO $$
BEGIN
    RAISE NOTICE 'Tenant database seeded successfully';
    RAISE NOTICE 'Products created: %', (SELECT COUNT(*) FROM products);
    RAISE NOTICE 'Customers created: %', (SELECT COUNT(*) FROM customers);
    RAISE NOTICE 'Categories created: %', (SELECT COUNT(*) FROM categories);
END $$;