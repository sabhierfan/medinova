import { db } from "./firebase";
import { ref, get, set, push, update, remove, query, orderByChild, equalTo } from "firebase/database";
import { encryptText, decryptText } from "./security";


// Doctor Types
export type Doctor = {
  _id: string; id?: string; name: string; email: string; specialization: string; phone?: string; rating?: number; total_appointments?: number; active: boolean; createdAt?: string; updatedAt?: string;
};

// Patient Types
export type Patient = {
  _id: string; id?: string; name: string; email: string; phone?: string; age?: number; address?: string; medical_history?: string; total_appointments?: number; last_visit?: string; createdAt?: string; updatedAt?: string;
};

// Appointment Types
export type Appointment = {
  _id: string; id?: string; patient_id: string; doctor_id: string; appointment_date: string; start_time: string; end_time: string; duration: number; status: "scheduled" | "completed" | "cancelled" | "no_show" | "rescheduled"; doctor_decision?: "pending" | "accepted" | "rejected"; doctor_decision_reason?: string; doctor_decision_at?: string; notes?: string; cancellation_reason?: string; cancelled_by?: "patient" | "doctor" | "admin"; cancelled_at?: string; rescheduled_from?: string; rescheduled_to?: string; rescheduled_at?: string; reschedule_reason?: string; notification_sent?: boolean; reminder_sent?: boolean; confirmation_sent?: boolean; createdAt?: string; updatedAt?: string; doctor?: Doctor; patient?: Patient;
};

export type DoctorAvailability = {
  id: string; doctor_id: string; weekly_schedule: { day_of_week: number; is_available: boolean; time_slots: { start_time: string; end_time: string; }[]; }[]; slot_duration: number; buffer_time: number; advance_booking_days: number; same_day_booking: boolean; blocked_dates: { date: string; reason?: string; }[]; special_hours: { date: string; time_slots: { start_time: string; end_time: string; }[]; }[]; createdAt?: string; updatedAt?: string;
};

export type Notification = {
  id: string; recipient_id: string; recipient_type: "patient" | "doctor" | "admin"; type: "appointment_confirmation" | "appointment_reminder" | "appointment_cancelled" | "appointment_rescheduled" | "appointment_completed"; title: string; message: string; appointment_id?: string; channel: "in_app" | "email" | "both"; email_sent: boolean; email_sent_at?: string; read: boolean; read_at?: string; metadata?: any; createdAt?: string; updatedAt?: string;
};

export type SystemLog = {
  id: string; level: "info" | "warning" | "error"; event_type: string; module: string; message: string; metadata?: any; created_at: string;
};

// EMR Types
export type EMRData = {
  _id: string;
  id?: string;
  appointment_id: string;
  patient_id: string;
  doctor_id: string;
  vitals: {
    bloodPressure: string;
    heartRate: number;
    weight: number;
    temperature: number;
  };
  symptoms: string;
  diagnosis: string;
  prescription: string;
  notes: string;
  createdAt: string;
};

// ==== Doctor Operations ====

export const fetchDoctors = async (): Promise<Doctor[]> => {
  const usersRef = ref(db, "users");
  const snapshot = await get(usersRef);
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return Object.keys(data)
    .map(key => ({ ...data[key], _id: key, id: key }))
    .filter(u => u.role === "doctor");
};

export const fetchDoctorById = async (doctorId: string): Promise<Doctor | null> => {
  const snapshot = await get(ref(db, `users/${doctorId}`));
  if (!snapshot.exists()) return null;
  return { ...snapshot.val(), _id: doctorId, id: doctorId };
};

export const fetchDoctorByEmail = async (email: string): Promise<Doctor | null> => {
  const doctors = await fetchDoctors();
  return doctors.find(d => d.email === email) || null;
};

export const addDoctor = async (doctor: any): Promise<Doctor> => {
  // handled by auth registration now, stubbed here
  return doctor as Doctor;
};

export const deleteDoctor = async (doctorId: string): Promise<void> => {
  await remove(ref(db, `users/${doctorId}`));
};

// ==== Patient Operations ====

export const fetchPatients = async (): Promise<Patient[]> => {
  const usersRef = ref(db, "users");
  const snapshot = await get(usersRef);
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return Object.keys(data)
    .map(key => ({ ...data[key], _id: key, id: key }))
    .filter(u => u.role === "patient");
};

