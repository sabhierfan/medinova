import { GoogleGenAI } from "@google/genai";

// Initialize the Gemini client. We use the API key from environment variables.
export const initializeGemini = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("VITE_GEMINI_API_KEY is not set in the environment variables.");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

export const suggestSpecialization = async (
  symptoms: string
): Promise<{
  specialization: string;
  urgency: "Low" | "Medium" | "High" | "Emergency";
  rationale: string;
  selfCare: string[];
  redFlags: string[];
  discussionGuide: string[];
}> => {
  const ai = initializeGemini();
  if (!ai) {
    return {
      specialization: "General Practice",
      urgency: "Medium",
      rationale: "AI is currently disabled due to missing API key. Defaulting to General Practice.",
      selfCare: ["Rest and monitor symptoms."],
      redFlags: ["Any sudden worsening of symptoms, difficulty breathing, or severe pain."],
      discussionGuide: ["How long have these symptoms persisted?", "Are there any immediate lifestyle adjustments?"]
    };
  }

  const prompt = `
You are an AI medical triage assistant for the Medinova booking system.
A patient has reported the following symptoms: "${symptoms}"

Suggest the single most appropriate medical specialization from this list:
- Cardiologist
- Neurologist
- Dermatologist
- Pediatrician
- Orthopedic
- Psychiatrist
- General Practice
- Ophthalmologist

Determine the triage urgency level from:
- Low (Self-care or routine visit)
- Medium (Schedule an appointment in next few days)
- High (Urgent care appointment recommended)
- Emergency (Go to the nearest Emergency Department immediately)

Provide a rational explanation, 3 non-prescription self-care instructions, 2 critical emergency warning signs (red flags) to monitor, and 3 questions the patient can ask their doctor.

Respond strictly in JSON format with exactly these keys:
{
  "specialization": "The specialization name from the list above",
  "urgency": "Low" | "Medium" | "High" | "Emergency",
  "rationale": "1-2 sentence medical reasoning explanation",
  "selfCare": ["instruction 1", "instruction 2", "instruction 3"],
  "redFlags": ["red flag 1", "red flag 2"],
  "discussionGuide": ["question 1", "question 2", "question 3"]
}
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      }
    });

    const text = response.text || "{}";
    const result = JSON.parse(text);
    return {
      specialization: result.specialization || "General Practice",
      urgency: result.urgency || "Medium",
      rationale: result.rationale || "General consultation recommended.",
      selfCare: result.selfCare || ["Rest and monitor symptoms."],
      redFlags: result.redFlags || ["Sudden worsening of symptoms."],
      discussionGuide: result.discussionGuide || ["What could be causing these symptoms?"]
    };
  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      specialization: "General Practice",
      urgency: "Medium",
      rationale: "There was an error analyzing the symptoms. Defaulting to General Practice.",
      selfCare: ["Rest and monitor symptoms."],
      redFlags: ["Sudden worsening of symptoms."],
      discussionGuide: ["What could be causing these symptoms?"]
    };
  }
};

export const askMedinovaBot = async (
  userMessage: string,
  chatHistory: { role: "user" | "model"; text: string }[]
): Promise<string> => {
  const ai = initializeGemini();
  if (!ai) {
    return "The Gemini API is not configured. Please add VITE_GEMINI_API_KEY to your .env file to enable the assistant.";
  }

  const systemInstruction = `
You are the Medinova Help Assistant, a specialized chatbot designed to answer questions about the Medinova healthcare scheduling platform.
Provide helpful, professional, and clear answers.
Here is the functional specification of Medinova for your reference:
1. Patient Dashboard Features:
   - AI-Powered Symptom Checker & Triage: Patients describe symptoms. Gemini suggests a specialization, urgency level (Low, Medium, High, Emergency), self-care tips, red flag warnings, and lets them book matching doctors.
   - Appointment Booking: Book appointments with a selected doctor, date, and time.
   - Medical History (EMR): Access electronic medical records (vitals, symptoms, diagnosis, and prescription). EMRs are client-side encrypted in the Firebase database and masked in the UI until revealed, creating an audit log.
   - Health Analytics: Line charts tracking weight and heart rate trends.
2. Doctor Dashboard Features:
   - Schedule Management: Accept, complete, or cancel appointments.
   - EMR Entry: Record vitals (BP, HR, weight, temp), symptoms, diagnosis, and prescriptions.
   - Patient History: Tab containing all completed or cancelled past appointments.
   - No-Show Risk: Displays predicted no-show risk (Low/Medium/High) for upcoming appointments.
3. Admin Dashboard Features:
   - Stats Overview: View user totals, booking counts, and average no-show risk.
   - User Management: Add/delete doctors and patients.
   - System Settings: Auto-scheduling thresholds and maintenance controls.
   - Security Audit Log: View audit trail of EMR access, logins, and logouts.
4. Security & Compliance Details:
   - AES-GCM Client-Side Encryption: Patient clinical fields are encrypted in Firebase and decrypted only in the browser.
   - Session Timeout: Automatic logout after 5 minutes of inactivity for HIPAA compliance.
   - Access Logs: Every EMR reveal logs an entry under '/audit_logs'.

Keep answers concise, direct, and focused. Avoid giving actual medical diagnosis or medical advice. If asked for medical help, suggest using the AI Symptom Checker in the Patient Dashboard or consulting one of our doctors (e.g. Dr. Kinza Fatima, Cardiologist; Dr. Ahmed Raza, Neurologist; Dr. Sana Malik, Dermatologist; Dr. Faisal Khan, Orthopedic; Dr. Hira Noor, General Practice).
`;

  try {
    const contents = [
      { role: "user", parts: [{ text: systemInstruction }] },
      { role: "model", parts: [{ text: "Understood. I am the Medinova Help Assistant. How can I help you today?" }] }
    ];

    for (const h of chatHistory) {
      contents.push({
        role: h.role === "user" ? "user" : "model",
        parts: [{ text: h.text }]
      });
    }

    contents.push({
      role: "user",
      parts: [{ text: userMessage }]
    });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: contents,
    });

    return response.text || "I apologize, but I could not formulate a response.";
  } catch (error) {
    console.error("Gemini Assistant Chat Error:", error);
    return "I am currently experiencing connection issues. Please try again shortly.";
  }
};
