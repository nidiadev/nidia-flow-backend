# Reports API

This module provides comprehensive reporting capabilities for the NIDIA Flow system, including saved reports, scheduled reports, and report execution management.

## Features

- **Saved Reports**: Create and manage reusable report configurations
- **Scheduled Reports**: Automatic report generation on daily, weekly, or monthly schedules
- **Report Execution**: Track and manage report generation processes
- **Multiple Report Types**: Sales, tasks, customers, financials, and inventory reports
- **Email Distribution**: Automatic email delivery of scheduled reports
- **Statistics**: Report usage analytics and performance metrics

## API Endpoints

### Saved Reports

```http
# Create a saved report
POST /reports/saved
{
  "name": "Monthly Sales Report",
  "reportType": "sales",
  "filters": {
    "dateRange": "last_month",
    "status": "completed"
  },
  "isScheduled": true,
  "scheduleFrequency": "monthly",
  "scheduleDayOfMonth": 1,
  "scheduleTime": "09:00",
  "emailRecipients": ["manager@company.com"]
}

# Get all saved reports
GET /reports/saved?reportType=sales&isScheduled=true&page=1&limit=20

# Get scheduled reports ready for execution
GET /reports/saved/scheduled

# Get saved report statistics
GET /reports/saved/statistics

# Get saved report by ID
GET /reports/saved/{id}

# Update saved report
PATCH /reports/saved/{id}

# Delete saved report
DELETE /reports/saved/{id}
```

### Report Executions

```http
# Start a new report execution
POST /reports/executions/start
{
  "savedReportId": "report-uuid"
}

# Get all executions
GET /reports/executions?status=running&page=1&limit=20

# Get executions for a specific saved report
GET /reports/executions/saved-report/{savedReportId}

# Complete an execution
POST /reports/executions/{id}/complete
{
  "resultFileUrl": "https://s3.amazonaws.com/bucket/reports/report.pdf"
}

# Mark execution as failed
POST /reports/executions/{id}/fail
{
  "errorMessage": "Database connection timeout"
}

# Get execution statistics
GET /reports/executions/statistics

# Clean up old executions
POST /reports/executions/cleanup
{
  "daysOld": 30
}
```

### Combined Reports API

```http
# Get reports dashboard data
GET /reports/dashboard

# Execute a saved report immediately
POST /reports/saved/{id}/execute
```

## Report Types

- **sales**: Sales and revenue reports
- **tasks**: Operational tasks and completion reports
- **customers**: Customer analytics and CRM reports
- **financials**: Financial transactions and cash flow reports
- **inventory**: Stock levels and inventory movement reports

## Schedule Frequencies

- **daily**: Execute every day at specified time
- **weekly**: Execute on specified day of week
- **monthly**: Execute on specified day of month

## Execution Status

- **running**: Report is currently being generated
- **completed**: Report generation completed successfully
- **failed**: Report generation failed with error

## Usage Examples

### Create a scheduled weekly sales report
```typescript
const report = await fetch('/reports/saved', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + token
  },
  body: JSON.stringify({
    name: 'Weekly Sales Summary',
    reportType: 'sales',
    filters: {
      dateRange: 'last_week',
      includeDetails: true
    },
    isScheduled: true,
    scheduleFrequency: 'weekly',
    scheduleDayOfWeek: 1, // Monday
    scheduleTime: '08:00',
    emailRecipients: ['sales@company.com', 'manager@company.com']
  })
});
```

### Execute a report immediately
```typescript
const execution = await fetch('/reports/saved/report-uuid/execute', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + token
  }
});
```

### Monitor report execution
```typescript
const status = await fetch('/reports/executions/execution-uuid', {
  headers: {
    'Authorization': 'Bearer ' + token
  }
});
const executionData = await status.json();
console.log('Status:', executionData.status);
console.log('Result URL:', executionData.resultFileUrl);
```

## Integration with Background Jobs

The reports system integrates with BullMQ for background processing:

- Scheduled reports are automatically queued for execution
- Report generation runs in background workers
- Email delivery is handled asynchronously
- Failed executions are automatically retried

## File Storage

Generated reports are stored in S3 with the following structure:
```
{tenantId}/reports/{reportType}/{year}/{month}/{execution-id}.pdf
```

## Security

- All reports are tenant-isolated
- Generated files are stored privately in S3
- Access is controlled through signed URLs
- Email recipients are validated against tenant users