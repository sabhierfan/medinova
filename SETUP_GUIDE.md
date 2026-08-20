# Quick Setup Guide - Module 3: Appointment Scheduling System

## 🚀 Quick Start (5 minutes)

### Step 1: Install Dependencies

```bash
npm install mongoose socket.io socket.io-client
```

### Step 2: Configure Environment

Create `.env` file:

```env
MONGODB_URI=mongodb://localhost:27017/medinova
PORT=4000
CLIENT_ORIGIN=http://localhost:8080
```

### Step 3: Start Services

```bash
# Option A: Start both together
npm run dev:all

# Option B: Start separately
# Terminal 1:
npm run server:dev

# Terminal 2:
npm run dev
```

### Step 4: Verify Installation

```bash
# Check API health
curl http://localhost:4000/api/health

# Expected response:
# {"status":"ok","database":"mongodb","websocket":"enabled"}
```

### Step 5: Setup Doctor Availability (One-time)

```bash
# For each doctor in your system, create default availability
curl -X POST http://localhost:4000/api/availability/<doctor_id>/default
```

## ✅ That's it! You're ready to use the system.

---

## 📁 Folder Structure

```
medinova/
├── server/
│   ├── src/
│   │   ├── models/
│   │   │   ├── Appointment.ts         ✨ Enhanced with slots & tracking
│   │   │   ├── DoctorAvailability.ts  ✨ NEW
│   │   │   ├── Notification.ts        ✨ NEW
│   │   │   ├── Doctor.ts
│   │   │   └── Patient.ts
│   │   │
│   │   ├── controllers/
│   │   │   └── appointmentController.ts ✨ NEW - Business logic
│   │   │
│   │   ├── services/
│   │   │   ├── notificationService.ts   ✨ NEW - Email + WebSocket
│   │   │   ├── emailService.ts          ✨ NEW
│   │   │   └── websocketService.ts      ✨ NEW - Socket.io
│   │   │
│   │   ├── routes/
│   │   │   ├── appointments.ts          ✨ Enhanced with new endpoints
│   │   │   ├── availability.ts          ✨ NEW
│   │   │   └── notifications.ts         ✨ NEW
│   │   │
│   │   └── index.ts                     ✨ Enhanced with WebSocket
│   │
│   └── tsconfig.json
│
├── src/
│   ├── components/
│   │   ├── AppointmentCalendar.tsx          ✨ NEW - Calendar booking UI
│   │   ├── DoctorScheduleCalendar.tsx       ✨ NEW - Doctor weekly view
│   │   ├── EnhancedAppointmentBooking.tsx   ✨ NEW - Full booking dialog
│   │   ├── AppointmentActions.tsx           ✨ NEW - Reschedule/cancel
│   │   ├── NotificationCenter.tsx           ✨ NEW - Real-time alerts
│   │   └── ui/                              (existing Shadcn components)
│   │
│   ├── hooks/
│   │   └── use-websocket.ts                 ✨ NEW - WebSocket hook
│   │
│   ├── lib/
│   │   └── dbService.ts                     ✨ Enhanced with new APIs
│   │
│   └── pages/
│       ├── DoctorDashboard.tsx              ✨ Enhanced with calendar
│       └── PatientDashboard.tsx             ✨ Enhanced with booking
│
├── package.json                              ✨ Updated with socket.io
├── MODULE_3_DOCUMENTATION.md                 ✨ NEW - Complete docs
└── SETUP_GUIDE.md                            ✨ NEW - This file
```

---

## 🎯 Key Features Checklist

- ✅ Calendar-based booking UI
- ✅ Doctor dashboard with weekly calendar view
- ✅ Automatic overlap prevention
- ✅ Reschedule & cancel with reasons
- ✅ Real-time notifications (WebSocket)
- ✅ Email notifications (dev mode)
- ✅ Doctor availability management
- ✅ Available slot calculation
- ✅ Notification center with badge
- ✅ AI-powered recommendations
- ✅ No-show risk prediction

---

## 🧪 Testing Scenarios

### Test 1: Book an Appointment

1. Login as **patient**
2. Click **"Book"** next to any doctor
3. Select a date and time slot
4. Add notes, confirm booking
5. ✅ Verify notification appears in both patient and doctor dashboards