export const fetchPatientById = async (patientId: string): Promise<Patient | null> => {
  const snapshot = await get(ref(db, `users/${patientId}`));
  if (!snapshot.exists()) return null;
  return { ...snapshot.val(), _id: patientId, id: patientId };
};

export const fetchPatientByEmail = async (email: string): Promise<Patient | null> => {
  const patients = await fetchPatients();
  return patients.find(p => p.email === email) || null;
};

export const addPatient = async (patient: any): Promise<Patient> => {
  return patient as Patient;
};

export const deletePatient = async (patientId: string): Promise<void> => {
  await remove(ref(db, `users/${patientId}`));
};

// ==== Appointment Operations ====

export const fetchAppointments = async (): Promise<Appointment[]> => {
  const snapshot = await get(ref(db, "appointments"));
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  return Object.keys(data).map(key => ({ ...data[key], _id: key, id: key }));
};

export const fetchAppointmentById = async (appointmentId: string): Promise<Appointment | null> => {
  const snapshot = await get(ref(db, `appointments/${appointmentId}`));
  if (!snapshot.exists()) return null;
  return { ...snapshot.val(), _id: appointmentId, id: appointmentId };
};

export const fetchPatientAppointments = async (patientId: string): Promise<Appointment[]> => {
  const apts = await fetchAppointments();
  return apts.filter(a => a.patient_id === patientId);
};

export const fetchDoctorAppointments = async (doctorId: string): Promise<Appointment[]> => {
  const apts = await fetchAppointments();
  return apts.filter(a => a.doctor_id === doctorId);
};

export const fetchTodayDoctorAppointments = async (doctorId: string): Promise<Appointment[]> => {
  const apts = await fetchDoctorAppointments(doctorId);
  const today = new Date().toISOString().split("T")[0];
  return apts.filter(a => a.appointment_date.startsWith(today));
};

export const bookAppointment = async (appointment: any): Promise<Appointment> => {
  const newRef = push(ref(db, "appointments"));
  const apptData = { ...appointment, createdAt: new Date().toISOString() };
  await set(newRef, apptData);
  return { ...apptData, _id: newRef.key!, id: newRef.key! };
};

export const updateAppointment = async (
  appointmentId: string,
  updates: Partial<Appointment>
): Promise<Appointment> => {
  await update(ref(db, `appointments/${appointmentId}`), updates);
  const updated = await fetchAppointmentById(appointmentId);
  return updated!;
};

export const deleteAppointment = async (appointmentId: string): Promise<void> => {
  await remove(ref(db, `appointments/${appointmentId}`));
};

// ==== System Logs & Stats ====
export const fetchSystemLogs = async (limit: number = 50): Promise<SystemLog[]> => [];
export const createSystemLog = async (log: any): Promise<SystemLog> => log;

export type AuditLog = {
  _id?: string;
  userId: string;
  userRole: string;
  action: string;
  targetId: string;
  details: string;
  createdAt: string;
};

export const logAuditEvent = async (
  userId: string,
  role: string,
  action: string,
  targetId: string,
  details: string
): Promise<void> => {
  try {
    const logsRef = ref(db, "audit_logs");
    const newLogRef = push(logsRef);
    await set(newLogRef, {
      userId,
      userRole: role,
      action,
      targetId,
      details,
      createdAt: new Date().toISOString()
    });
  } catch (e) {
    console.error("Failed to log audit event:", e);
  }
};

export const fetchAuditLogs = async (): Promise<AuditLog[]> => {
  try {
    const logsRef = ref(db, "audit_logs");
    const snapshot = await get(logsRef);
    if (!snapshot.exists()) return [];
    const data = snapshot.val();
    return Object.keys(data)
      .map(key => ({ ...data[key], _id: key }))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } catch (e) {
    console.error("Failed to fetch audit logs due to permissions:", e);
    return [];
  }
};


export const fetchAdminStats = async () => {
  const doctors = await fetchDoctors();
  const patients = await fetchPatients();
  const apts = await fetchAppointments();
  return {
    totalUsers: doctors.length + patients.length,
    totalAppointments: apts.length,
    activeDoctors: doctors.length,
    noShowPredictions: apts.filter(a => a.status === "no_show").length,
    completedAppointments: apts.filter(a => a.status === "completed").length,
    cancelledAppointments: apts.filter(a => a.status === "cancelled").length,
  };
};

