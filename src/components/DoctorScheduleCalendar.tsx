import { useState, useEffect } from "react";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday, parseISO } from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, User, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { getDoctorSchedule, type Appointment, type Doctor } from "@/lib/dbService";

interface DoctorScheduleCalendarProps {
  doctor: Doctor;
  onAppointmentClick?: (appointment: Appointment) => void;
}

export const DoctorScheduleCalendar = ({ doctor, onAppointmentClick }: DoctorScheduleCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    loadSchedule();
  }, [currentDate, doctor.id]);

  const loadSchedule = async () => {
    try {
      setLoading(true);
      const startDate = format(weekStart, "yyyy-MM-dd");
      const endDate = format(weekEnd, "yyyy-MM-dd");
      const result = await getDoctorSchedule(doctor._id, startDate, endDate);
      setAppointments(result.appointments);
    } catch (error) {
      console.error("Error loading schedule:", error);
      toast.error("Failed to load schedule");
    } finally {
      setLoading(false);
    }
  };

  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter(apt => {
      const aptDate = parseISO(apt.start_time);
      return isSameDay(aptDate, day);
    }).sort((a, b) => {
      return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
    });
  };

  const previousWeek = () => {
    setCurrentDate(prev => addDays(prev, -7));
  };

  const nextWeek = () => {
    setCurrentDate(prev => addDays(prev, 7));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return "bg-blue-500";
      case "completed":
        return "bg-green-500";
      case "cancelled":
        return "bg-red-500";
      case "rescheduled":
        return "bg-yellow-500";
      case "no_show":
        return "bg-gray-500";
      default:
        return "bg-gray-500";
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === "completed" ? "secondary" : status === "cancelled" ? "destructive" : "default";
    return <Badge variant={variant as any}>{status}</Badge>;
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5" />
                Weekly Schedule
              </CardTitle>
              <CardDescription>
                Your appointments for the week
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={previousWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-[200px] text-center">
                {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
              </span>
              <Button variant="outline" size="sm" onClick={nextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading schedule...
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-3">
              {weekDays.map((day) => {
                const dayAppointments = getAppointmentsForDay(day);
                const isTodayDate = isToday(day);

                return (
                  <div
                    key={day.toISOString()}
                    className={`border rounded-lg p-3 min-h-[200px] ${
                      isTodayDate ? "border-primary bg-primary/5" : ""
                    }`}
                  >
                    <div className="text-center mb-3">
                      <div className="text-xs font-medium text-muted-foreground">
                        {format(day, "EEE")}
                      </div>
                      <div className={`text-2xl font-bold ${isTodayDate ? "text-primary" : ""}`}>
                        {format(day, "d")}
                      </div>
                      {isTodayDate && (
                        <Badge variant="default" className="mt-1 text-xs">
                          Today
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2">
                      {dayAppointments.length === 0 ? (
                        <div className="text-xs text-center text-muted-foreground py-4">
                          No appointments
                        </div>
                      ) : (
                        dayAppointments.map((apt) => (
                          <button
                            key={apt._id}
                            className="w-full text-left p-2 rounded border hover:border-primary hover:bg-primary/5 transition-colors"
                            onClick={() => {
                              setSelectedAppointment(apt);
                              onAppointmentClick?.(apt);
                            }}
                          >
                            <div className="flex items-center gap-1 mb-1">
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(apt.status)}`} />
                              <span className="text-xs font-medium">
                                {format(parseISO(apt.start_time), "HH:mm")}
                              </span>
                            </div>
                            <div className="text-xs font-medium truncate">
                              {apt.patient?.name || "Unknown"}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {apt.duration} min
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appointment Details Dialog */}
      <Dialog open={!!selectedAppointment} onOpenChange={() => setSelectedAppointment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Appointment Details</DialogTitle>
          </DialogHeader>
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Status:</span>
                {getStatusBadge(selectedAppointment.status)}
              </div>
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">
                    {selectedAppointment.patient?.name || "Unknown Patient"}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {selectedAppointment.patient?.email}
                  </div>
                  {selectedAppointment.patient?.phone && (
                    <div className="text-sm text-muted-foreground">
                      {selectedAppointment.patient.phone}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <div className="font-medium">
                    {format(parseISO(selectedAppointment.start_time), "EEEE, MMMM d, yyyy")}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {format(parseISO(selectedAppointment.start_time), "HH:mm")} -{" "}
                    {format(parseISO(selectedAppointment.end_time), "HH:mm")} ({selectedAppointment.duration} minutes)
                  </div>
                </div>
              </div>
              {selectedAppointment.notes && (
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
                  <div>
                    <div className="font-medium text-sm mb-1">Notes:</div>
                    <div className="text-sm text-muted-foreground">
                      {selectedAppointment.notes}
                    </div>
                  </div>
                </div>
              )}
              {selectedAppointment.cancellation_reason && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                  <div className="font-medium text-sm mb-1">Cancellation Reason:</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedAppointment.cancellation_reason}
                  </div>
                  {selectedAppointment.cancelled_by && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Cancelled by: {selectedAppointment.cancelled_by}
                    </div>
                  )}
                </div>
              )}
              {selectedAppointment.reschedule_reason && (
                <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                  <div className="font-medium text-sm mb-1">Reschedule Reason:</div>
                  <div className="text-sm text-muted-foreground">
                    {selectedAppointment.reschedule_reason}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

