#!/usr/bin/env ts-node

import { readFileSync } from 'fs';
import { join } from 'path';

interface ModelInfo {
  name: string;
  fields: string[];
  relations: string[];
  indexes: string[];
}

function parseSchema(): ModelInfo[] {
  const schemaPath = join(__dirname, '../prisma/superadmin-schema.prisma');
  const schemaContent = readFileSync(schemaPath, 'utf-8');
  
  const models: ModelInfo[] = [];
  const modelRegex = /model\s+(\w+)\s*{([^}]+)}/g;
  
  let match;
  while ((match = modelRegex.exec(schemaContent)) !== null) {
    const modelName = match[1];
    const modelBody = match[2];
    
    const fields: string[] = [];
    const relations: string[] = [];
    const indexes: string[] = [];
    
    // Parse fields
    const fieldLines = modelBody.split('\n').filter(line => line.trim() && !line.trim().startsWith('//'));
    
    for (const line of fieldLines) {
      const trimmed = line.trim();
      
      if (trimmed.startsWith('@@')) {
        indexes.push(trimmed);
      } else if (trimmed.includes('@relation') || trimmed.match(/\w+\s+\w+\[\]/)) {
        relations.push(trimmed);
      } else if (trimmed.match(/^\w+\s+\w+/)) {
        fields.push(trimmed);
      }
    }
    
    models.push({
      name: modelName,
      fields,
      relations,
      indexes,
    });
  }
  
  return models;
}

function validateSchema() {
  console.log('🔍 Validating SuperAdmin schema structure...');
  
  try {
    const models = parseSchema();
    
    console.log(`\n📊 Schema Summary:`);
    console.log(`Total models: ${models.length}`);
    
    // Expected core models
    const expectedModels = [
      'Tenant', 'TenantDomain', 'User', 'UserSession',
      'Plan', 'Subscription', 'Invoice', 'PaymentMethod',
      'Coupon', 'CouponRedemption', 'License', 'TenantUsageDaily',
      'SupportTicket', 'TicketMessage', 'SystemNotification',
      'EmailCampaign', 'TenantActivityLog', 'AuditLog',
      'GdprRequest', 'SystemSetting', 'WebhookEndpoint', 'WebhookDelivery'
    ];
    
    console.log(`\n✅ Core Models Found:`);
    const foundModels = models.map(m => m.name);
    
    for (const expectedModel of expectedModels) {
      if (foundModels.includes(expectedModel)) {
        console.log(`  ✓ ${expectedModel}`);
      } else {
        console.log(`  ❌ ${expectedModel} - MISSING`);
      }
    }
    
    console.log(`\n📋 Model Details:`);
    for (const model of models) {
      console.log(`\n🏗️  ${model.name}:`);
      console.log(`   Fields: ${model.fields.length}`);
      console.log(`   Relations: ${model.relations.length}`);
      console.log(`   Indexes: ${model.indexes.length}`);
      
      // Show key fields for important models
      if (['Tenant', 'User', 'Plan', 'Subscription'].includes(model.name)) {
        console.log(`   Key fields: ${model.fields.slice(0, 3).map(f => f.split(' ')[0]).join(', ')}...`);
      }
    }
    
    // Validate key relationships
    console.log(`\n🔗 Key Relationships Validation:`);
    
    const tenantModel = models.find(m => m.name === 'Tenant');
    const userModel = models.find(m => m.name === 'User');
    const subscriptionModel = models.find(m => m.name === 'Subscription');
    
    if (tenantModel && tenantModel.relations.some(r => r.includes('User'))) {
      console.log('  ✓ Tenant -> User relationship');
    } else {
      console.log('  ❌ Tenant -> User relationship missing');
    }
    
    if (userModel && userModel.relations.some(r => r.includes('Tenant'))) {
      console.log('  ✓ User -> Tenant relationship');
    } else {
      console.log('  ❌ User -> Tenant relationship missing');
    }
    
    if (subscriptionModel && subscriptionModel.relations.some(r => r.includes('Tenant'))) {
      console.log('  ✓ Subscription -> Tenant relationship');
    } else {
      console.log('  ❌ Subscription -> Tenant relationship missing');
    }
    
    console.log(`\n🎉 Schema structure validation completed!`);
    console.log(`\nNext steps:`);
    console.log(`1. Set up PostgreSQL database`);
    console.log(`2. Run: npm run db:migrate`);
    console.log(`3. Run: npm run db:seed`);
    
  } catch (error) {
    console.error('❌ Error validating schema:', error);
    process.exit(1);
  }
}

validateSchema();