export const seedDemoAccounts = async () => ({});
export const seedDatabase = async () => ({});
export const clearDatabase = async () => ({});

export const fetchAnalyticsOverview = async (params?: any) => {
  const doctors = await fetchDoctors();
  const patients = await fetchPatients();
  const apts = await fetchAppointments();

  const total = apts.length;
  const completed = apts.filter(a => a.status === "completed").length;
  const cancelled = apts.filter(a => a.status === "cancelled").length;
  const no_show = apts.filter(a => a.status === "no_show").length;
  const scheduled = apts.filter(a => a.status === "scheduled").length;
  const rescheduled = apts.filter(a => a.status === "rescheduled").length;

  const cancellationRate = total > 0 ? (cancelled / total) * 100 : 0;
  const noShowRate = total > 0 ? (no_show / total) * 100 : 0;
  const completionRate = total > 0 ? (completed / total) * 100 : 0;

  const docWorkloadMap: Record<string, number> = {};
  apts.forEach(a => {
    docWorkloadMap[a.doctor_id] = (docWorkloadMap[a.doctor_id] || 0) + 1;
  });
  const doctorWorkloadTop = Object.keys(docWorkloadMap).map(docId => {
    const doc = doctors.find(d => d._id === docId);
    return {
      name: doc ? doc.name : `Dr. ${docId.slice(0, 4)}`,
      count: docWorkloadMap[docId]
    };
  }).sort((a, b) => b.count - a.count).slice(0, 5);

  const deptMap: Record<string, number> = {};
  apts.forEach(a => {
    const doc = doctors.find(d => d._id === a.doctor_id);
    const spec = doc?.specialization || "General Practice";
    deptMap[spec] = (deptMap[spec] || 0) + 1;
  });
  const topDepartments = Object.keys(deptMap).map(name => ({
    name,
    count: deptMap[name]
  })).sort((a, b) => b.count - a.count);

  return {
    range: { start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), end: new Date().toISOString() },
    totals: {
      doctors: doctors.length,
      patients: patients.length,
      appointments: total,
      completed,
      cancelled,
      no_show,
      scheduled,
      rescheduled
    },
    rates: {
      cancellationRate,
      noShowRate,
      completionRate
    },
    flow: {
      patientThroughputPerDay: Math.round((total / 30) * 10) / 10 || 0,
      peakHours: [
        { hour: 9, count: apts.filter(a => new Date(a.appointment_date).getHours() === 9).length },
        { hour: 10, count: apts.filter(a => new Date(a.appointment_date).getHours() === 10).length },
        { hour: 11, count: apts.filter(a => new Date(a.appointment_date).getHours() === 11).length },
        { hour: 14, count: apts.filter(a => new Date(a.appointment_date).getHours() === 14).length },
        { hour: 15, count: apts.filter(a => new Date(a.appointment_date).getHours() === 15).length },
      ],
      missedAppointments: {
        count: no_show + cancelled,
        rate: total > 0 ? ((no_show + cancelled) / total) * 100 : 0
      }
    },
    topDepartments,
    doctorWorkloadTop
  };
};

export const fetchAppointmentTrends = async (params?: any) => {
  const apts = await fetchAppointments();
  const dateMap: Record<string, number> = {};
  apts.forEach(a => {
    const dateStr = new Date(a.appointment_date).toLocaleDateString(undefined, { month: "short", day: "numeric" });
    dateMap[dateStr] = (dateMap[dateStr] || 0) + 1;
  });

  const trendsData = Object.keys(dateMap).map(date => ({
    date,
    count: dateMap[date]
  })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    bucket: (params?.bucket || "day") as any,
    range: { start: "", end: "" },
    appointments: trendsData,
    patientVisits: trendsData
  };
};

export const fetchDoctorPerformance = async (params?: any) => {
  const doctors = await fetchDoctors();
  const apts = await fetchAppointments();

  const data = doctors.map(doc => {
    const docApts = apts.filter(a => a.doctor_id === doc._id);
    const completed = docApts.filter(a => a.status === "completed").length;
    const cancelled = docApts.filter(a => a.status === "cancelled").length;
    const rate = docApts.length > 0 ? (cancelled / docApts.length) * 100 : 0;
    return {
      id: doc._id,
      name: doc.name,
      specialization: doc.specialization || "General Practice",
      appointmentsSeen: completed,
      cancellationRate: Math.round(rate),
      rating: doc.rating || 4.8
    };
  });

  return {
    page: 1,
    pageSize: 10,
    total: doctors.length,
    data
  };
};

