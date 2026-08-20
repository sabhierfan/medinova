import { initializeApp } from "firebase/app";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from "firebase/auth";
import { getDatabase, ref, set, push } from "firebase/database";

// Firebase config is read from environment variables -- copy .env.example
// to .env and fill in your own Firebase project's values.
const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// ---- Custom Users ----

const doctors = [
  { email: "drkinza@medinova.com",   password: "kinza123",   name: "Dr. Kinza Fatima",    spec: "Cardiologist" },
  { email: "drahmed@medinova.com",   password: "ahmed123",   name: "Dr. Ahmed Raza",      spec: "Neurologist" },
  { email: "drsana@medinova.com",    password: "sana123",    name: "Dr. Sana Malik",      spec: "Dermatologist" },
  { email: "drfaisal@medinova.com",  password: "faisal123",  name: "Dr. Faisal Khan",     spec: "Orthopedic" },
  { email: "drhira@medinova.com",    password: "hira123",    name: "Dr. Hira Noor",       spec: "General Practice" },
];

const patients = [
  { email: "saad.ahmed@example.com",   password: "saad123",    name: "Saad Ahmed" },
  { email: "ayesha.khan@example.com",  password: "ayesha123",  name: "Ayesha Khan" },
  { email: "hamza.ali@example.com",    password: "hamza123",   name: "Hamza Ali" },
  { email: "maria.tariq@example.com",  password: "maria123",   name: "Maria Tariq" },
  { email: "bilal.hassan@example.com", password: "bilal123",   name: "Bilal Hassan" },
];

// Helper: create or sign in, then write profile
const seedUser = async (email: string, password: string, userData: any): Promise<string> => {
  let uid: string;
  try {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    uid = cred.user.uid;
    console.log(`  ✓ Created: ${email}`);
  } catch (e: any) {
    if (e.code === "auth/email-already-in-use") {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      uid = cred.user.uid;
      console.log(`  ✓ Exists, signed in: ${email}`);
    } else {
      console.error(`  ✗ Error ${email}:`, e.message);
      return "";
    }
  }
  await set(ref(db, `users/${uid}`), userData);
  return uid;
};

// Helper: generate a past date N days ago at a specific hour
const pastDate = (daysAgo: number, hour: number) => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

