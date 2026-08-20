import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Users, Calendar, Activity, Shield, LogOut, Settings, AlertCircle, CheckCircle2, XCircle, Trash2, Stethoscope, Mail, Phone, MapPin, BarChart3, TrendingUp, PieChart, Lock, Eye } from "lucide-react";
import { Bar, BarChart, Line, LineChart, Pie, PieChart as RePieChart, Area, AreaChart, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, Cell } from "recharts";

import { 
  fetchDoctors, fetchPatients, fetchAppointments, deleteDoctor, deletePatient, logAuditEvent, fetchAuditLogs, fetchAdminStats,
  Doctor, Patient, Appointment, AuditLog
} from "@/lib/dbService";
import { calculateNoShowRisk } from "@/lib/noShowPredictor";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import { MedinovaChatbot } from "@/components/MedinovaChatbot";
import { cn } from "@/lib/utils";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";


const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [autoAssignScheduling, setAutoAssignScheduling] = useState(true);
  const [maxAppointmentsPerDay, setMaxAppointmentsPerDay] = useState<number>(24);
  const [reminderLeadHours, setReminderLeadHours] = useState<number>(24);
  const [noShowThreshold, setNoShowThreshold] = useState<number>(15);

  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [showAppointments, setShowAppointments] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'scheduled' | 'completed' | 'cancelled'>('all');

  // Security Audit State
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Session Inactivity Logout
  useSessionTimeout(() => {
    toast.error("Logged out automatically due to inactivity for HIPAA compliance.");
    logout();
  });

  const loadData = async () => {
    try {
      setLoading(true);
      const [doctorsData, patientsData, appointmentsData, statsData, logs] = await Promise.all([
        fetchDoctors(),
        fetchPatients(),
        fetchAppointments(),
        fetchAdminStats(),
        fetchAuditLogs()
      ]);
      setDoctors(doctorsData);
      setPatients(patientsData);
      setAppointments(appointmentsData);
      setStats(statsData);
      setAuditLogs(logs);
      toast.success("Dashboard loaded with real Firebase data");
    } catch (error) {
      console.error("Error loading data:", error);
      toast.error("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) {
      navigate("/admin-login", { replace: true });
      return;
    }
    loadData();
    logAuditEvent("admin", "admin", "access_dashboard", "admin", "Admin accessed dashboard");

    const interval = setInterval(() => {
      loadData();
    }, 30000);
    return () => clearInterval(interval);
  }, [navigate]);

  const logout = async () => {
    await logAuditEvent("admin", "admin", "logout", "admin", "Admin logged out");
    localStorage.removeItem("admin_token");
    navigate("/admin-login", { replace: true });
  };

  const handleDeleteDoctor = async (id: string) => {
    try {
      await deleteDoctor(id);
      setDoctors(doctors.filter((d) => d._id !== id));
      toast.success("Doctor deleted");
      await logAuditEvent("admin", "admin", "delete_doctor", id, `Admin deleted doctor account with ID: ${id}`);
      loadData();
    } catch (error) {
      toast.error("Failed to delete doctor");
    }
  };

  const handleDeletePatient = async (id: string) => {
    try {
      await deletePatient(id);
      setPatients(patients.filter((p) => p._id !== id));
      toast.success("Patient deleted");
      await logAuditEvent("admin", "admin", "delete_patient", id, `Admin deleted patient account with ID: ${id}`);
      loadData();
    } catch (error) {
      toast.error("Failed to delete patient");
    }
  };

  const handleExportData = () => {
    const data = {
      doctors,
      patients,
      appointments,
      stats,
      exportDate: new Date().toISOString(),
    };
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `medinova-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Data exported successfully!");
  };

  const handleApplySettings = () => {
    const settings = {
      maintenanceMode,
      autoAssignScheduling,
      maxAppointmentsPerDay,
      reminderLeadHours,
      noShowThreshold,
      savedAt: new Date().toISOString(),
    };
    localStorage.setItem('admin_settings', JSON.stringify(settings));
    toast.success("Settings saved successfully!");
  };

  const handleViewAllUsers = () => {
    toast.info(`Total Users: ${doctors.length + patients.length} (${doctors.length} doctors, ${patients.length} patients)`);
  };

  const handleViewAppointments = () => {
    setShowAppointments(!showAppointments);
  };

  const getFilteredAppointments = () => {
    if (selectedFilter === 'all') return appointments;
    return appointments.filter(apt => apt.status === selectedFilter);
  };

  // Prepare chart data
  const appointmentsPerDoctor = doctors.map(doctor => {
    const doctorAppointments = appointments.filter(apt => {
      const doctorName = apt.doctor_name || (typeof apt.doctor_id === 'object' && apt.doctor_id?.name);
      return doctorName === doctor.name;
    });
    return {
      name: doctor.name.split(' ').slice(0, 2).join(' '), // Shorten name
      appointments: doctorAppointments.length,
      completed: doctorAppointments.filter(a => a.status === 'completed').length,
      scheduled: doctorAppointments.filter(a => a.status === 'scheduled').length,
    };
  }).sort((a, b) => b.appointments - a.appointments);

  // Appointment status distribution for pie chart
  const statusDistribution = [
    { name: 'Scheduled', value: appointments.filter(a => a.status === 'scheduled').length, color: '#3b82f6' },
    { name: 'Completed', value: appointments.filter(a => a.status === 'completed').length, color: '#10b981' },
    { name: 'Cancelled', value: appointments.filter(a => a.status === 'cancelled').length, color: '#ef4444' },
  ];

  // Appointments over time (last 30 days)
  const appointmentsTrend = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const dateStr = date.toISOString().split('T')[0];
    const dayAppointments = appointments.filter(apt => 
      new Date(apt.appointment_date).toISOString().split('T')[0] === dateStr
    );
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      appointments: dayAppointments.length,
      completed: dayAppointments.filter(a => a.status === 'completed').length,
      cancelled: dayAppointments.filter(a => a.status === 'cancelled').length,
    };
  });

  // Weekly appointment volume
  const weeklyVolume = Array.from({ length: 12 }, (_, i) => {
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - (11 - i) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 7);
    
    const weekAppointments = appointments.filter(apt => {
      const aptDate = new Date(apt.appointment_date);
      return aptDate >= weekStart && aptDate < weekEnd;
    });
    
    return {
      week: `Week ${12 - i}`,
      volume: weekAppointments.length,
    };
  });

  const chartConfig = {
    appointments: { label: "Appointments", color: "#3b82f6" },
    completed: { label: "Completed", color: "#10b981" },
    scheduled: { label: "Scheduled", color: "#f59e0b" },
    cancelled: { label: "Cancelled", color: "#ef4444" },
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-primary rounded-lg">
              <Shield className="h-6 w-6 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
              <Activity className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
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
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{stats?.totalUsers ?? 0}</div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">Appointments</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{stats?.totalAppointments ?? 0}</div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">Active Doctors</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">{stats?.activeDoctors ?? 0}</div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-foreground">No-show Predictions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-foreground">
                    {stats ? stats.noShowPredictions : "0"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Missed appointments total</p>
                </CardContent>
              </Card>
            </div>

            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="bg-muted">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="analytics">Analytics & Graphs</TabsTrigger>
                <TabsTrigger value="doctors">Manage Doctors</TabsTrigger>
                <TabsTrigger value="patients">Manage Patients</TabsTrigger>
                <TabsTrigger value="scheduling">Scheduling</TabsTrigger>
                <TabsTrigger value="security" className="flex items-center gap-1">
                  <Shield className="h-4 w-4" /> Security & Privacy Log
                </TabsTrigger>
              </TabsList>

              <TabsContent value="overview">
                <div className="space-y-6">
                  {/* Analytics Charts */}
                  <div className="grid lg:grid-cols-2 gap-6">
                    <Card className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-foreground">
                          <BarChart3 className="h-5 w-5" />
                          Appointment Status Distribution
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div>
                            <div className="flex justify-between mb-2">
                              <span className="text-sm font-medium">Scheduled</span>
                              <span className="text-sm text-muted-foreground">
                                {stats?.scheduledAppointments || 0} ({Math.round(((stats?.scheduledAppointments || 0) / (stats?.totalAppointments || 1)) * 100)}%)
                              </span>
                            </div>
                            <div className="h-3 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-blue-500" 
                                style={{ width: `${((stats?.scheduledAppointments || 0) / (stats?.totalAppointments || 1)) * 100}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between mb-2">
                              <span className="text-sm font-medium">Completed</span>
                              <span className="text-sm text-muted-foreground">
                                {stats?.completedAppointments || 0} ({Math.round(((stats?.completedAppointments || 0) / (stats?.totalAppointments || 1)) * 100)}%)
                              </span>
                            </div>
                            <div className="h-3 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-green-500" 
                                style={{ width: `${((stats?.completedAppointments || 0) / (stats?.totalAppointments || 1)) * 100}%` }}
                              />
                            </div>
                          </div>
                          <div>
                            <div className="flex justify-between mb-2">
                              <span className="text-sm font-medium">Cancelled</span>
                              <span className="text-sm text-muted-foreground">
                                {stats?.cancelledAppointments || 0} ({Math.round(((stats?.cancelledAppointments || 0) / (stats?.totalAppointments || 1)) * 100)}%)
                              </span>
                            </div>
                            <div className="h-3 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-red-500" 
                                style={{ width: `${((stats?.cancelledAppointments || 0) / (stats?.totalAppointments || 1)) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="bg-card border-border">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-foreground">
                          <Activity className="h-5 w-5" />
                          System Overview
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-3">
                              <Stethoscope className="h-5 w-5 text-blue-500" />
                              <span className="font-medium">Active Doctors</span>
                            </div>
                            <span className="text-2xl font-bold">{stats?.activeDoctors || 0}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-3">
                              <Users className="h-5 w-5 text-green-500" />
                              <span className="font-medium">Total Patients</span>
                            </div>
                            <span className="text-2xl font-bold">{(stats?.totalUsers || 0) - (stats?.activeDoctors || 0)}</span>
                          </div>
                          <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                            <div className="flex items-center gap-3">
                              <Calendar className="h-5 w-5 text-purple-500" />
                              <span className="font-medium">Total Appointments</span>
                            </div>
                            <span className="text-2xl font-bold">{stats?.totalAppointments || 0}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Quick Actions Grid */}
                  <div className="grid lg:grid-cols-3 gap-6">
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-foreground"><Settings className="h-5 w-5" /> Global Controls</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-foreground">Maintenance Mode</div>
                          <div className="text-sm text-muted-foreground">Temporarily disable user access</div>
                        </div>
                        <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-foreground">Auto-Assign Scheduling</div>
                          <div className="text-sm text-muted-foreground">Let system auto-assign optimal slots</div>
                        </div>
                        <Switch checked={autoAssignScheduling} onCheckedChange={setAutoAssignScheduling} />
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <Button variant="outline" onClick={() => toast.success("Cache cleared")}>Clear Cache</Button>
                        <Button variant="outline" onClick={() => toast.success("Data sync started")}>Sync Data</Button>
                        <Button variant="outline" onClick={() => toast.success("Indexes rebuilt")}>Rebuild Indexes</Button>
                        <Button variant="outline" onClick={() => toast.success("Backups initiated")}>Run Backup</Button>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="text-foreground">Quick Settings</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-foreground">Maintenance Mode</div>
                          <div className="text-sm text-muted-foreground">Disable user access</div>
                        </div>
                        <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
                      </div>
                      <Button className="w-full" onClick={handleApplySettings}>
                        Apply Settings
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="text-foreground">Manage Users</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm text-muted-foreground">Quick user management actions.</div>
                      <Button className="w-full" onClick={handleViewAllUsers}>View All</Button>
                      <Button className="w-full" variant="outline" onClick={() => toast.info(`Active users can be managed from Doctors/Patients tabs`)}>Deactivate User</Button>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="text-foreground">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="text-sm text-muted-foreground">Manage appointments and reports.</div>
                      <div className="grid grid-cols-2 gap-3">
                        <Button onClick={handleViewAppointments}>Appointments</Button>
                        <Button variant="outline" onClick={() => toast.info(`Total Appointments: ${appointments.length} | Completed: ${appointments.filter(a => a.status === 'completed').length}`)}>Reports</Button>
                        <Button variant="outline" onClick={handleExportData}>Export</Button>
                        <Button variant="outline" onClick={() => toast.info(`System logs: ${appointments.length} appointments tracked`)}>Logs</Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Appointments Quick View */}
              {showAppointments && (
                <Card className="mt-6 bg-card border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-foreground">
                        <Calendar className="h-5 w-5" />
                        All Appointments
                      </CardTitle>
                      <div className="flex gap-2">
                        <select 
                          value={selectedFilter} 
                          onChange={(e) => setSelectedFilter(e.target.value as any)}
                          className="px-3 py-1 rounded border border-border bg-background text-sm"
                        >
                          <option value="all">All Status</option>
                          <option value="scheduled">Scheduled</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                        <Button variant="outline" size="sm" onClick={() => setShowAppointments(false)}>
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Patient</TableHead>
                            <TableHead>Doctor</TableHead>
                            <TableHead>Date</TableHead>
                            <TableHead>Time</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Notes</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getFilteredAppointments().length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-muted-foreground">
                                No appointments found
                              </TableCell>
                            </TableRow>
                          ) : (
                            getFilteredAppointments().map((apt) => (
                              <TableRow key={apt._id}>
                                <TableCell className="font-medium">
                                  {apt.patient_name || 
                                   (typeof apt.patient_id === 'object' && apt.patient_id?.name) || 
                                   "Unknown Patient"}
                                </TableCell>
                                <TableCell>
                                  {apt.doctor_name || 
                                   (typeof apt.doctor_id === 'object' && apt.doctor_id?.name) || 
                                   "Unknown Doctor"}
                                </TableCell>
                                <TableCell>{new Date(apt.appointment_date).toLocaleDateString()}</TableCell>
                                <TableCell>
                                  {apt.start_time ? new Date(apt.start_time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : 
                                   new Date(apt.appointment_date).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={
                                    apt.status === 'completed' ? 'default' :
                                    apt.status === 'scheduled' ? 'secondary' :
                                    'destructive'
                                  }>
                                    {apt.status}
                                  </Badge>
                                </TableCell>
                                <TableCell className="max-w-xs truncate">
                                  {apt.notes || 'No notes'}
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                    <div className="mt-4 text-sm text-muted-foreground">
                      Showing {getFilteredAppointments().length} of {appointments.length} appointments
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="analytics">
              <div className="space-y-6">
                {/* Top Row - Main Charts */}
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Bar Chart - Appointments per Doctor */}
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-foreground">
                        <BarChart3 className="h-5 w-5 text-blue-500" />
                        Appointments by Doctor
                      </CardTitle>
                      <CardDescription>Total appointments handled by each doctor</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig} className="h-[300px] w-full">
                        <BarChart data={appointmentsPerDoctor}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend />
                          <Bar dataKey="completed" fill="#10b981" name="Completed" />
                          <Bar dataKey="scheduled" fill="#3b82f6" name="Scheduled" />
                        </BarChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  {/* Pie Chart - Status Distribution */}
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-foreground">
                        <PieChart className="h-5 w-5 text-purple-500" />
                        Appointment Status Distribution
                      </CardTitle>
                      <CardDescription>Breakdown of all appointment statuses</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig} className="h-[300px] w-full">
                        <RePieChart>
                          <Pie
                            data={statusDistribution}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value, percent }) => 
                              `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                            }
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {statusDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <ChartTooltip content={<ChartTooltipContent />} />
                        </RePieChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Middle Row - Trend Charts */}
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Line Chart - Daily Appointments Trend */}
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-foreground">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                        30-Day Appointment Trends
                      </CardTitle>
                      <CardDescription>Daily appointment activity over the last month</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig} className="h-[300px] w-full">
                        <LineChart data={appointmentsTrend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis 
                            dataKey="date" 
                            angle={-45} 
                            textAnchor="end" 
                            height={80}
                            interval={2}
                          />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Legend />
                          <Line 
                            type="monotone" 
                            dataKey="appointments" 
                            stroke="#3b82f6" 
                            strokeWidth={2}
                            name="Total"
                            dot={{ fill: '#3b82f6' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="completed" 
                            stroke="#10b981" 
                            strokeWidth={2}
                            name="Completed"
                            dot={{ fill: '#10b981' }}
                          />
                          <Line 
                            type="monotone" 
                            dataKey="cancelled" 
                            stroke="#ef4444" 
                            strokeWidth={2}
                            name="Cancelled"
                            dot={{ fill: '#ef4444' }}
                          />
                        </LineChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>

                  {/* Area Chart - Weekly Volume */}
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-foreground">
                        <Activity className="h-5 w-5 text-orange-500" />
                        12-Week Appointment Volume
                      </CardTitle>
                      <CardDescription>Weekly appointment volume trends</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ChartContainer config={chartConfig} className="h-[300px] w-full">
                        <AreaChart data={weeklyVolume}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="week" angle={-45} textAnchor="end" height={80} />
                          <YAxis />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Area 
                            type="monotone" 
                            dataKey="volume" 
                            stroke="#f59e0b" 
                            fill="#f59e0b" 
                            fillOpacity={0.6}
                            name="Appointments"
                          />
                        </AreaChart>
                      </ChartContainer>
                    </CardContent>
                  </Card>
                </div>

                {/* Bottom Row - Stats Summary Cards */}
                <div className="grid md:grid-cols-4 gap-6">
                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Total Appointments
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-foreground">
                        {appointments.length}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        All time appointments
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Completion Rate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-green-600">
                        {Math.round((appointments.filter(a => a.status === 'completed').length / appointments.length) * 100)}%
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Successfully completed
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Cancellation Rate
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-red-600">
                        {Math.round((appointments.filter(a => a.status === 'cancelled').length / appointments.length) * 100)}%
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Cancelled appointments
                      </p>
                    </CardContent>
                  </Card>

                  <Card className="bg-card border-border">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Avg per Doctor
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-3xl font-bold text-foreground">
                        {Math.round(appointments.length / doctors.length)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Appointments per doctor
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* Additional Insights */}
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="text-foreground">Key Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <div className="flex items-start gap-3">
                          <CheckCircle2 className="h-5 w-5 text-blue-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-foreground">
                              Top Performing Doctor
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {appointmentsPerDoctor[0]?.name} has handled {appointmentsPerDoctor[0]?.appointments} appointments
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex items-start gap-3">
                          <TrendingUp className="h-5 w-5 text-green-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-foreground">
                              Peak Appointment Day
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {appointmentsTrend.reduce((max, day) => day.appointments > max.appointments ? day : max, appointmentsTrend[0]).date} had the most appointments
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                        <div className="flex items-start gap-3">
                          <Users className="h-5 w-5 text-purple-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-foreground">
                              Patient Engagement
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {patients.length} active patients with {Math.round(appointments.length / patients.length)} appointments per patient
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-4 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
                        <div className="flex items-start gap-3">
                          <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                          <div>
                            <p className="font-medium text-foreground">
                              System Health
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              {Math.round((1 - (appointments.filter(a => a.status === 'cancelled').length / appointments.length)) * 100)}% appointment retention rate
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="doctors">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-foreground">
                          <Stethoscope className="h-5 w-5" />
                          Registered Doctors
                        </CardTitle>
                        <CardDescription>View all doctors who have registered in the system ({doctors.length} total)</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {doctors.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Stethoscope className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No doctors registered yet.</p>
                        <p className="text-sm mt-2">Doctors will appear here after they sign up.</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Specialization</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {doctors.map((doc) => (
                            <TableRow key={doc.id}>
                              <TableCell className="font-medium">{doc.name}</TableCell>
                              <TableCell>
                                {doc.email ? (
                                  <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    {doc.email}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>{doc.specialization}</TableCell>
                              <TableCell>
                                {doc.phone ? (
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    {doc.phone}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge variant={doc.active ? "secondary" : "destructive"}>{doc.active ? "Active" : "Inactive"}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button variant="destructive" size="sm" onClick={() => handleDeleteDoctor(doc._id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="patients">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-foreground">
                          <Users className="h-5 w-5" />
                          Registered Patients
                        </CardTitle>
                        <CardDescription>View all patients who have registered in the system ({patients.length} total)</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {patients.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No patients registered yet.</p>
                        <p className="text-sm mt-2">Patients will appear here after they sign up.</p>
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Phone</TableHead>
                            <TableHead>Age</TableHead>
                            <TableHead>Address</TableHead>
                            <TableHead>Visits</TableHead>
                            <TableHead>Last Visit</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {patients.map((pat) => (
                            <TableRow key={pat.id}>
                              <TableCell className="font-medium">{pat.name}</TableCell>
                              <TableCell>
                                {pat.email ? (
                                  <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    {pat.email}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {pat.phone ? (
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    {pat.phone}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>{pat.age ?? "—"}</TableCell>
                              <TableCell className="max-w-xs truncate">
                                {pat.address ? (
                                  <div className="flex items-center gap-2">
                                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                    {pat.address}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                              <TableCell>{pat.total_appointments ?? 0}</TableCell>
                              <TableCell>{pat.last_visit ? new Date(pat.last_visit).toLocaleDateString() : "—"}</TableCell>
                              <TableCell className="text-right">
                                <Button variant="destructive" size="sm" onClick={() => handleDeletePatient(pat._id)}>
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="scheduling">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2 text-foreground">
                          <Calendar className="h-5 w-5" />
                          Appointments & Scheduling
                        </CardTitle>
                        <CardDescription>View all appointments in the system ({appointments.length} total)</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {appointments.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Calendar className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No appointments scheduled yet.</p>
                        <p className="text-sm mt-2">Appointments will appear here after they are booked.</p>
                      </div>
                    ) : (
                      <div className="space-y-6">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date & Time</TableHead>
                              <TableHead>Patient</TableHead>
                              <TableHead>Doctor</TableHead>
                              <TableHead>Specialization</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Decision</TableHead>
                              <TableHead>Duration</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {appointments.slice(0, 50).map((apt) => (
                              <TableRow key={apt._id}>
                                <TableCell className="font-medium">
                                  {new Date(apt.appointment_date).toLocaleDateString()} <br />
                                  <span className="text-sm text-muted-foreground">
                                    {(apt.start_time ? new Date(apt.start_time) : new Date(apt.appointment_date)).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  {apt.patient_name || 
                                   (typeof apt.patient_id === 'object' && apt.patient_id?.name) || 
                                   "Unknown Patient"}
                                </TableCell>
                                <TableCell>
                                  {apt.doctor_name || 
                                   (typeof apt.doctor_id === 'object' && apt.doctor_id?.name) || 
                                   "Unknown Doctor"}
                                </TableCell>
                                <TableCell>
                                  {apt.doctor_specialization ||
                                   (typeof apt.doctor_id === 'object' && apt.doctor_id?.specialization) ||
                                   "N/A"}
                                </TableCell>
                                <TableCell>
                                  <Badge variant={
                                    apt.status === 'completed' ? 'secondary' :
                                    apt.status === 'scheduled' ? 'default' :
                                    apt.status === 'cancelled' ? 'destructive' :
                                    apt.status === 'no_show' ? 'destructive' :
                                    'outline'
                                  }>
                                    {apt.status}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge variant={
                                    apt.doctor_decision === 'accepted' ? 'secondary' :
                                    apt.doctor_decision === 'rejected' ? 'destructive' :
                                    'outline'
                                  }>
                                    {apt.doctor_decision || 'pending'}
                                  </Badge>
                                </TableCell>
                                <TableCell>{apt.duration} min</TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        
                        <div className="pt-6 border-t">
                          <CardTitle className="text-lg mb-4">Scheduling Policies</CardTitle>
                          <div className="grid md:grid-cols-3 gap-6">
                            <div className="space-y-2">
                              <Label htmlFor="max-per-day">Max Appointments/Day</Label>
                              <Input id="max-per-day" type="number" min={1} value={maxAppointmentsPerDay} onChange={(e) => setMaxAppointmentsPerDay(Number(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="reminder-hours">Reminder Lead (hours)</Label>
                              <Input id="reminder-hours" type="number" min={1} value={reminderLeadHours} onChange={(e) => setReminderLeadHours(Number(e.target.value))} />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="noshow-threshold">No-show Threshold (%)</Label>
                              <Input id="noshow-threshold" type="number" min={0} max={100} value={noShowThreshold} onChange={(e) => setNoShowThreshold(Number(e.target.value))} />
                            </div>
                          </div>
                          <div className="flex items-center justify-between mt-4">
                            <div>
                              <div className="font-medium text-foreground">Auto-Assign Scheduling</div>
                              <div className="text-sm text-muted-foreground">Optimize slot selection automatically</div>
                            </div>
                            <Switch checked={autoAssignScheduling} onCheckedChange={setAutoAssignScheduling} />
                          </div>
                          <div className="flex gap-3 mt-4">
                            <Button onClick={() => toast.success("Policies saved")}>Save Policies</Button>
                            <Button variant="outline" onClick={() => toast.info("Changes discarded")}>Reset</Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="security">
                <Card className="bg-card border-border">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-foreground">
                      <Shield className="h-5 w-5 text-primary" />
                      Security & Privacy Audit Log
                    </CardTitle>
                    <CardDescription>
                      HIPAA-compliant real-time access log stream tracking Electronic Medical Records (EMR) accesses, decryptions, and admin operations.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {auditLogs.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Lock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No security audit logs available.</p>
                      </div>
                    ) : (
                      <div className="border rounded-md overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted/50">
                            <TableRow>
                              <TableHead>Timestamp</TableHead>
                              <TableHead>User / Role</TableHead>
                              <TableHead>Action</TableHead>
                              <TableHead>Target ID</TableHead>
                              <TableHead>Details</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {auditLogs.map((log) => (
                              <TableRow key={log._id}>
                                <TableCell className="whitespace-nowrap font-mono text-xs">
                                  {new Date(log.createdAt).toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <div className="font-semibold text-xs text-foreground">{log.userId}</div>
                                  <Badge variant="outline" className="text-[10px] uppercase font-bold py-0 px-1.5 mt-0.5">
                                    {log.userRole}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge 
                                    className={cn(
                                      "text-xs text-white",
                                      log.action.includes("reveal") || log.action.includes("emr") 
                                        ? "bg-destructive" 
                                        : "bg-primary"
                                    )}
                                  >
                                    {log.action}
                                  </Badge>
                                </TableCell>
                                <TableCell className="font-mono text-[10px] text-muted-foreground">
                                  {log.targetId}
                                </TableCell>
                                <TableCell className="text-xs text-foreground">
                                  {log.details}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
      <MedinovaChatbot />
    </div>
  );
};

export default AdminDashboard;
