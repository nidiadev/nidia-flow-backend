# Communications API

This module implements the Communications API for NIDIA Flow System, providing comprehensive messaging and notification capabilities.

## Overview

The Communications API consists of three main controllers:

1. **MessageTemplateController** - Manages message templates for different channels
2. **CommunicationController** - Handles message sending and tracking
3. **NotificationController** - Manages internal notifications and real-time alerts

## Features Implemented

### ✅ Message Templates
- Create, read, update, and delete message templates
- Support for multiple channels (email, WhatsApp, SMS)
- Template variable system with validation
- Template rendering with dynamic variables
- Template duplication functionality
- Available variables documentation

### ✅ Message Sending & Tracking
- Send individual messages using templates
- Bulk message sending capabilities
- Message status tracking (pending, sent, delivered, failed, read)
- Message retry functionality for failed messages
- Provider-specific routing (SendGrid, 360Dialog, Twilio)
- Webhook handling for delivery status updates
- Comprehensive message statistics and analytics

### ✅ Internal Notifications
- Create and manage internal notifications
- Real-time WebSocket notifications
- Notification type-specific helpers (order created, task assigned, etc.)
- Bulk notification creation
- Notification cleanup and management
- Broadcast notifications to all users

### ✅ Real-time Features
- WebSocket integration for instant notifications
- Real-time message status updates
- Live notification delivery
- User presence tracking

## API Endpoints

### Message Templates (`/message-templates`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create new template |
| GET | `/` | List all templates |
| GET | `/variables` | Get available variables |
| GET | `/by-type/:type` | Get templates by type |
| GET | `/:id` | Get template details |
| POST | `/:id/render` | Render template with variables |
| POST | `/:id/duplicate` | Duplicate template |
| PATCH | `/:id` | Update template |
| DELETE | `/:id` | Deactivate template |

### Communications (`/communications`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/send` | Send single message |
| POST | `/bulk-send` | Send bulk messages |
| GET | `/messages` | List message logs |
| GET | `/messages/:id` | Get message details |
| PATCH | `/messages/:id/status` | Update message status |
| GET | `/stats` | Get communication statistics |
| GET | `/delivery-rate` | Get delivery rate stats |
| GET | `/customers/:id/history` | Get customer message history |
| GET | `/failed-messages` | Get failed messages |
| POST | `/messages/:id/retry` | Retry failed message |
| POST | `/webhooks/:provider` | Handle provider webhooks |

### Notifications (`/notifications`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create notification |
| POST | `/bulk` | Create bulk notifications |
| GET | `/` | List notifications |
| GET | `/my-notifications` | Get user notifications |
| GET | `/unread-count` | Get unread count |
| GET | `/:id` | Get notification details |
| PATCH | `/:id/read` | Mark as read |
| PATCH | `/mark-all-read` | Mark all as read |
| DELETE | `/:id` | Delete notification |
| DELETE | `/cleanup` | Cleanup old notifications |

#### Notification Event Endpoints
- POST `/order-created` - Send order created notification
- POST `/task-assigned` - Send task assigned notification
- POST `/task-completed` - Send task completed notification
- POST `/payment-received` - Send payment received notification
- POST `/low-stock` - Send low stock notification
- POST `/broadcast` - Broadcast to all users

## Permissions Required

All endpoints require appropriate permissions:
- `communications:read` - Read access to communications
- `communications:write` - Write access to communications
- `notifications:read` - Read access to notifications
- `notifications:write` - Write access to notifications

## Template Variables

The system supports dynamic variables in templates:

### Customer Variables
- `{{firstName}}`, `{{lastName}}`, `{{fullName}}`
- `{{email}}`, `{{phone}}`, `{{companyName}}`
- `{{address}}`, `{{city}}`

### Order Variables
- `{{orderNumber}}`, `{{total}}`, `{{status}}`
- `{{scheduledDate}}`, `{{serviceAddress}}`
- `{{customerNotes}}`

### Task Variables
- `{{title}}`, `{{description}}`, `{{status}}`
- `{{scheduledStart}}`, `{{locationAddress}}`
- `{{assignedToName}}`

### Company Variables
- `{{companyName}}`, `{{phone}}`, `{{email}}`
- `{{address}}`, `{{website}}`

### System Variables
- `{{currentDate}}`, `{{currentTime}}`, `{{currentDateTime}}`

## Integration Points

### WebSocket Events
The system integrates with the WebSocket service to provide real-time notifications:
- Notification creation triggers WebSocket broadcast
- Message status updates sent in real-time
- User presence tracking

### External Providers (TODO)
Future integration with messaging providers:
- **SendGrid** for email delivery
- **360Dialog** for WhatsApp Business API
- **Twilio** for SMS delivery

### Event System
Integrates with the business event system for:
- Automatic notification triggers
- Message status tracking
- Audit logging

## Error Handling

The API provides comprehensive error handling:
- Template validation errors
- Message sending failures
- Permission denied responses
- Not found errors for invalid IDs
- Rate limiting protection

## Security Features

- JWT authentication required
- Tenant isolation enforced
- Permission-based access control
- Input validation and sanitization
- Rate limiting on endpoints

## Future Enhancements

1. **Provider Integration**
   - Complete SendGrid integration
   - WhatsApp Business API integration
   - SMS provider integration

2. **Advanced Features**
   - Message scheduling
   - A/B testing for templates
   - Advanced analytics and reporting
   - Message personalization AI

3. **Performance Optimizations**
   - Message queue for bulk sending
   - Caching for frequently used templates
   - Background job processing

## Requirements Addressed

This implementation addresses the following requirements:

- **Requirement 8**: Sistema de Comunicaciones
  - ✅ WhatsApp Business API integration (structure ready)
  - ✅ Template system with approved templates
  - ✅ Webhook processing for incoming messages
  - ✅ SendGrid integration (structure ready)
  - ✅ Configurable templates with variables
  - ✅ Complete delivery status logging

- **Requirement 15**: Sistema de Notificaciones en Tiempo Real
  - ✅ WebSocket integration for real-time notifications
  - ✅ Automatic connection establishment
  - ✅ Real-time order/task notifications
  - ✅ Live dashboard updates
  - ✅ Automatic reconnection handling
  - ✅ Push notification support structure