# Medinova

A healthcare appointment-scheduling platform prototype: patients book with
doctors, doctors manage schedules and enter visit records, and admins get
usage analytics — with an AI symptom-triage assistant on top.

**This is a portfolio/demo project, not a production or HIPAA-certified
system.** Some features (encryption, audit logging, session timeout) are
built to illustrate the patterns a real healthcare app needs, but this
hasn't been through a compliance review.

## Features

- **Patient dashboard**: AI symptom checker (suggests a specialization and
  urgency level from a free-text description), appointment booking, medical
  history / EMR view, health trend charts (weight, heart rate)
- **Doctor dashboard**: schedule management (accept/complete/cancel),
  EMR entry (vitals, symptoms, diagnosis, prescription), patient history,
  no-show risk indicator per upcoming appointment
- **Admin dashboard**: user management, system settings, and an analytics
  view (appointment trends, doctor workload/performance, PDF/Excel report
  export — see [MODULE_4_README.md](MODULE_4_README.md))
- **AI assistant**: a Gemini-powered chatbot that answers questions about
  how the platform works
- Client-side field encryption for clinical data, session timeout, and an
  access-log trail for EMR views

## Tech stack

React + Vite + TypeScript, shadcn/ui + Tailwind, Firebase (Auth + Realtime
Database), Google Gemini API for the symptom checker and assistant, with an
optional MongoDB-backed analytics module (see below).

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in:
   - A Gemini API key ([aistudio.google.com/apikey](https://aistudio.google.com/apikey))
   - Your own Firebase project config (Auth + Realtime Database enabled)
3. `npm run dev`

No credentials are included in this repo — you'll need your own Firebase
project and Gemini API key to run it.

### Seeding demo data (optional)

`scripts/seed.ts` creates a handful of fictional doctors and patients with
sample appointments and EMR entries, for exploring the dashboards without
manually creating accounts. Run it against your own Firebase project — see
the script for the demo login credentials it creates.

### Analytics module (optional)

The admin analytics dashboard (Module 4) is backed by a separate MongoDB +
Express API — see [MODULE_4_README.md](MODULE_4_README.md) and
[SETUP_GUIDE.md](SETUP_GUIDE.md) for that backend's setup.

## Project structure

```
src/
├── pages/            # Route-level screens (dashboards, login/signup, admin)
├── components/        # Shared UI + feature components (booking, calendar, chatbot, notifications)
├── lib/
│   ├── firebase.ts     # Firebase init (env-driven)
│   ├── gemini.ts        # Symptom triage + chatbot (Gemini)
│   ├── dbService.ts      # Data access layer
│   ├── localAuth.ts       # Local auth fallback
│   ├── security.ts         # Client-side encryption helpers
│   └── noShowPredictor.ts   # No-show risk heuristic
├── hooks/             # Custom hooks (mobile detection, websocket, session timeout)
└── routes/            # Route guards (e.g. admin-only)
scripts/
└── seed.ts            # Demo data seeding
```

## Docs

- [SETUP_GUIDE.md](SETUP_GUIDE.md) — full setup including the analytics backend
- [WORKFLOW.md](WORKFLOW.md) — application flow notes
- [MODULE_4_README.md](MODULE_4_README.md) — analytics module API reference
