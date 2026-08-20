# MongoDB Setup Guide

## Prerequisites

1. **Install MongoDB**
   - Windows: Download from [https://www.mongodb.com/try/download/community](https://www.mongodb.com/try/download/community)
   - After installation, MongoDB should run as a service automatically
   - Default connection: `mongodb://localhost:27017`

## Environment Setup

1. Create a `.env` file in the root directory:

```bash
MONGODB_URI=mongodb://localhost:27017/medinova
PORT=4000
CLIENT_ORIGIN=http://localhost:8080
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
JWT_SECRET=your_secret_key_here
JWT_EXPIRES_IN=1h
```

2. Create a `server/.env` file with the same content (optional, since it reads from root)

## Running the Application

### Start MongoDB (if not running as service)

```bash
# Windows
mongod

# Or check if MongoDB service is running
services.msc  # Look for "MongoDB" service
```

### Start the Backend Server

```bash
npm run dev:all
```

This will start:

- Frontend: http://localhost:8080
- Backend API: http://localhost:4000

## API Endpoints

### Doctors

- `GET /api/doctors` - Get all doctors
- `GET /api/doctors/:id` - Get doctor by ID
- `GET /api/doctors/email/:email` - Get doctor by email
- `POST /api/doctors` - Create doctor
- `PUT /api/doctors/:id` - Update doctor
- `DELETE /api/doctors/:id` - Delete doctor

### Patients

- `GET /api/patients` - Get all patients
- `GET /api/patients/:id` - Get patient by ID
- `GET /api/patients/email/:email` - Get patient by email
- `POST /api/patients` - Create patient
- `PUT /api/patients/:id` - Update patient
- `DELETE /api/patients/:id` - Delete patient

### Appointments

- `GET /api/appointments` - Get all appointments
- `GET /api/appointments/:id` - Get appointment by ID
- `GET /api/appointments/patient/:patientId` - Get patient appointments
- `GET /api/appointments/doctor/:doctorId` - Get doctor appointments
- `GET /api/appointments/doctor/:doctorId/today` - Get today's appointments for doctor
- `POST /api/appointments` - Create appointment
- `PUT /api/appointments/:id` - Update appointment
- `DELETE /api/appointments/:id` - Delete appointment

### Admin

- `GET /api/stats` - Get admin statistics
- `GET /api/logs` - Get system logs

## Database Schema

### Doctor

```json
{
  "name": "string",
  "email": "string (unique)",
  "specialization": "string",
  "phone": "string",
  "rating": "number (0-5)",
  "total_appointments": "number",
  "active": "boolean"
}
```

### Patient

```json
{
  "name": "string",
  "email": "string (unique)",
  "phone": "string",
  "age": "number",
  "address": "string",
  "medical_history": "string",
  "total_appointments": "number",
  "last_visit": "date"
}
```

### Appointment

```json
{
  "patient_id": "ObjectId (ref: Patient)",
  "doctor_id": "ObjectId (ref: Doctor)",
  "appointment_date": "date",
  "status": "scheduled | completed | cancelled | no_show",
  "notes": "string"
}
```

## Features

### Admin Dashboard

- View all doctors and patients from MongoDB
- Add/delete doctors and patients
- View statistics (calculated from real data)
- View system logs

### Patient Dashboard

- View list of available doctors from MongoDB
- Book appointments with doctors
- View upcoming and past appointments
- AI-powered appointment recommendations

### Doctor Dashboard

- View all appointments from MongoDB
- See today's appointments
- Track appointment status
- View patient details

## Troubleshooting

### MongoDB Connection Error

- Ensure MongoDB is running: `net start MongoDB` (Windows)
- Check connection string in `.env` file
- Verify MongoDB is installed and accessible

### Port Already in Use

- Change PORT in `.env` file
- Or kill process using port 4000: `npx kill-port 4000`

### No Data Showing

1. Register new users (doctor/patient) through signup page
2. They will automatically be added to MongoDB
3. Refresh the dashboards

### API Errors

- Check backend console for errors
- Ensure MongoDB is connected (look for "✅ MongoDB connected successfully")
- Verify all models are imported correctly
