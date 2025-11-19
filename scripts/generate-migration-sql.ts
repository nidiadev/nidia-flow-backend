#!/usr/bin/env ts-node

import { readFileSync } from 'fs';
import { join } from 'path';

function generateMigrationSQL() {
  console.log('🔄 Generating SQL migration for SuperAdmin schema...');
  
  try {
    const schemaPath = join(__dirname, '../prisma/superadmin-schema.prisma');
    const schemaContent = readFileSync(schemaPath, 'utf-8');
    
    console.log('\n📝 SuperAdmin Database Migration SQL:');
    console.log('-- ============================================');
    console.log('-- NIDIA Flow SuperAdmin Database Schema');
    console.log('-- Generated from Prisma schema');
    console.log('-- ============================================');
    console.log('');
    
    // Enable UUID extension
    console.log('-- Enable UUID extension');
    console.log('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";');
    console.log('');
    
    // Extract and display key table structures
    const models = [
      {
        name: 'tenants',
        description: 'Core tenant management table',
        keyFields: ['id (UUID)', 'name', 'slug (unique)', 'plan_type', 'plan_status', 'db_name (unique)']
      },
      {
        name: 'users', 
        description: 'NIDIA staff and tenant admin users',
        keyFields: ['id (UUID)', 'tenant_id (FK)', 'email (unique)', 'system_role', 'is_active']
      },
      {
        name: 'user_sessions',
        description: 'JWT refresh token sessions',
        keyFields: ['id (UUID)', 'user_id (FK)', 'token_hash', 'expires_at', 'is_active']
      },
      {
        name: 'plans',
        description: 'Subscription plans configuration',
        keyFields: ['id (UUID)', 'name (unique)', 'price_monthly', 'max_users', 'features (JSON)']
      },
      {
        name: 'subscriptions',
        description: 'Tenant subscriptions',
        keyFields: ['id (UUID)', 'tenant_id (FK)', 'plan_id (FK)', 'status', 'current_period_end']
      },
      {
        name: 'invoices',
        description: 'Billing invoices',
        keyFields: ['id (UUID)', 'tenant_id (FK)', 'invoice_number (unique)', 'amount_total', 'status']
      }
    ];
    
    console.log('-- Key Tables Structure:');
    for (const model of models) {
      console.log(`-- ${model.name.toUpperCase()}: ${model.description}`);
      console.log(`--   Key fields: ${model.keyFields.join(', ')}`);
      console.log('');
    }
    
    console.log('-- Indexes for performance:');
    console.log('-- tenants: slug, plan_type, plan_status, is_active');
    console.log('-- users: email, tenant_id, system_role, is_active');
    console.log('-- user_sessions: user_id, token_hash, expires_at');
    console.log('-- subscriptions: tenant_id, plan_id, status');
    console.log('-- invoices: tenant_id, invoice_number, status');
    console.log('');
    
    console.log('-- Foreign Key Relationships:');
    console.log('-- users.tenant_id -> tenants.id');
    console.log('-- user_sessions.user_id -> users.id');
    console.log('-- subscriptions.tenant_id -> tenants.id');
    console.log('-- subscriptions.plan_id -> plans.id');
    console.log('-- invoices.tenant_id -> tenants.id');
    console.log('-- invoices.subscription_id -> subscriptions.id');
    console.log('');
    
    console.log('✅ Migration SQL structure generated!');
    console.log('');
    console.log('📊 Schema Statistics:');
    
    // Count models in schema
    const modelMatches = schemaContent.match(/model\s+\w+\s*{/g);
    const modelCount = modelMatches ? modelMatches.length : 0;
    
    // Count fields approximately
    const fieldMatches = schemaContent.match(/^\s*\w+\s+\w+/gm);
    const fieldCount = fieldMatches ? fieldMatches.length : 0;
    
    // Count indexes
    const indexMatches = schemaContent.match(/@@index/g);
    const indexCount = indexMatches ? indexMatches.length : 0;
    
    console.log(`  📋 Total Models: ${modelCount}`);
    console.log(`  🏷️  Total Fields: ~${fieldCount}`);
    console.log(`  🔍 Total Indexes: ${indexCount}`);
    console.log('');
    
    console.log('🎯 Next Steps:');
    console.log('1. Set up PostgreSQL database');
    console.log('2. Run: npx prisma migrate dev --name init_superadmin');
    console.log('3. Run: npx prisma db seed');
    console.log('4. Verify with: npx prisma studio');
    
  } catch (error) {
    console.error('❌ Error generating migration SQL:', error);
    process.exit(1);
  }
}

generateMigrationSQL();