### Test 2: Prevent Overlap

1. Book appointment at 2:00 PM for Doctor A
2. Try to book another appointment at 2:00 PM for Doctor A
3. ✅ Should see error: "Time slot already booked"

### Test 3: Reschedule

1. Find upcoming appointment
2. Click "⋮" → "Reschedule"
3. Choose new date/time, provide reason
4. ✅ Old appointment marked "rescheduled", new one created

### Test 4: Cancel

1. Find upcoming appointment
2. Click "⋮" → "Cancel"
3. Provide reason
4. ✅ Appointment marked "cancelled", slot freed

### Test 5: Real-Time Notifications

1. Open two browser tabs
2. Login as **doctor** in tab 1
3. Login as **patient** in tab 2
4. Book appointment in patient tab
5. ✅ Doctor sees notification instantly

### Test 6: Calendar View

1. Login as **doctor**
2. Click **"Calendar View"** tab
3. ✅ See weekly grid with all appointments
4. Click any appointment
5. ✅ See full details in dialog

---

## 📊 Database Models Overview

### Enhanced Appointment

```
- patient_id, doctor_id
- start_time, end_time, duration
- status (scheduled/completed/cancelled/rescheduled/no_show)
- cancellation tracking (reason, cancelled_by, cancelled_at)
- reschedule tracking (rescheduled_from, rescheduled_to, reason)
- notification flags (confirmation_sent, reminder_sent)
```

### DoctorAvailability (New)

```
- weekly_schedule (day_of_week, time_slots)
- slot_duration, buffer_time
- blocked_dates (vacations)
- special_hours (override for specific dates)
```

### Notification (New)

```
- recipient_id, recipient_type (patient/doctor/admin)
- type (confirmation/reminder/cancelled/rescheduled)
- title, message
- channel (in_app/email/both)
- read status
```

---

## 🔌 API Endpoints Summary

### Appointments

- `POST /api/appointments` - Create appointment
- `POST /api/appointments/:id/reschedule` - Reschedule
- `POST /api/appointments/:id/cancel` - Cancel
- `GET /api/appointments/doctor/:doctorId/available-slots?date=YYYY-MM-DD` - Get slots
- `GET /api/appointments/doctor/:doctorId/schedule?start_date=...&end_date=...` - Get schedule
- `POST /api/appointments/check-availability` - Check if time is available

### Availability

- `GET /api/availability/:doctorId` - Get doctor availability
- `POST /api/availability/:doctorId` - Create/update availability
- `POST /api/availability/:doctorId/default` - Create default schedule
- `POST /api/availability/:doctorId/blocked-dates` - Add blocked date

### Notifications

- `GET /api/notifications/user/:userId` - Get notifications
- `GET /api/notifications/user/:userId/unread-count` - Get count
- `PUT /api/notifications/:notificationId/read` - Mark as read
- `PUT /api/notifications/user/:userId/read-all` - Mark all as read

---

## 🛠️ Troubleshooting

### MongoDB Connection Error

```bash
# Make sure MongoDB is running
mongod --dbpath /path/to/data

# Or use MongoDB Atlas (cloud)
# Update MONGODB_URI in .env to Atlas connection string
```

### WebSocket Not Connecting

```bash
# Check CLIENT_ORIGIN matches frontend URL
# Default: http://localhost:8080

# Verify in browser console:
# Should see: "WebSocket connected"
```

### No Available Slots Showing

```bash
# Create doctor availability first
curl -X POST http://localhost:4000/api/availability/<doctor_id>/default

# Or manually set schedule via API
```

### Port Already in Use

```bash
# Change PORT in .env
PORT=5000

# Or kill process using port 4000
# Windows:
netstat -ano | findstr :4000
taskkill /PID <PID> /F

# Mac/Linux:
lsof -ti:4000 | xargs kill
```

---

## 🎨 UI Components Usage

### In Patient Dashboard