const futureDate = (daysAhead: number, hour: number) => {
  const d = new Date();
  d.setDate(d.getDate() + daysAhead);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

const seedData = async () => {
  // ---- 1. Create Users ----
  console.log("=== Creating Doctors ===");
  const doctorUids: string[] = [];
  for (const doc of doctors) {
    const uid = await seedUser(doc.email, doc.password, {
      name: doc.name, email: doc.email, role: "doctor",
      specialization: doc.spec, active: true, createdAt: new Date().toISOString()
    });
    doctorUids.push(uid);
  }

  console.log("\n=== Creating Patients ===");
  const patientUids: string[] = [];
  for (const pat of patients) {
    const uid = await seedUser(pat.email, pat.password, {
      name: pat.name, email: pat.email, role: "patient",
      createdAt: new Date().toISOString()
    });
    patientUids.push(uid);
  }

  // ---- 2. Seed Appointments ----
  console.log("\n=== Seeding Appointments ===");

  // Define a matrix of appointments: which patient visited which doctor, when, and status
  const appointmentPlan = [
    // Saad visited Dr. Kinza (Cardiologist) 3 times
    { pIdx: 0, dIdx: 0, daysAgo: 30, hour: 10, status: "completed" },
    { pIdx: 0, dIdx: 0, daysAgo: 15, hour: 11, status: "completed" },
    { pIdx: 0, dIdx: 0, daysAgo: 3,  hour: 14, status: "completed" },
    // Saad visited Dr. Ahmed (Neurologist) once
    { pIdx: 0, dIdx: 1, daysAgo: 20, hour: 9,  status: "completed" },
    // Saad has an upcoming with Dr. Kinza
    { pIdx: 0, dIdx: 0, daysAhead: 3, hour: 10, status: "scheduled" },

    // Ayesha visited Dr. Sana (Dermatologist) 2 times
    { pIdx: 1, dIdx: 2, daysAgo: 25, hour: 10, status: "completed" },
    { pIdx: 1, dIdx: 2, daysAgo: 10, hour: 15, status: "completed" },
    // Ayesha visited Dr. Hira (General Practice)
    { pIdx: 1, dIdx: 4, daysAgo: 5,  hour: 11, status: "completed" },
    // Ayesha has upcoming with Dr. Sana
    { pIdx: 1, dIdx: 2, daysAhead: 2, hour: 14, status: "scheduled" },

    // Hamza visited Dr. Faisal (Orthopedic) 2 times
    { pIdx: 2, dIdx: 3, daysAgo: 18, hour: 9,  status: "completed" },
    { pIdx: 2, dIdx: 3, daysAgo: 7,  hour: 10, status: "completed" },
    // Hamza cancelled one with Dr. Kinza
    { pIdx: 2, dIdx: 0, daysAgo: 12, hour: 14, status: "cancelled" },

    // Maria visited Dr. Hira (General Practice) 2 times
    { pIdx: 3, dIdx: 4, daysAgo: 22, hour: 10, status: "completed" },
    { pIdx: 3, dIdx: 4, daysAgo: 8,  hour: 16, status: "completed" },
    // Maria visited Dr. Ahmed (Neurologist)
    { pIdx: 3, dIdx: 1, daysAgo: 4,  hour: 11, status: "completed" },

    // Bilal visited Dr. Kinza (Cardiologist)
    { pIdx: 4, dIdx: 0, daysAgo: 14, hour: 15, status: "completed" },
    // Bilal visited Dr. Faisal (Orthopedic)
    { pIdx: 4, dIdx: 3, daysAgo: 6,  hour: 9,  status: "completed" },
    // Bilal has upcoming with Dr. Hira
    { pIdx: 4, dIdx: 4, daysAhead: 5, hour: 10, status: "scheduled" },
  ];

  const appointmentIds: string[] = [];
  const appointmentMeta: { pIdx: number; dIdx: number; status: string }[] = [];

  for (const plan of appointmentPlan) {
    const patientId = patientUids[plan.pIdx];
    const doctorId = doctorUids[plan.dIdx];
    if (!patientId || !doctorId) continue;

    const dateStr = plan.daysAhead
      ? futureDate(plan.daysAhead, plan.hour)
      : pastDate(plan.daysAgo!, plan.hour);
    const endDate = new Date(new Date(dateStr).getTime() + 30 * 60000).toISOString();

    const apptData: any = {
      patient_id: patientId,
      doctor_id: doctorId,
      appointment_date: dateStr,
      start_time: dateStr,
      end_time: endDate,
      duration: 30,
      status: plan.status,
      createdAt: dateStr,
    };

    if (plan.status === "completed") {
      apptData.doctor_decision = "accepted";
    } else if (plan.status === "scheduled") {
      apptData.doctor_decision = "pending";
    }

    if (plan.status === "cancelled") {
      apptData.notes = "Patient could not make it";
    }

    const newRef = push(ref(db, "appointments"));
    await set(newRef, apptData);
    appointmentIds.push(newRef.key!);
    appointmentMeta.push({ pIdx: plan.pIdx, dIdx: plan.dIdx, status: plan.status });
    console.log(`  ✓ ${patients[plan.pIdx].name} → ${doctors[plan.dIdx].name} (${plan.status})`);
  }

  // ---- 3. Seed EMR records for completed appointments ----
  console.log("\n=== Seeding EMR Records ===");

  const emrTemplates = [
    // Saad → Dr. Kinza visit 1 (30 days ago)
    { bp: "140/90", hr: 88, wt: 82, temp: 37.1, symptoms: "Chest tightness, shortness of breath", diagnosis: "Mild hypertension", prescription: "Amlodipine 5mg once daily, low-sodium diet" },
    // Saad → Dr. Kinza visit 2 (15 days ago)
    { bp: "135/85", hr: 82, wt: 80, temp: 36.8, symptoms: "Follow-up, slight chest discomfort", diagnosis: "Improving hypertension", prescription: "Continue Amlodipine 5mg, add 30min daily walk" },
    // Saad → Dr. Kinza visit 3 (3 days ago)
    { bp: "128/80", hr: 76, wt: 78, temp: 36.6, symptoms: "Feeling better, routine check", diagnosis: "Controlled hypertension", prescription: "Continue Amlodipine 5mg, review in 1 month" },
    // Saad → Dr. Ahmed (Neurologist)
    { bp: "130/82", hr: 80, wt: 81, temp: 36.9, symptoms: "Frequent headaches, dizziness", diagnosis: "Tension headaches, stress-related", prescription: "Paracetamol 500mg as needed, stress management counseling" },

    // Ayesha → Dr. Sana visit 1
    { bp: "118/75", hr: 72, wt: 58, temp: 36.7, symptoms: "Skin rash on arms, itching", diagnosis: "Contact dermatitis", prescription: "Hydrocortisone cream 1%, Cetirizine 10mg at night" },
    // Ayesha → Dr. Sana visit 2
    { bp: "120/76", hr: 74, wt: 57, temp: 36.6, symptoms: "Rash improved but still mild itching", diagnosis: "Resolving dermatitis", prescription: "Continue Hydrocortisone for 5 more days, moisturize regularly" },
    // Ayesha → Dr. Hira
    { bp: "115/72", hr: 70, wt: 57, temp: 36.5, symptoms: "Fatigue, low energy", diagnosis: "Vitamin D deficiency", prescription: "Vitamin D3 2000IU daily, increase sunlight exposure" },

    // Hamza → Dr. Faisal visit 1
    { bp: "125/80", hr: 78, wt: 90, temp: 36.8, symptoms: "Lower back pain, stiffness", diagnosis: "Lumbar muscle strain", prescription: "Ibuprofen 400mg twice daily, physiotherapy 3x/week" },
    // Hamza → Dr. Faisal visit 2
    { bp: "122/78", hr: 76, wt: 88, temp: 36.7, symptoms: "Back pain reduced, still some stiffness", diagnosis: "Improving lumbar strain", prescription: "Continue physiotherapy, Ibuprofen as needed" },

    // Maria → Dr. Hira visit 1
    { bp: "110/70", hr: 68, wt: 62, temp: 36.6, symptoms: "Persistent cough, mild fever", diagnosis: "Upper respiratory infection", prescription: "Amoxicillin 500mg three times daily for 7 days, rest" },
    // Maria → Dr. Hira visit 2
    { bp: "112/72", hr: 70, wt: 61, temp: 36.5, symptoms: "Cough resolved, general checkup", diagnosis: "Recovered from URI", prescription: "No medication needed, stay hydrated" },
    // Maria → Dr. Ahmed
    { bp: "115/74", hr: 72, wt: 61, temp: 36.7, symptoms: "Occasional migraines", diagnosis: "Migraine without aura", prescription: "Sumatriptan 50mg at onset, avoid triggers (stress, bright lights)" },

    // Bilal → Dr. Kinza
    { bp: "138/88", hr: 85, wt: 95, temp: 37.0, symptoms: "Heart palpitations, anxiety", diagnosis: "Anxiety-induced tachycardia", prescription: "Propranolol 20mg twice daily, reduce caffeine" },
    // Bilal → Dr. Faisal
    { bp: "132/84", hr: 80, wt: 93, temp: 36.8, symptoms: "Right knee pain after sports", diagnosis: "Mild knee ligament sprain", prescription: "RICE protocol, Knee brace for 2 weeks, Diclofenac gel" },
  ];

  let emrIdx = 0;
  for (let i = 0; i < appointmentIds.length; i++) {
    if (appointmentMeta[i].status !== "completed") continue;
    const template = emrTemplates[emrIdx];
    if (!template) continue;

    const emrData = {
      appointment_id: appointmentIds[i],
      patient_id: patientUids[appointmentMeta[i].pIdx],
      doctor_id: doctorUids[appointmentMeta[i].dIdx],
      vitals: {
        bloodPressure: template.bp,
        heartRate: template.hr,
        weight: template.wt,
        temperature: template.temp,
      },
      symptoms: template.symptoms,
      diagnosis: template.diagnosis,
      prescription: template.prescription,
      notes: "",
      createdAt: pastDate(30 - emrIdx * 2, 10), // Spread dates for chart variety
    };

    const emrRef = push(ref(db, "emr"));
    await set(emrRef, emrData);
    console.log(`  ✓ EMR: ${patients[appointmentMeta[i].pIdx].name} — ${template.diagnosis}`);
    emrIdx++;
  }

  console.log("\n✅ All data seeded successfully!");
  console.log("\n--- Quick Login Credentials ---");
  console.log("Doctors:");
  doctors.forEach(d => console.log(`  ${d.email} / ${d.password}`));
  console.log("Patients:");
  patients.forEach(p => console.log(`  ${p.email} / ${p.password}`));
  console.log("Admin:");
  console.log("  admin@medinova.com / admin123");

  process.exit(0);
};

seedData();