export const fetchAnalyticsAppointments = async (params?: any) => {
  const apts = await fetchAppointments();
  const doctors = await fetchDoctors();
  const patients = await fetchPatients();

  const data = apts.map(apt => {
    const doc = doctors.find(d => d._id === apt.doctor_id);
    const pat = patients.find(p => p._id === apt.patient_id);
    return {
      id: apt._id,
      patientName: pat ? pat.name : `Patient ${apt.patient_id.slice(0, 4)}`,
      doctorName: doc ? doc.name : `Dr. ${apt.doctor_id.slice(0, 4)}`,
      date: apt.appointment_date,
      status: apt.status,
      fee: 100
    };
  });

  return {
    page: 1,
    pageSize: 20,
    total: apts.length,
    data
  };
};
export const downloadAnalyticsReport = async () => new Blob();

export const fetchAppointmentsWithDetails = async () => {
  const apts = await fetchAppointments();
  const docs = await fetchDoctors();
  const pats = await fetchPatients();
  return apts.map(a => ({
    ...a,
    doctor: docs.find(d => d._id === a.doctor_id),
    patient: pats.find(p => p._id === a.patient_id)
  }));
};

export const fetchAppointmentWithDetails = async (appointmentId: string) => {
  const a = await fetchAppointmentById(appointmentId);
  if (!a) return null;
  a.doctor = await fetchDoctorById(a.doctor_id as string) as Doctor;
  a.patient = await fetchPatientById(a.patient_id as string) as Patient;
  return a;
};

// Reschedule an appointment
export const rescheduleAppointment = async (
  appointmentId: string,
  newDate: string,
  reason?: string,
  duration?: number
): Promise<Appointment> => {
  return await updateAppointment(appointmentId, {
    appointment_date: newDate,
    reschedule_reason: reason,
    duration,
    status: "rescheduled"
  });
};

// Cancel an appointment
export const cancelAppointment = async (
  appointmentId: string,
  reason: string,
  cancelledBy: "patient" | "doctor" | "admin" = "patient"
): Promise<Appointment> => {
  return await updateAppointment(appointmentId, {
    status: "cancelled",
    cancellation_reason: reason,
    cancelled_by: cancelledBy,
    cancelled_at: new Date().toISOString()
  });
};

export const doctorDecideAppointment = async (
  appointmentId: string,
  doctorId: string,
  decision: "accepted" | "rejected",
  reason?: string
): Promise<Appointment> => {
  return await updateAppointment(appointmentId, {
    doctor_decision: decision,
    doctor_decision_reason: reason,
    doctor_decision_at: new Date().toISOString(),
    status: decision === "rejected" ? "cancelled" : "scheduled"
  });
};

export const getAvailableSlots = async (
  doctorId: string,
  date: string
): Promise<{ doctor_id: string; date: string; available_slots: string[] }> => {
  const slots: string[] = [];
  for (let hour = 9; hour < 17; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      slots.push(`${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`);
    }
  }
  return { doctor_id: doctorId, date, available_slots: slots };
};

export const getDoctorSchedule = async (
  doctorId: string,
  startDate: string,
  endDate: string
): Promise<any> => {
  const doctor = await fetchDoctorById(doctorId);
  const appointments = await fetchDoctorAppointments(doctorId);
  return { doctor, availability: null, appointments, date_range: { start_date: startDate, end_date: endDate } };
};

export const checkDoctorAvailability = async (
  doctorId: string,
  appointmentDate: string
): Promise<{ available: boolean; reason?: string }> => {
  return { available: true };
};

// ==== Doctor Availability Operations ====

export const fetchDoctorAvailability = async (doctorId: string): Promise<DoctorAvailability | null> => {
  const snapshot = await get(ref(db, `availability/${doctorId}`));
  if (!snapshot.exists()) return null;
  return snapshot.val();
};

export const saveDoctorAvailability = async (
  doctorId: string,
  availability: Partial<DoctorAvailability>
): Promise<DoctorAvailability> => {
  await set(ref(db, `availability/${doctorId}`), availability);
  return { id: doctorId, doctor_id: doctorId, ...availability } as DoctorAvailability;
};

