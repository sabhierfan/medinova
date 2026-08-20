import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Activity, User, LogOut, Clock, FileText, Brain, TrendingUp, Plus, XCircle, Search } from "lucide-react";
import { clearCurrentUser, getCurrentUser, SessionUser } from "@/lib/localAuth";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Recharts for EMR Visualization
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Legend } from 'recharts';

import { 
  fetchDoctors, fetchPatientAppointments, bookAppointment, cancelAppointment, 
  fetchPatientEMRs, logAuditEvent, Doctor, Appointment, EMRData 
} from "@/lib/dbService";
import { suggestSpecialization } from "@/lib/gemini";
import { maskText } from "@/lib/security";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { cn } from "@/lib/utils";
import { MedinovaChatbot } from "@/components/MedinovaChatbot";


const PatientDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [emrs, setEmrs] = useState<EMRData[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  
  // EMR Details Reveal State
  const [revealedEmrs, setRevealedEmrs] = useState<Record<string, boolean>>({});

  // Session inactivity timeout (auto logout in 5 minutes)
  useSessionTimeout(() => {
    toast.error("Logged out automatically due to inactivity for HIPAA compliance.");
    logout();
  });
  
  // AI Symptom Checker State
  const [symptoms, setSymptoms] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{
    specialization: string;
    urgency: "Low" | "Medium" | "High" | "Emergency";
    rationale: string;
    selfCare: string[];
    redFlags: string[];
    discussionGuide: string[];
  } | null>(null);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);

  // Booking form state
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>("");
  const [appointmentDate, setAppointmentDate] = useState<string>("");
  const [appointmentTime, setAppointmentTime] = useState<string>("");
  const [notes, setNotes] = useState<string>("");


  useEffect(() => {
    const current = getCurrentUser();
    if (!current || current.role !== "patient") {
      clearCurrentUser();
      navigate("/login", { replace: true});
      return;
    }
    setUser(current);
    loadPatientData(current.id);
    logAuditEvent(current.id, "patient", "access_dashboard", current.id, "Patient accessed dashboard");

    const interval = setInterval(() => {
      loadPatientData(current.id);
    }, 30000);

    return () => clearInterval(interval);
  }, [navigate]);

  const loadPatientData = async (userId: string) => {
    try {
      setLoading(true);
      const docs = await fetchDoctors();
      setDoctors(docs.filter(d => d.active !== false));
      setFilteredDoctors(docs.filter(d => d.active !== false));

      const apts = await fetchPatientAppointments(userId);
      setAppointments(apts);

      const patientEmrs = await fetchPatientEMRs(userId);
      setEmrs(patientEmrs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()));
      
      toast.success("Dashboard loaded");
    } catch (error) {
      console.error("Error loading patient data:", error);
      toast.error("Failed to load patient data");
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyzeSymptoms = async () => {
    if (!symptoms.trim()) {
      toast.error("Please enter your symptoms");
      return;
    }
    setIsAnalyzing(true);
    try {
      const suggestion = await suggestSpecialization(symptoms);
      setAiSuggestion(suggestion);
      
      const filtered = doctors.filter(d => 
        d.specialization?.toLowerCase() === suggestion.specialization.toLowerCase()
      );
      setFilteredDoctors(filtered.length > 0 ? filtered : doctors);
      
      if (filtered.length > 0) {
        toast.success(`Found ${filtered.length} matching doctors`);
      } else {
        toast.message(`No ${suggestion.specialization} available, showing all doctors.`);
      }

      if (user) {
        await logAuditEvent(
          user.id,
          "patient",
          "symptom_analysis",
          user.id,
          `Analyzed symptoms: "${symptoms}". Suggested: ${suggestion.specialization}. Urgency: ${suggestion.urgency}`
        );
      }
    } catch (error) {
      toast.error("Error analyzing symptoms");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBookAppointment = async () => {
    if (!selectedDoctorId || !appointmentDate || !appointmentTime || !user) {
      toast.error("Please fill in all required fields");
      return;
    }
    try {
      const appointmentDateTime = new Date(`${appointmentDate}T${appointmentTime}`);
      await bookAppointment({
        doctor_id: selectedDoctorId,
        patient_id: user.id,
        appointment_date: appointmentDateTime.toISOString(),
        start_time: appointmentDateTime.toISOString(),
        end_time: new Date(appointmentDateTime.getTime() + 30 * 60000).toISOString(),
        duration: 30,
        status: "scheduled",
        notes: notes || undefined,
      });
      toast.success("Appointment booked successfully!");
      setIsBookingOpen(false);
      setSelectedDoctorId("");
      setAppointmentDate("");
      setAppointmentTime("");
      setNotes("");
      loadPatientData(user.id);
    } catch (error) {
      console.error("Error booking appointment:", error);
      toast.error("Failed to book appointment");
    }
  };

  const handleCancelAppt = async (appointmentId: string) => {
    try {
      await cancelAppointment(appointmentId, "Cancelled by patient", "patient");
      toast.success("Appointment cancelled successfully");
      loadPatientData(user!.id);
    } catch (error) {
      toast.error("Failed to cancel appointment");
    }
  };

  const logout = async () => {
    if (user) {
      await logAuditEvent(user.id, "patient", "logout", user.id, "Patient logged out");
    }
    clearCurrentUser();
    navigate("/login", { replace: true });
  };

  const upcoming = appointments.filter((a) => {
    const aptDate = new Date(a.appointment_date);
    return (a.status === "scheduled" || a.status === "rescheduled" || !a.status) && aptDate >= new Date();
  });

  const past = appointments.filter((a) => {
    const aptDate = new Date(a.appointment_date);
    return a.status === "completed" || a.status === "cancelled" || aptDate < new Date();
  });

  const getStatusBadge = (status: string) => {
    const variant = status === "completed" ? "secondary" : status === "cancelled" ? "destructive" : "default";
    return <Badge variant={variant as any}>{status}</Badge>;
  };

  // EMR Chart Data
  const chartData = emrs.map(emr => ({
    date: new Date(emr.createdAt).toLocaleDateString(),
    weight: emr.vitals?.weight,
    heartRate: emr.vitals?.heartRate,
    temperature: emr.vitals?.temperature,
  }));

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary rounded-lg">
              <User className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Patient Dashboard</h1>
              {user ? <p className="text-sm text-muted-foreground">{user.fullName}</p> : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => loadPatientData(user!.id)}>
              <Activity className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="ghost" onClick={logout}>
              <LogOut className="h-5 w-5 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {loading ? (
          <div className="text-center py-12">
            <Activity className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Loading data...</p>
          </div>
        ) : (
          <>
            <div className="grid md:grid-cols-3 gap-6 mb-8">
              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">Total Appointments</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{appointments.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">All time bookings</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">Upcoming</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{upcoming.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Scheduled appointments</p>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">Health Records</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{emrs.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">Total EMRs available</p>
                </CardContent>
              </Card>
            </div>

            {/* AI Symptom Checker & Booking Section */}
            <Card className="bg-card border-border mb-8 border-primary/20 shadow-md">
              <CardHeader className="bg-primary/5 rounded-t-xl">
                <CardTitle className="text-foreground flex items-center gap-2">
                  <Brain className="h-5 w-5 text-primary" />
                  AI-Powered Doctor Match & Booking
                </CardTitle>
                <CardDescription>Describe your symptoms, and AI will suggest the best specialization.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="flex gap-4 items-start mb-6">
                  <div className="flex-1">
                    <Textarea 
                      placeholder="e.g., I have a severe headache, blurred vision, and feel nauseous..."
                      value={symptoms}
                      onChange={e => setSymptoms(e.target.value)}
                      className="resize-none"
                      rows={2}
                    />
                  </div>
                  <Button onClick={handleAnalyzeSymptoms} disabled={isAnalyzing} className="h-auto py-4 shrink-0">
                    {isAnalyzing ? <Activity className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4 mr-2" />}
                    Analyze Symptoms
                  </Button>
                </div>

                {aiSuggestion && (
                  <div className="mb-6 p-5 rounded-lg border bg-card shadow-sm space-y-4">
                    <div className="flex items-center justify-between border-b pb-3">
                      <div className="flex items-center gap-2">
                        <Brain className="h-5 w-5 text-primary" />
                        <h3 className="font-semibold text-lg text-foreground">AI Triage Report</h3>
                      </div>
                      <Badge className={cn("text-xs font-semibold px-2.5 py-0.5 rounded-full text-white", 
                        aiSuggestion.urgency === "Emergency" && "bg-destructive text-destructive-foreground animate-pulse",
                        aiSuggestion.urgency === "High" && "bg-orange-500",
                        aiSuggestion.urgency === "Medium" && "bg-yellow-500 text-black",
                        aiSuggestion.urgency === "Low" && "bg-green-500"
                      )}>
                        Urgency: {aiSuggestion.urgency}
                      </Badge>
                    </div>
                    
                    <div>
                      <p className="text-sm text-foreground font-medium mb-1">Recommended Specialty:</p>
                      <p className="text-sm text-primary font-semibold">{aiSuggestion.specialization}</p>
                      <p className="text-xs text-muted-foreground mt-1">{aiSuggestion.rationale}</p>
                    </div>

                    {aiSuggestion.urgency === "Emergency" && (
                      <div className="p-3 bg-red-100 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-md text-xs text-red-600 dark:text-red-400 flex items-start gap-2">
                        <span className="font-bold">⚠️ EMERGENCY ALERT:</span>
                        Please go to the nearest emergency department immediately or call for medical assistance. Do not wait for an appointment if you experience red-flag symptoms.
                      </div>
                    )}

                    <div className="grid md:grid-cols-3 gap-4 text-xs pt-2">
                      <div className="p-3 bg-muted rounded-md space-y-2">
                        <h4 className="font-semibold text-foreground border-b pb-1">💡 Self-Care Advice</h4>
                        <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                          {aiSuggestion.selfCare.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-3 bg-muted rounded-md space-y-2">
                        <h4 className="font-semibold text-foreground border-b pb-1 font-medium text-red-500 dark:text-red-400">⚠️ Red Flags (Monitor Closely)</h4>
                        <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                          {aiSuggestion.redFlags.map((item, i) => (
                            <li key={i} className="text-red-500 dark:text-red-400">{item}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-3 bg-muted rounded-md space-y-2">
                        <h4 className="font-semibold text-foreground border-b pb-1">💬 Discussion Guide</h4>
                        <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                          {aiSuggestion.discussionGuide.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )}

                <div className="border rounded-md overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted/50">
                      <TableRow>
                        <TableHead>Doctor Name</TableHead>
                        <TableHead>Specialization</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDoctors.length === 0 ? (
                        <TableRow><TableCell colSpan={3} className="text-center py-4">No doctors available.</TableCell></TableRow>
                      ) : (
                        filteredDoctors.map((doctor) => (
                          <TableRow key={doctor.id}>
                            <TableCell className="font-medium">{doctor.name}</TableCell>
                            <TableCell>{doctor.specialization || "General Practice"}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedDoctorId(doctor.id!);
                                  setIsBookingOpen(true);
                                }}
                              >
                                <Plus className="h-4 w-4 mr-1" /> Book
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            <div className="grid lg:grid-cols-2 gap-6 mb-8">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <Calendar className="h-5 w-5" /> Upcoming Appointments
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 max-h-[400px] overflow-auto">
                  {upcoming.length === 0 ? (
                    <p className="text-center text-muted-foreground py-4">No upcoming appointments</p>
                  ) : (
                    upcoming.map((apt) => (
                      <div key={apt._id} className="p-4 rounded-lg border border-border bg-muted">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-foreground">
                            {doctors.find(d => d.id === apt.doctor_id)?.name || "Doctor"}
                          </h4>
                          {getStatusBadge(apt.status)}
                        </div>
                        <div className="text-sm text-muted-foreground mb-3">
                          {new Date(apt.appointment_date).toLocaleString()}
                        </div>
                        <Button size="sm" variant="destructive" onClick={() => handleCancelAppt(apt._id)}>
                          Cancel
                        </Button>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              {/* Medical Data Analytics Visualization */}
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    <TrendingUp className="h-5 w-5" /> Health Analytics & Progress
                  </CardTitle>
                  <CardDescription>Track your vitals over time based on Doctor visits.</CardDescription>
                </CardHeader>
                <CardContent>
                  {emrs.length < 2 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Activity className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Not enough medical records to show trends.</p>
                      <p className="text-xs">Complete more appointments to generate charts.</p>
                    </div>
                  ) : (
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                          <Line type="monotone" dataKey="weight" stroke="#8884d8" name="Weight (kg)" strokeWidth={2} />
                          <Line type="monotone" dataKey="heartRate" stroke="#82ca9d" name="Heart Rate (bpm)" strokeWidth={2} />
                          <CartesianGrid stroke="#ccc" strokeDasharray="5 5" />
                          <XAxis dataKey="date" tick={{fontSize: 12}} />
                          <YAxis tick={{fontSize: 12}} />
                          <RechartsTooltip />
                          <Legend />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            <Card className="bg-card border-border mb-8">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-foreground">
                  <FileText className="h-5 w-5" /> Medical History (EMR)
                </CardTitle>
                <CardDescription>Records are encrypted at-rest and masked by default for HIPAA compliance.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {emrs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">No medical history available.</p>
                ) : (
                  emrs.map(emr => {
                    const isRevealed = !!revealedEmrs[emr._id];
                    const handleReveal = async () => {
                      if (user) {
                        await logAuditEvent(
                          user.id,
                          "patient",
                          "reveal_emr",
                          emr._id,
                          `Revealed EMR details (Diagnosis: ${emr.diagnosis})`
                        );
                        setRevealedEmrs(prev => ({ ...prev, [emr._id]: true }));
                      }
                    };

                    return (
                      <div key={emr._id} className="p-4 border border-border rounded-lg bg-muted relative overflow-hidden">
                        <div className="flex justify-between items-center mb-3">
                          <span className="font-semibold text-foreground">
                            {new Date(emr.createdAt).toLocaleDateString()}
                          </span>
                          <Badge variant="outline">Consultation</Badge>
                        </div>
                        <div className="grid md:grid-cols-2 gap-4 text-sm">
                          <div>
                            <strong className="block text-foreground mb-1">Vitals</strong>
                            <ul className="text-muted-foreground space-y-1">
                              <li>BP: {isRevealed ? emr.vitals?.bloodPressure : "•••/••"}</li>
                              <li>Heart Rate: {isRevealed ? `${emr.vitals?.heartRate} bpm` : "•• bpm"}</li>
                              <li>Weight: {isRevealed ? `${emr.vitals?.weight} kg` : "•• kg"}</li>
                              <li>Temp: {isRevealed ? `${emr.vitals?.temperature} °C` : "••.• °C"}</li>
                            </ul>
                          </div>
                          <div>
                            <strong className="block text-foreground mb-1">Diagnosis & Prescription</strong>
                            <p className="text-muted-foreground mb-2">
                              <strong>Diagnosis:</strong> {isRevealed ? emr.diagnosis : maskText(emr.diagnosis, 2)}
                            </p>
                            <p className="text-muted-foreground mb-2">
                              <strong>Symptoms:</strong> {isRevealed ? emr.symptoms : maskText(emr.symptoms, 4)}
                            </p>
                            <div className="p-2 bg-background rounded border border-border">
                              <strong>Rx:</strong> {isRevealed ? emr.prescription : "••••••••••••"}
                            </div>
                          </div>
                        </div>
                        {!isRevealed && (
                          <div className="mt-4 pt-3 border-t border-dashed flex justify-end">
                            <Button size="sm" variant="outline" onClick={handleReveal}>
                              🔓 Reveal Protected EMR Details
                            </Button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Booking Dialog */}
            <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Book Appointment</DialogTitle>
                  <DialogDescription>Fill in the details to book your appointment</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Appointment Date</Label>
                    <Input id="date" type="date" value={appointmentDate} onChange={(e) => setAppointmentDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Appointment Time</Label>
                    <Input id="time" type="time" value={appointmentTime} onChange={(e) => setAppointmentTime(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Notes (Optional)</Label>
                    <Textarea id="notes" placeholder="Any special requirements or notes..." value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsBookingOpen(false)}>Cancel</Button>
                  <Button onClick={handleBookAppointment}>Confirm Booking</Button>
                </div>
              </DialogContent>
            </Dialog>

          </>
        )}
      </div>
      <MedinovaChatbot />
    </div>
  );
};

export default PatientDashboard;
