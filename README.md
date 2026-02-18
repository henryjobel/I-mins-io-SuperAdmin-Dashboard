# Nexus Super Admin Frontend

Standalone frontend project for a platform-level super admin dashboard.

## Run

```bash
npm run dev
```

Default URL: `http://localhost:8081`

## Build

```bash
npm run build
```

## Implemented Modules

- Overview
- Stores
- Store Lifecycle Monitor
- Admins
- Billing and Subscriptions
- Payment Operations
- Support Queue
- System Health
- AI Usage
- Feature Flags
- Security and Compliance
- Platform Settings

## Access Control

- Login route + dashboard route guard
- RBAC by role (`super_admin`, `ops`, `support`, `finance`)
- Action-level restrictions for sensitive operations

## Admin UX Features

- Global confirm dialog for destructive actions
- Toast notifications for success/error/info
- Loading, empty, and error states
- Sort + pagination on major data tables
- Audit log auto-entry on key actions (add/remove/suspend/change/toggle)
- Plan settings panel and CSV export for subscriptions

## Backend Integration Map

- `GET /api/super-admin/overview`
- `GET /api/super-admin/stores`
- `PATCH /api/super-admin/stores/:id/status`
- `GET /api/super-admin/lifecycle`
- `PATCH /api/super-admin/lifecycle/:storeId`
- `GET /api/super-admin/admins`
- `POST /api/super-admin/admins/invite`
- `GET /api/super-admin/subscriptions`
- `GET /api/super-admin/payment-ops`
- `PATCH /api/super-admin/payment-ops/:storeId`
- `GET /api/super-admin/tickets`
- `PATCH /api/super-admin/tickets/:id`
- `GET /api/super-admin/health`
- `POST /api/super-admin/health/:service/restart`
- `GET /api/super-admin/ai-usage`
- `GET /api/super-admin/flags`
- `PATCH /api/super-admin/flags/:key`
- `GET /api/super-admin/audit-logs`
- `GET /api/super-admin/settings`
- `PUT /api/super-admin/settings`