export const createDefaultAvailability = async (doctorId: string): Promise<DoctorAvailability> => {
  return await saveDoctorAvailability(doctorId, { weekly_schedule: [], slot_duration: 30, advance_booking_days: 30, same_day_booking: true, buffer_time: 0 });
};

export const updateWeeklySchedule = async (doctorId: string, weeklySchedule: any) => {
  await update(ref(db, `availability/${doctorId}`), { weekly_schedule: weeklySchedule });
  return await fetchDoctorAvailability(doctorId) as DoctorAvailability;
};

export const addBlockedDate = async (doctorId: string, date: string, reason?: string) => {
  return await fetchDoctorAvailability(doctorId) as DoctorAvailability;
};

export const removeBlockedDate = async (doctorId: string, dateIndex: number) => {
  return await fetchDoctorAvailability(doctorId) as DoctorAvailability;
};

// ==== Notification Operations ====
export const fetchUserNotifications = async (userId: string, limit: number = 50): Promise<Notification[]> => [];
export const getUnreadNotificationCount = async (userId: string): Promise<number> => 0;
export const markNotificationRead = async (notificationId: string): Promise<void> => {};
export const markAllNotificationsRead = async (userId: string): Promise<void> => {};
export const deleteNotification = async (notificationId: string): Promise<void> => {};
export const clearAllNotifications = async (userId: string): Promise<void> => {};

// ==== EMR Operations ====

const decryptEMRRecord = async (rawRecord: any): Promise<EMRData> => {
  const vitals = rawRecord.vitals || {};
  const decBP = await decryptText(vitals.bloodPressure || "");
  const decHR = await decryptText(vitals.heartRate || "0");
  const decWT = await decryptText(vitals.weight || "0");
  const decTemp = await decryptText(vitals.temperature || "0");

  return {
    ...rawRecord,
    vitals: {
      bloodPressure: decBP || "120/80",
      heartRate: Number(decHR) || 72,
      weight: Number(decWT) || 70,
      temperature: Number(decTemp) || 36.5,
    },
    symptoms: await decryptText(rawRecord.symptoms || ""),
    diagnosis: await decryptText(rawRecord.diagnosis || ""),
    prescription: await decryptText(rawRecord.prescription || ""),
    notes: await decryptText(rawRecord.notes || ""),
  };
};

export const fetchPatientEMRs = async (patientId: string): Promise<EMRData[]> => {
  const emrRef = ref(db, "emr");
  const snapshot = await get(emrRef);
  if (!snapshot.exists()) return [];
  const data = snapshot.val();
  const records = Object.keys(data)
    .map(key => ({ ...data[key], _id: key, id: key }))
    .filter(r => r.patient_id === patientId);
  
  const decryptedRecords: EMRData[] = [];
  for (const rec of records) {
    decryptedRecords.push(await decryptEMRRecord(rec));
  }
  return decryptedRecords;
};

export const fetchAppointmentEMR = async (appointmentId: string): Promise<EMRData | null> => {
  const emrRef = ref(db, "emr");
  const snapshot = await get(emrRef);
  if (!snapshot.exists()) return null;
  const data = snapshot.val();
  const records = Object.keys(data).map(key => ({ ...data[key], _id: key, id: key }));
  const rawRecord = records.find(r => r.appointment_id === appointmentId);
  if (!rawRecord) return null;
  return await decryptEMRRecord(rawRecord);
};

export const saveEMR = async (emr: Omit<EMRData, "_id" | "id" | "createdAt">): Promise<EMRData> => {
  const newRef = push(ref(db, "emr"));
  
  const encryptedVitals = {
    bloodPressure: await encryptText(emr.vitals.bloodPressure),
    heartRate: await encryptText(String(emr.vitals.heartRate)),
    weight: await encryptText(String(emr.vitals.weight)),
    temperature: await encryptText(String(emr.vitals.temperature)),
  };

  const encryptedData = {
    ...emr,
    vitals: encryptedVitals,
    symptoms: await encryptText(emr.symptoms),
    diagnosis: await encryptText(emr.diagnosis),
    prescription: await encryptText(emr.prescription),
    notes: await encryptText(emr.notes),
    createdAt: new Date().toISOString()
  };

  await set(newRef, encryptedData);
  return { ...emr, _id: newRef.key!, id: newRef.key!, createdAt: encryptedData.createdAt } as EMRData;
};
