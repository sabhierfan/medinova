import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  downloadAnalyticsReport,
  fetchAnalyticsAppointments,
  fetchAnalyticsOverview,
  fetchAppointmentTrends,
  fetchDoctorPerformance,
  type AnalyticsOverview,
  type AppointmentTrendsResponse,
  type DoctorPerformanceRow,
  type AnalyticsAppointmentRow,
} from "@/lib/dbService";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Activity, ArrowLeft, BarChart3, Download, FileSpreadsheet, FileText, RefreshCw } from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const DEFAULT_PRESET = "30d";

function downloadBlob(blob: Blob, filename: string) {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

const AnalyticsDashboard = () => {
  const navigate = useNavigate();

  const [preset, setPreset] = useState<string>(DEFAULT_PRESET);
  const [bucket, setBucket] = useState<"day" | "week">("day");

  const [overview, setOverview] = useState<AnalyticsOverview | null>(null);
  const [trends, setTrends] = useState<AppointmentTrendsResponse | null>(null);

  const [loading, setLoading] = useState(false);

  // Doctor performance table state
  const [docQ, setDocQ] = useState("");
  const [docPage, setDocPage] = useState(1);
  const [docSortBy, setDocSortBy] = useState("appointmentsSeen");
  const [docSortDir, setDocSortDir] = useState<"asc" | "desc">("desc");
  const [doctorPerf, setDoctorPerf] = useState<{ page: number; pageSize: number; total: number; data: DoctorPerformanceRow[] } | null>(null);

  // Appointments table state
  const [apptQ, setApptQ] = useState("");
  const [apptStatus, setApptStatus] = useState<string>("all");
  const [apptPage, setApptPage] = useState(1);
  const [apptSortBy, setApptSortBy] = useState("appointment_date");
  const [apptSortDir, setApptSortDir] = useState<"asc" | "desc">("desc");
  const [appointments, setAppointments] = useState<{ page: number; pageSize: number; total: number; data: AnalyticsAppointmentRow[] } | null>(null);

  const pageSize = 20;

  const loadAll = async () => {
    try {
      setLoading(true);
      const [ov, tr] = await Promise.all([
        fetchAnalyticsOverview({ preset }),
        fetchAppointmentTrends({ preset, bucket }),
      ]);
      setOverview(ov);
      setTrends(tr);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load analytics. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const loadDoctorPerf = async () => {
    try {
      const res = await fetchDoctorPerformance({
        preset,
        page: docPage,
        pageSize,
        sortBy: docSortBy,
        sortDir: docSortDir,
        q: docQ || undefined,
      });
      setDoctorPerf(res);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load doctor performance.");
    }
  };

  const loadAppointments = async () => {
    try {
      const res = await fetchAnalyticsAppointments({
        preset,
        page: apptPage,
        pageSize,
        sortBy: apptSortBy,
        sortDir: apptSortDir,
        status: apptStatus === "all" ? undefined : apptStatus,
        q: apptQ || undefined,
      });
      setAppointments(res);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load appointments table.");
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("admin_token");
    if (!token) navigate("/admin-login", { replace: true });
  }, [navigate]);

  useEffect(() => {
    // Reset paging when changing range/bucket
    setDocPage(1);
    setApptPage(1);
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, bucket]);

  useEffect(() => {
    loadDoctorPerf();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, docPage, docSortBy, docSortDir]);

  useEffect(() => {
    loadAppointments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preset, apptPage, apptSortBy, apptSortDir, apptStatus]);

  const appointmentTrendData = trends?.appointments || [];
  const patientVisitData = trends?.patientVisits || [];
  const peakHoursData = overview?.flow.peakHours || [];
  const departmentsData = overview?.topDepartments || [];
  const workloadData = overview?.doctorWorkloadTop || [];

  const statusBadgeVariant = useMemo(() => {
    return (status: string) => {
      if (status === "completed") return "secondary";
      if (status === "cancelled") return "destructive";
      if (status === "no_show") return "outline";
      return "default";
    };
  }, []);

  const toggleDocSort = (key: string) => {
    if (docSortBy === key) setDocSortDir(docSortDir === "asc" ? "desc" : "asc");
    else {
      setDocSortBy(key);
      setDocSortDir("desc");
    }
  };

  const toggleApptSort = (key: string) => {
    if (apptSortBy === key) setApptSortDir(apptSortDir === "asc" ? "desc" : "asc");
    else {
      setApptSortBy(key);
      setApptSortDir("desc");
    }
  };

  const exportPdf = async () => {
    try {
      toast.message("Generating PDF…");
      const blob = await downloadAnalyticsReport({ preset, bucket, format: "pdf" });
      downloadBlob(blob, `medinova-analytics-${preset}.pdf`);
      toast.success("PDF downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export PDF.");
    }
  };

  const exportExcel = async () => {
    try {
      toast.message("Generating Excel…");
      const blob = await downloadAnalyticsReport({ preset, bucket, format: "xlsx" });
      downloadBlob(blob, `medinova-analytics-${preset}.xlsx`);
      toast.success("Excel downloaded");
    } catch (err) {
      console.error(err);
      toast.error("Failed to export Excel.");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate("/admin/dashboard")}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="p-2 bg-primary rounded-lg">
              <BarChart3 className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <div className="text-xl font-bold text-foreground">Analytics & Visualization</div>
              <div className="text-sm text-muted-foreground">Medical Data Analytics (Module 4)</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex items-center gap-2">
              <Select value={preset} onValueChange={setPreset}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                  <SelectItem value="365d">Last 12 months</SelectItem>
                </SelectContent>
              </Select>

              <Select value={bucket} onValueChange={(v) => setBucket(v as any)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Bucket" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button variant="outline" size="sm" onClick={loadAll} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={exportPdf}>
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button variant="outline" size="sm" onClick={exportExcel}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Excel
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {loading && (
          <div className="mb-4 p-3 rounded-lg border border-border bg-muted/30 flex items-center gap-2 text-muted-foreground">
            <Activity className="h-4 w-4 animate-spin" />
            Loading analytics…
          </div>
        )}

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Total Appointments</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">{overview?.totals.appointments ?? 0}</div>
              <div className="text-xs text-muted-foreground mt-2">Range: {preset}</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Completion Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {overview ? `${Math.round(overview.rates.completionRate * 100)}%` : "0%"}
              </div>
              <div className="text-xs text-muted-foreground mt-2">{overview?.totals.completed ?? 0} completed</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Cancellation Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {overview ? `${Math.round(overview.rates.cancellationRate * 100)}%` : "0%"}
              </div>
              <div className="text-xs text-muted-foreground mt-2">{overview?.totals.cancelled ?? 0} cancelled</div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-foreground">Missed / No-show</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground">
                {overview ? `${Math.round(overview.rates.noShowRate * 100)}%` : "0%"}
              </div>
              <div className="text-xs text-muted-foreground mt-2">{overview?.totals.no_show ?? 0} no-shows</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="trends" className="space-y-6">
          <TabsList className="bg-muted">
            <TabsTrigger value="trends">Trends</TabsTrigger>
            <TabsTrigger value="workload">Workload</TabsTrigger>
            <TabsTrigger value="departments">Departments</TabsTrigger>
            <TabsTrigger value="doctor-performance">Doctor Performance</TabsTrigger>
            <TabsTrigger value="appointments">Appointments Table</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
          </TabsList>

          <TabsContent value="trends">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Appointment Trends ({bucket})</CardTitle>
                </CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={appointmentTrendData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="completed" stroke="#22c55e" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="cancelled" stroke="#ef4444" strokeWidth={2} dot={false} />
                      <Line type="monotone" dataKey="no_show" stroke="#a855f7" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Patient Visit History Trends</CardTitle>
                </CardHeader>
                <CardContent className="h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={patientVisitData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Area type="monotone" dataKey="uniquePatients" stroke="#22c55e" fill="#22c55e33" />
                      <Area type="monotone" dataKey="visits" stroke="#3b82f6" fill="#3b82f633" />
                    </AreaChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-card border-border lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-foreground">Peak Hours Analysis</CardTitle>
                </CardHeader>
                <CardContent className="h-[260px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={peakHoursData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="hour" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="total" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="workload">
            <Card className="bg-card border-border">
              <CardHeader>
                <CardTitle className="text-foreground">Doctor Workload (Top 10)</CardTitle>
              </CardHeader>
              <CardContent className="h-[360px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workloadData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="doctorName" tick={{ fontSize: 12 }} interval={0} angle={-15} height={60} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="total" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="departments">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Top Medical Departments</CardTitle>
                </CardHeader>
                <CardContent className="h-[360px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Tooltip />
                      <Legend />
                      <Pie data={departmentsData} dataKey="total" nameKey="department" cx="50%" cy="50%" outerRadius={120} fill="#3b82f6" />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Healthcare Flow Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-4 rounded-lg border border-border">
                    <div className="text-sm text-muted-foreground">Patient Throughput (avg completed/day)</div>
                    <div className="text-2xl font-bold text-foreground">
                      {(overview?.flow.patientThroughputPerDay ?? 0).toFixed(1)}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border border-border">
                    <div className="text-sm text-muted-foreground">Missed Appointments</div>
                    <div className="text-2xl font-bold text-foreground">
                      {overview ? `${overview.flow.missedAppointments.count} (${Math.round(overview.flow.missedAppointments.rate * 100)}%)` : "0"}
                    </div>
                  </div>
                  <div className="p-4 rounded-lg border border-border">
                    <div className="text-sm text-muted-foreground">Doctors / Patients</div>
                    <div className="text-2xl font-bold text-foreground">
                      {(overview?.totals.doctors ?? 0)} / {(overview?.totals.patients ?? 0)}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="doctor-performance">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <CardTitle className="text-foreground">Doctor Performance Overview</CardTitle>
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="Search doctor…"
                      value={docQ}
                      onChange={(e) => setDocQ(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setDocPage(1);
                          loadDoctorPerf();
                        }
                      }}
                      className="w-[220px]"
                    />
                    <Button variant="outline" size="sm" onClick={() => { setDocPage(1); loadDoctorPerf(); }}>
                      <Download className="h-4 w-4 mr-2" />
                      Apply
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer" onClick={() => toggleDocSort("doctorName")}>Doctor</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => toggleDocSort("appointmentsSeen")}>Appointments Seen</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => toggleDocSort("avgConsultationTimeMinutes")}>Avg Consult (min)</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => toggleDocSort("cancellationRate")}>Cancellation Rate</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => toggleDocSort("noShowRate")}>No-show Rate</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(doctorPerf?.data || []).map((r) => (
                      <TableRow key={r.doctorId}>
                        <TableCell className="font-medium">{r.doctorName}</TableCell>
                        <TableCell>{r.specialization}</TableCell>
                        <TableCell>{r.appointmentsSeen}</TableCell>
                        <TableCell>{r.avgConsultationTimeMinutes.toFixed(1)}</TableCell>
                        <TableCell>{Math.round(r.cancellationRate * 100)}%</TableCell>
                        <TableCell>{Math.round(r.noShowRate * 100)}%</TableCell>
                      </TableRow>
                    ))}
                    {(!doctorPerf || doctorPerf.data.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No results.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    {doctorPerf ? `Showing ${(doctorPerf.page - 1) * doctorPerf.pageSize + 1}-${Math.min(doctorPerf.page * doctorPerf.pageSize, doctorPerf.total)} of ${doctorPerf.total}` : ""}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={docPage <= 1} onClick={() => setDocPage((p) => Math.max(1, p - 1))}>
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!doctorPerf || doctorPerf.page * doctorPerf.pageSize >= doctorPerf.total}
                      onClick={() => setDocPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="appointments">
            <Card className="bg-card border-border">
              <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <CardTitle className="text-foreground">Appointments (Table)</CardTitle>
                  <div className="flex items-center gap-2">
                    <Select value={apptStatus} onValueChange={setApptStatus}>
                      <SelectTrigger className="w-[160px]">
                        <SelectValue placeholder="Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="no_show">No-show</SelectItem>
                        <SelectItem value="rescheduled">Rescheduled</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Search doctor/patient…"
                      value={apptQ}
                      onChange={(e) => setApptQ(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setApptPage(1);
                          loadAppointments();
                        }
                      }}
                      className="w-[220px]"
                    />
                    <Button variant="outline" size="sm" onClick={() => { setApptPage(1); loadAppointments(); }}>
                      <Download className="h-4 w-4 mr-2" />
                      Apply
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer" onClick={() => toggleApptSort("appointment_date")}>Date</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => toggleApptSort("start_time")}>Time</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Patient</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => toggleApptSort("duration")}>Duration</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => toggleApptSort("status")}>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(appointments?.data || []).map((a) => (
                      <TableRow key={a.id}>
                        <TableCell>{new Date(a.appointment_date).toLocaleDateString()}</TableCell>
                        <TableCell>{new Date(a.start_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</TableCell>
                        <TableCell>
                          <div className="font-medium">{a.doctor?.name || "—"}</div>
                          <div className="text-xs text-muted-foreground">{a.doctor?.specialization || ""}</div>
                        </TableCell>
                        <TableCell>{a.patient?.name || "—"}</TableCell>
                        <TableCell>{a.duration}m</TableCell>
                        <TableCell>
                          <Badge variant={statusBadgeVariant(a.status)} className="capitalize">
                            {a.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!appointments || appointments.data.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground">
                          No results.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>

                <div className="flex items-center justify-between mt-4">
                  <div className="text-sm text-muted-foreground">
                    {appointments ? `Showing ${(appointments.page - 1) * appointments.pageSize + 1}-${Math.min(appointments.page * appointments.pageSize, appointments.total)} of ${appointments.total}` : ""}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={apptPage <= 1} onClick={() => setApptPage((p) => Math.max(1, p - 1))}>
                      Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!appointments || appointments.page * appointments.pageSize >= appointments.total}
                      onClick={() => setApptPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="reports">
            <div className="grid lg:grid-cols-2 gap-6">
              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">Exportable Reports</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm text-muted-foreground">
                    Download a PDF or Excel report for the selected time range ({preset}) and aggregation bucket ({bucket}).
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={exportPdf}>
                      <FileText className="h-4 w-4 mr-2" />
                      Export PDF
                    </Button>
                    <Button variant="outline" onClick={exportExcel}>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Export Excel
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card border-border">
                <CardHeader>
                  <CardTitle className="text-foreground">What’s Included</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground space-y-2">
                  <div>- Daily/weekly appointment trends</div>
                  <div>- Patient visit history trends</div>
                  <div>- Doctor workload + performance overview</div>
                  <div>- Peak hours + missed appointments</div>
                  <div>- Top departments</div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;


