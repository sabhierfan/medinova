import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Stethoscope, Calendar, Clock, Users, LogOut, Activity, CalendarDays, CheckCircle2, XCircle, FilePlus } from "lucide-react";
import { clearCurrentUser, getCurrentUser, SessionUser } from "@/lib/localAuth";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { 
  fetchDoctorById, fetchDoctorAppointments, fetchAppointments, updateAppointment, cancelAppointment, saveEMR, fetchAppointmentEMR, logAuditEvent,
  Doctor, Appointment, EMRData 
} from "@/lib/dbService";
import { calculateNoShowRisk } from "@/lib/noShowPredictor";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { maskText } from "@/lib/security";
import { cn } from "@/lib/utils";
import { MedinovaChatbot } from "@/components/MedinovaChatbot";


const DoctorDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [doctor, setDoctor] = useState<Doctor | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  // EMR Input State
  const [isEmrOpen, setIsEmrOpen] = useState(false);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [emrData, setEmrData] = useState({
    bp: "120/80", heartRate: "72", weight: "70", temp: "36.5",
    symptoms: "", diagnosis: "", prescription: "", notes: ""
  });

  // Patient History & View EMR State
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [isViewEmrOpen, setIsViewEmrOpen] = useState(false);
  const [selectedEmr, setSelectedEmr] = useState<EMRData | null>(null);

  // Session Inactivity Logout
  useSessionTimeout(() => {
    toast.error("Logged out automatically due to inactivity for HIPAA compliance.");
    logout();
  });

  useEffect(() => {
    const current = getCurrentUser();
    if (!current || current.role !== "doctor") {
      clearCurrentUser();
      navigate("/login", { replace: true });
      return;
    }
    setUser(current);
    loadDoctorData(current.id);

    const interval = setInterval(() => {
      loadDoctorData(current.id);
    }, 30000);

    return () => clearInterval(interval);
  }, [navigate]);

  const loadDoctorData = async (doctorId: string) => {
    try {
      setLoading(true);
      const doc = await fetchDoctorById(doctorId);
      setDoctor(doc);
      
      const apts = await fetchDoctorAppointments(doctorId);
      const allApts = await fetchAppointments();
      
      // Store all doctor appointments and overall appointments for no-show calculation
      setAppointments(apts.sort((a,b) => new Date(a.appointment_date).getTime() - new Date(b.appointment_date).getTime()));
      setAllAppointments(allApts);
      
      logAuditEvent(doctorId, "doctor", "access_dashboard", doctorId, "Doctor accessed dashboard");
      toast.success("Dashboard loaded");
    } catch (error) {
      console.error("Error loading doctor data:", error);
      toast.error("Failed to load doctor data");
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (user) {
      await logAuditEvent(user.id, "doctor", "logout", user.id, "Doctor logged out");
    }
    clearCurrentUser();
    navigate("/login", { replace: true });
  };

  const formatTime = (iso: string) => new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const formatDate = (iso: string) => new Date(iso).toLocaleDateString();

  const getStatusBadge = (status: string) => {
    const variant = status === "completed" ? "secondary" : status === "cancelled" ? "destructive" : "default";
    return <Badge variant={variant as any}>{status}</Badge>;
  };

  const handleCompleteAppointment = async (appointmentId: string) => {
    try {
      await updateAppointment(appointmentId, { status: "completed" });
      toast.success("Appointment completed. Please add EMR details.");
      loadDoctorData(user!.id);
      
      const apt = appointments.find(a => a._id === appointmentId);
      if (apt) {
        setSelectedAppt(apt);
        setIsEmrOpen(true);
      }
    } catch (error) {
      toast.error("Failed to complete appointment");
    }
  };

  const handleCancelAppt = async (appointmentId: string) => {
    try {
      await cancelAppointment(appointmentId, "Cancelled by doctor", "doctor");
      toast.success("Appointment cancelled");
      loadDoctorData(user!.id);
    } catch (error) {
      toast.error("Failed to cancel appointment");
    }
  };

  const submitEMR = async () => {
    if (!selectedAppt) return;
    try {
      await saveEMR({
        appointment_id: selectedAppt._id,
        patient_id: selectedAppt.patient_id as string,
        doctor_id: selectedAppt.doctor_id as string,
        vitals: {
          bloodPressure: emrData.bp,
          heartRate: Number(emrData.heartRate),
          weight: Number(emrData.weight),
          temperature: Number(emrData.temp)
        },
        symptoms: emrData.symptoms,
        diagnosis: emrData.diagnosis,
        prescription: emrData.prescription,
        notes: emrData.notes
      });
      toast.success("Medical Records saved successfully!");
      setIsEmrOpen(false);
    } catch (e) {
      toast.error("Failed to save EMR");
    }
  };

  const today = new Date();
  const todayAppointments = appointments.filter(apt => new Date(apt.appointment_date).toDateString() === today.toDateString());
  const completedToday = todayAppointments.filter(apt => apt.status === "completed").length;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary rounded-lg">
              <Stethoscope className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Doctor Dashboard</h1>
              {user ? <p className="text-sm text-muted-foreground">{user.fullName}</p> : null}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => loadDoctorData(user!.id)}>
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
                  <CardTitle className="text-sm font-medium text-foreground">Today's Appointments</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{todayAppointments.length}</div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">Upcoming Appointments</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{appointments.filter(a => a.status === "scheduled").length}</div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">Completed Today</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{completedToday}</div>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Schedule & Patients</CardTitle>
                <CardDescription>Manage your active appointments, track history, and view no-show risks</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="active" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="active">Active Schedule & Bookings</TabsTrigger>
                    <TabsTrigger value="history">Completed Patient History</TabsTrigger>
                  </TabsList>

                  <TabsContent value="active">
                    {appointments.filter(a => a.status === "scheduled" || a.status === "rescheduled" || (new Date(a.appointment_date).toDateString() === new Date().toDateString() && a.status !== "completed" && a.status !== "cancelled")).length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No active appointments scheduled.</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Patient ID</TableHead>
                            <TableHead>No-Show Risk</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {appointments.filter(a => a.status === "scheduled" || a.status === "rescheduled" || (new Date(a.appointment_date).toDateString() === new Date().toDateString() && a.status !== "completed" && a.status !== "cancelled")).map((apt) => {
                            const patientHistory = allAppointments.filter(hist => hist.patient_id === apt.patient_id && hist._id !== apt._id);
                            const prediction = calculateNoShowRisk(apt, patientHistory);

                            return (
                              <TableRow key={apt._id}>
                                <TableCell className="whitespace-nowrap font-medium">{formatDate(apt.appointment_date)}</TableCell>
                                <TableCell className="whitespace-nowrap flex items-center gap-2">
                                  <Clock className="h-4 w-4" />{formatTime(apt.start_time)}
                                </TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">{apt.patient_id as string}</TableCell>
                                <TableCell>
                                  <span 
                                    className={cn(
                                      "text-xs px-2 py-1 rounded font-medium cursor-help text-white",
                                      prediction.riskLevel === "High" ? "bg-destructive text-destructive-foreground animate-pulse" :
                                      prediction.riskLevel === "Medium" ? "bg-orange-400" :
                                      "bg-green-500"
                                    )}
                                    title={`Predictive Factors:\n${prediction.reasons.join("\n")}`}
                                  >
                                    {prediction.score}% ({prediction.riskLevel})
                                  </span>
                                </TableCell>
                                <TableCell>{getStatusBadge(apt.status)}</TableCell>
                                <TableCell className="text-right">
                                  {apt.status !== "completed" && apt.status !== "cancelled" && (
                                    <div className="flex gap-2 justify-end">
                                      <Button size="sm" variant="outline" onClick={() => handleCompleteAppointment(apt._id)}>
                                        <CheckCircle2 className="h-4 w-4 mr-1" /> Finish
                                      </Button>
                                      <Button size="sm" variant="destructive" onClick={() => handleCancelAppt(apt._id)}>
                                        <XCircle className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>

                  <TabsContent value="history">
                    {appointments.filter(a => a.status === "completed" || a.status === "cancelled" || a.status === "no_show").length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No treated patients in your history.</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Patient ID</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Medical Records</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {appointments.filter(a => a.status === "completed" || a.status === "cancelled" || a.status === "no_show").map((apt) => {
                            const handleViewDetails = async () => {
                              try {
                                const record = await fetchAppointmentEMR(apt._id);
                                if (record) {
                                  setSelectedEmr(record);
                                  setIsViewEmrOpen(true);
                                  if (user) {
                                    await logAuditEvent(user.id, "doctor", "reveal_emr", record._id, `Doctor viewed EMR note for patient ID ${apt.patient_id}`);
                                  }
                                } else {
                                  toast.info("No EMR notes found for this appointment.");
                                }
                              } catch (e) {
                                toast.error("Failed to load EMR record");
                              }
                            };

                            return (
                              <TableRow key={apt._id}>
                                <TableCell className="whitespace-nowrap font-medium">{formatDate(apt.appointment_date)}</TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">{apt.patient_id as string}</TableCell>
                                <TableCell>{getStatusBadge(apt.status)}</TableCell>
                                <TableCell className="text-right">
                                  {apt.status === "completed" ? (
                                    <Button size="sm" variant="secondary" onClick={handleViewDetails}>
                                      <FilePlus className="h-4 w-4 mr-1" /> View EMR Note
                                    </Button>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">No EMR Notes</span>
                                  )}
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* EMR Dialog */}
            <Dialog open={isEmrOpen} onOpenChange={setIsEmrOpen}>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Patient EMR & Consultation Notes</DialogTitle>
                  <DialogDescription>Record patient vitals, diagnosis, and issue prescriptions.</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Blood Pressure</Label>
                      <Input placeholder="e.g. 120/80" value={emrData.bp} onChange={e => setEmrData({...emrData, bp: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Heart Rate (bpm)</Label>
                      <Input type="number" value={emrData.heartRate} onChange={e => setEmrData({...emrData, heartRate: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Weight (kg)</Label>
                      <Input type="number" value={emrData.weight} onChange={e => setEmrData({...emrData, weight: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Temperature (°C)</Label>
                      <Input type="number" step="0.1" value={emrData.temp} onChange={e => setEmrData({...emrData, temp: e.target.value})} />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Patient Symptoms</Label>
                    <Textarea placeholder="Reported symptoms..." value={emrData.symptoms} onChange={e => setEmrData({...emrData, symptoms: e.target.value})} rows={2} />
                  </div>

                  <div className="space-y-2">
                    <Label>Diagnosis</Label>
                    <Input placeholder="Medical diagnosis..." value={emrData.diagnosis} onChange={e => setEmrData({...emrData, diagnosis: e.target.value})} />
                  </div>

                  <div className="space-y-2">
                    <Label>Prescription</Label>
                    <Textarea placeholder="Medication, Dosage, Instructions..." value={emrData.prescription} onChange={e => setEmrData({...emrData, prescription: e.target.value})} rows={3} />
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setIsEmrOpen(false)}>Cancel</Button>
                  <Button onClick={submitEMR}>Save Medical Record</Button>
                </div>
              </DialogContent>
            </Dialog>

          </>
        )}
      </div>

      {/* View EMR Dialog */}
      <Dialog open={isViewEmrOpen} onOpenChange={setIsViewEmrOpen}>
        <DialogContent className="sm:max-w-[500px] bg-background border-border">
          <DialogHeader>
            <DialogTitle>View Patient EMR Note</DialogTitle>
            <DialogDescription>This medical record is decrypted locally for secure viewing.</DialogDescription>
          </DialogHeader>
          {selectedEmr && (
            <div className="space-y-4 py-4 text-sm text-foreground">
              <div className="grid grid-cols-2 gap-4 p-3 bg-muted rounded border border-border">
                <div>
                  <strong>Blood Pressure:</strong> {selectedEmr.vitals?.bloodPressure}
                </div>
                <div>
                  <strong>Heart Rate:</strong> {selectedEmr.vitals?.heartRate} bpm
                </div>
                <div>
                  <strong>Weight:</strong> {selectedEmr.vitals?.weight} kg
                </div>
                <div>
                  <strong>Temperature:</strong> {selectedEmr.vitals?.temperature} °C
                </div>
              </div>
              <div>
                <strong>Symptoms:</strong>
                <p className="text-muted-foreground mt-1">{selectedEmr.symptoms}</p>
              </div>
              <div>
                <strong>Diagnosis:</strong>
                <p className="text-muted-foreground mt-1 font-semibold text-primary">{selectedEmr.diagnosis}</p>
              </div>
              <div className="p-3 border rounded bg-muted">
                <strong>Prescription (Rx):</strong>
                <p className="mt-1 font-mono text-xs whitespace-pre-wrap">{selectedEmr.prescription}</p>
              </div>
              {selectedEmr.notes && (
                <div>
                  <strong>Additional Notes:</strong>
                  <p className="text-muted-foreground mt-1">{selectedEmr.notes}</p>
                </div>
              )}
            </div>
          )}
          <div className="flex justify-end">
            <Button onClick={() => setIsViewEmrOpen(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
      
      <MedinovaChatbot />
    </div>
  );
};

export default DoctorDashboard;
