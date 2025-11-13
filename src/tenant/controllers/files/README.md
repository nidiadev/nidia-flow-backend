# Files API

This module provides comprehensive file management capabilities for the NIDIA Flow system, including file uploads to S3, file metadata management, and file association with business entities.

## Features

- **File Upload**: Upload files to AWS S3 with automatic path organization
- **File Management**: CRUD operations for file metadata
- **Entity Association**: Associate files with orders, tasks, customers, and products
- **File Validation**: Automatic validation of file types and sizes
- **Statistics**: File usage statistics and analytics
- **Cleanup**: Automated cleanup of orphaned files

## API Endpoints

### File Upload

```http
POST /files/upload
Content-Type: multipart/form-data

# Form data:
# - file: The file to upload
# - entityType: (optional) Type of entity (order, task, customer, product)
# - entityId: (optional) ID of the entity
# - fileType: (optional) Type of file (image, document, video)
# - metadata: (optional) Additional metadata as JSON
```

### File Management

```http
# Get all files with filtering
GET /files?entityType=order&entityId=123&page=1&limit=20

# Get files by entity
GET /files/entity/{entityType}/{entityId}

# Get file by ID
GET /files/{id}

# Update file metadata
PATCH /files/{id}

# Delete file
DELETE /files/{id}
```

### File Statistics

```http
# Get file statistics
GET /files/statistics

# Clean up orphaned files
POST /files/cleanup-orphaned
```

## File Types Supported

- **Images**: JPEG, PNG, GIF, WebP
- **Documents**: PDF, Word, Excel, Text files
- **Size Limit**: 10MB per file

## File Organization

Files are organized in S3 with the following structure:
```
{tenantId}/uploads/{year}/{month}/{timestamp}_{uuid}.{extension}
```

## Security

- All files are stored privately in S3
- Access is controlled through signed URLs
- File validation prevents malicious uploads
- Tenant isolation ensures data security

## Usage Examples

### Upload a file for an order
```typescript
const formData = new FormData();
formData.append('file', fileBlob);
formData.append('entityType', 'order');
formData.append('entityId', 'order-uuid');

const response = await fetch('/files/upload', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  },
  body: formData
});
```

### Get files for a task
```typescript
const response = await fetch('/files/entity/task/task-uuid', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});
const files = await response.json();
```