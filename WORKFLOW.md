# MediNova AI (AI-Medico) Workflows

This document outlines the end-to-end user workflows for the different user roles in the MediNova AI system.

---

## 1. Initial Landing & Onboarding
* **Landing Page**: The user enters the application on the main landing page ([Index.tsx](file:///f:/projects/medinova/src/pages/Index.tsx)).
* **Support Chatbot**: Users can interact with the floating **Medinova Assistant** chatbot ([MedinovaChatbot.tsx](file:///f:/projects/medinova/src/components/MedinovaChatbot.tsx)) located in the bottom-right corner to ask general support and help questions about appointments, platform functions, or security features.
* **Authentication**: The user logs in ([Login.tsx](file:///f:/projects/medinova/src/pages/Login.tsx) or [AdminLogin.tsx](file:///f:/projects/medinova/src/pages/AdminLogin.tsx)) or registers a new patient/doctor account ([Signup.tsx](file:///f:/projects/medinova/src/pages/Signup.tsx)).

---

## 2. Patient Workflow ([PatientDashboard.tsx](file:///f:/projects/medinova/src/pages/PatientDashboard.tsx))
Once signed in, a Patient follows this workflow:
1. **AI Symptom Check (Optional)**:
   - The patient inputs their current symptoms (e.g., *"sharp headache, photophobia"*) and clicks **Analyze**.
   - Gemini AI ([suggestSpecialization](file:///f:/projects/medinova/src/lib/gemini.ts)) determines the appropriate medical specialization, urgency level, self-care guidelines, and red flags.
   - The doctor listings are automatically filtered to show specialists matching the recommended specialty.
2. **Booking an Appointment**:
   - The patient clicks **Book Appointment**, selects a Doctor, selects an available date and time slot, adds optional medical notes, and confirms.
3. **Appointment Management**:
   - Patients can view their list of upcoming scheduled/rescheduled appointments or cancel any upcoming appointment with a specified reason.
4. **Accessing EMR (Electronic Medical Records)**:
   - Patients can see past consultation details. For HIPAA compliance, medical records are masked by default ([maskText](file:///f:/projects/medinova/src/lib/security.ts)).
   - Clicking the **Reveal** button decrypts the details client-side ([decryptText](file:///f:/projects/medinova/src/lib/security.ts)) and logs a tracking event ([logAuditEvent](file:///f:/projects/medinova/src/lib/dbService.ts)).
   - A health trends chart visualizes historical vital data (weight, heart rate, temperature).

---

## 3. Doctor Workflow ([DoctorDashboard.tsx](file:///f:/projects/medinova/src/pages/DoctorDashboard.tsx))
Once signed in, a Doctor follows this workflow:
1. **Dashboard Review**:
   - The doctor checks today's appointments, upcoming schedules, and weekly calendar slots.
2. **Predictive Analytics (No-Show Risk)**:
   - For every scheduled slot, the doctor sees an AI-calculated risk rating of whether the patient will miss the appointment ([calculateNoShowRisk](file:///f:/projects/medinova/src/lib/noShowPredictor.ts)), along with the reasons (e.g., booking lead days, time of day).
3. **Conducting a Consultation & Logging EMR**:
   - During the appointment, the doctor marks the session as **Completed**.
   - A modal opens, prompting the doctor to input patient vitals, symptoms, diagnosis, and prescriptions.
   - Upon submitting, the EMR is encrypted client-side using AES-GCM before writing to the database ([encryptText](file:///f:/projects/medinova/src/lib/security.ts)).
4. **Patient History**:
   - The doctor accesses the history tab to view previously completed EMR files for their patients.

---

## 4. Admin Workflow ([AdminDashboard.tsx](file:///f:/projects/medinova/src/pages/AdminDashboard.tsx))
Once signed in, an Administrator follows this workflow:
1. **System Administration**:
   - Oversees registered doctors and patients, with options to register new doctors or deactivate accounts.
2. **HIPAA Security & Audit Tracking**:
   - Reviews real-time audit logs ([AuditLog](file:///f:/projects/medinova/src/lib/dbService.ts)) showing actions like user logins, database views, and EMR decryptions.
3. **Advanced Analytics & Custom Reports**:
   - Accesses the analytics panel or the dedicated [AnalyticsDashboard.tsx](file:///f:/projects/medinova/src/pages/AnalyticsDashboard.tsx) to inspect appointment trends, doctor workloads, and peak hours.
   - Configures global settings (Maintenance Mode, Booking Limits, Reminders).
   - Exports reports as JSON backups.

---

## 5. Universal System Features
* **Inactivity Auto-Logout**: If any user is inactive for 5 minutes, a hook ([useSessionTimeout](file:///f:/projects/medinova/src/hooks/useSessionTimeout.ts)) terminates their session to protect patient PHI (Protected Health Information).
* **Real-time Synchronization**: Frontend dashboards synchronize live with Firebase Realtime Database.
