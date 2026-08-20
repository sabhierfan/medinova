## Module 4: Medical Data Analytics & Visualization — MediNova AI

This module adds a full analytics pipeline:

- **Backend**: `/api/analytics/*` endpoints using **MongoDB aggregation pipelines** (optimized for large datasets)
- **Frontend**: Admin **Analytics Dashboard** with **Recharts** + server-driven tables (sorting/filtering/pagination)
- **Reports**: Export **PDF** and **Excel (.xlsx)** from the backend

### Frontend (Dashboard)

- **Route**: `GET /admin/analytics` (admin-only via `ProtectedAdminRoute`)
- **Entry point**: Admin Dashboard header now includes an **Analytics** button.

### Backend (APIs)

All endpoints are under:

- **Base**: `GET /api/analytics`

#### getAnalytics()

- `GET /api/analytics?preset=30d`
- Returns: overview KPIs, flow metrics, top departments, doctor workload.

#### getAppointmentTrends()

- `GET /api/analytics/appointment-trends?preset=30d&bucket=day`
- Optional filters:
  - `doctorId=<mongoObjectId>`
  - `patientId=<mongoObjectId>`

#### getDoctorPerformance()

- `GET /api/analytics/doctor-performance?preset=30d&page=1&pageSize=20&sortBy=appointmentsSeen&sortDir=desc&q=smith`
- Returns a paginated list with:
  - appointments seen (completed)
  - avg consultation time (based on completed duration)
  - cancellation rate
  - no-show rate

#### getExportableReports()

- JSON report payload:
  - `GET /api/analytics/reports?preset=30d&bucket=day&format=json`
- PDF export:
  - `GET /api/analytics/reports?preset=30d&bucket=day&format=pdf`
- Excel export:
  - `GET /api/analytics/reports?preset=30d&bucket=day&format=xlsx`

#### Data tables (server-side paging)

- `GET /api/analytics/appointments?preset=30d&page=1&pageSize=20&status=completed&q=john`

### Setup / Install

1. Install dependencies (root):

```bash
npm install
```

2. Ensure MongoDB is running and `.env` exists (see `README_MONGODB.md`).

3. Run frontend + backend:

```bash
npm run dev:all
```

4. Login as admin → open **Admin Dashboard** → click **Analytics**.

### Query References (MongoDB/PostgreSQL)

See:

- `server/src/modules/analytics/queries/README.md`
- `server/src/modules/analytics/queries/postgres/analytics.sql`
