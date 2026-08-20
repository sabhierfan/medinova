import { Appointment } from "./dbService";

export type NoShowPrediction = {
  score: number;
  riskLevel: "Low" | "Medium" | "High";
  reasons: string[];
};

/**
 * Predicts the likelihood that a patient will miss (no-show) an appointment.
 * @param appointment The scheduled appointment in question.
 * @param patientHistory The history of all appointments for the patient.
 */
export const calculateNoShowRisk = (
  appointment: Appointment,
  patientHistory: Appointment[]
): NoShowPrediction => {
  let score = 15; // baseline risk 15%
  const reasons: string[] = [];

  if (!appointment) return { score, riskLevel: "Low", reasons };

  // 1. Analyze Booking Lead Time
  const apptDate = new Date(appointment.appointment_date);
  const createdDate = appointment.createdAt ? new Date(appointment.createdAt) : new Date();
  const diffTime = apptDate.getTime() - createdDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 14) {
    score += 25;
    reasons.push(`Long lead time (${diffDays} days in advance increases forgetfulness risk)`);
  } else if (diffDays > 7) {
    score += 15;
    reasons.push(`Moderate lead time (${diffDays} days in advance)`);
  } else if (diffDays <= 1) {
    score -= 10; // Same day or next day bookings are more likely to be kept
  }

  // 2. Analyze Time of Day
  const hours = apptDate.getHours();
  if (hours < 9) {
    score += 15;
    reasons.push("Early morning appointment (higher transport/commute delay risk)");
  } else if (hours >= 17) {
    score += 15;
    reasons.push("Late afternoon/evening appointment (higher conflict/fatigue risk)");
  }

  // 3. Analyze Day of Week
  const day = apptDate.getDay();
  if (day === 1) {
    score += 10;
    reasons.push("Monday scheduling (higher start-of-week meeting conflicts)");
  } else if (day === 5) {
    score += 10;
    reasons.push("Friday scheduling (higher weekend travel overlap risk)");
  }

  // 4. Historical Patient Behavior
  if (patientHistory && patientHistory.length > 0) {
    const totalPast = patientHistory.filter(
      a => a.status === "completed" || a.status === "no_show" || a.status === "cancelled"
    );
    if (totalPast.length > 0) {
      const missed = patientHistory.filter(a => a.status === "no_show" || a.status === "cancelled");
      const missRate = missed.length / totalPast.length;

      if (missRate > 0.5) {
        score += 35;
        reasons.push(`High historical cancellation/miss rate (${Math.round(missRate * 100)}%)`);
      } else if (missRate > 0.2) {
        score += 15;
        reasons.push(`Moderate historical cancellation/miss rate (${Math.round(missRate * 100)}%)`);
      } else if (missRate === 0) {
        score -= 10; // Deduct for perfect attendance
      }
    }
  }

  // Normalize score between 5% and 95%
  score = Math.max(5, Math.min(95, score));

  // Determine Risk Level
  let riskLevel: "Low" | "Medium" | "High" = "Low";
  if (score >= 60) {
    riskLevel = "High";
  } else if (score >= 35) {
    riskLevel = "Medium";
  }

  return {
    score,
    riskLevel,
    reasons: reasons.length > 0 ? reasons : ["Normal scheduling factors"]
  };
};