```tsx
import { EnhancedAppointmentBooking } from "@/components/EnhancedAppointmentBooking";
import { NotificationCenter } from "@/components/NotificationCenter";
import { AppointmentActions } from "@/components/AppointmentActions";

// Booking
<EnhancedAppointmentBooking
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  doctor={selectedDoctor}
  patient={currentPatient}
  onSuccess={() => reloadAppointments()}
/>

// Notifications
<NotificationCenter userId={patient.id} userRole="patient" />

// Reschedule/Cancel
<AppointmentActions appointment={apt} onSuccess={() => reload()} />
```

### In Doctor Dashboard

```tsx
import { DoctorScheduleCalendar } from "@/components/DoctorScheduleCalendar";
import { NotificationCenter } from "@/components/NotificationCenter";

// Calendar View
<DoctorScheduleCalendar
  doctor={currentDoctor}
  onAppointmentClick={(apt) => console.log(apt)}
/>

// Notifications
<NotificationCenter userId={doctor.id} userRole="doctor" />
```

---

## 📈 Production Deployment

### Environment Variables for Production

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/medinova
PORT=4000
CLIENT_ORIGIN=https://yourdomain.com

# Email Service (choose one)
# Option 1: SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Option 2: SendGrid
SENDGRID_API_KEY=SG.xxxxx

# Option 3: AWS SES
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx
AWS_REGION=us-east-1
```

### Build Commands

```bash
# Build frontend
npm run build

# Start production server
NODE_ENV=production node server/src/index.ts

# Or with PM2
pm2 start server/src/index.ts --name "ai-medico-api"
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:4000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 🎓 Learning Resources

### Key Technologies Used

- **React** - UI framework
- **TypeScript** - Type safety
- **Express** - Backend API
- **MongoDB/Mongoose** - Database
- **Socket.io** - WebSocket
- **Shadcn/UI** - Component library
- **date-fns** - Date manipulation
- **Tailwind CSS** - Styling

### Recommended Reading

- [Socket.io Documentation](https://socket.io/docs/v4/)
- [Mongoose Schema Design](https://mongoosejs.com/docs/guide.html)
- [date-fns Documentation](https://date-fns.org/)
- [Shadcn/UI Components](https://ui.shadcn.com/)

---

## 💡 Tips & Best Practices

### Performance

- Use indexes on `doctor_id + start_time + end_time`
- Cache available slots for popular dates
- Paginate notification lists
- Use WebSocket rooms for targeted broadcasting

### Security

- Add authentication middleware to all routes
- Validate user can only book for themselves
- Sanitize all inputs
- Use HTTPS in production
- Implement rate limiting

### User Experience

- Show loading states during API calls
- Display clear error messages
- Confirm destructive actions (cancel, delete)
- Provide real-time feedback
- Use optimistic UI updates

### Code Quality

- Follow TypeScript strict mode
- Write JSDoc comments
- Use ESLint and Prettier
- Keep components small and focused
- Extract reusable logic to hooks

---

## 📞 Support

### Getting Help

1. Check [MODULE_3_DOCUMENTATION.md](./MODULE_3_DOCUMENTATION.md) for detailed reference
2. Review code comments inline
3. Test API endpoints with tools like Postman
4. Check browser console for frontend errors
5. Check server logs for backend errors

### Common Questions

**Q: Can patients book appointments in the past?**
A: No, past dates are automatically disabled in the calendar.

**Q: What happens if two people book the same slot simultaneously?**
A: The first request succeeds. The second receives a 409 Conflict error.

**Q: How far in advance can patients book?**
A: Configurable per doctor via `advance_booking_days` (default: 30 days).

**Q: Can doctors block multiple dates at once?**
A: Yes, call `POST /api/availability/:doctorId/blocked-dates` for each date.

**Q: Are notifications sent immediately?**
A: Yes, via WebSocket for online users. Email notifications are also sent.

**Q: Can appointment duration be changed?**
A: Yes, pass `duration` parameter when creating/rescheduling appointments.

---

## ✨ Module 3 is Complete!

You now have a fully functional appointment scheduling system with:

- ✅ Modern calendar-based UI
- ✅ Zero overlapping appointments
- ✅ Real-time notifications
- ✅ Complete CRUD operations
- ✅ Doctor availability management
- ✅ Production-ready architecture

**Happy coding! 🚀**
