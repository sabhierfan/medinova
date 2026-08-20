import { useState, useEffect } from "react";
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from "date-fns";
import { Calendar as CalendarIcon, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { getAvailableSlots, type Doctor } from "@/lib/dbService";

interface AppointmentCalendarProps {
  doctor: Doctor;
  onSelectSlot: (date: Date, time: string) => void;
  selectedDate?: Date;
  selectedTime?: string;
}

export const AppointmentCalendar = ({ 
  doctor, 
  onSelectSlot, 
  selectedDate: propSelectedDate,
  selectedTime: propSelectedTime 
}: AppointmentCalendarProps) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(propSelectedDate || null);
  const [selectedTime, setSelectedTime] = useState<string | null>(propSelectedTime || null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 }); // Sunday
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  // Load available slots when a date is selected
  useEffect(() => {
    if (selectedDate) {
      loadAvailableSlots(selectedDate);
    }
  }, [selectedDate, doctor.id]);

  const loadAvailableSlots = async (date: Date) => {
    try {
      setLoading(true);
      const dateStr = format(date, "yyyy-MM-dd");
      const result = await getAvailableSlots(doctor._id, dateStr);
      setAvailableSlots(result.available_slots);
    } catch (error) {
      console.error("Error loading slots:", error);
      toast.error("Failed to load available time slots");
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date: Date) => {
    // Don't allow past dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    
    if (checkDate < today) {
      toast.error("Cannot book appointments in the past");
      return;
    }

    setSelectedDate(date);
    setSelectedTime(null);
  };

  const handleTimeSelect = (time: string) => {
    if (!selectedDate) return;
    
    setSelectedTime(time);
    onSelectSlot(selectedDate, time);
  };

  const previousWeek = () => {
    setCurrentDate(prev => addDays(prev, -7));
  };

  const nextWeek = () => {
    setCurrentDate(prev => addDays(prev, 7));
  };

  const isPastDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(date);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
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
                Select Date & Time
              </CardTitle>
              <CardDescription>
                Book an appointment with Dr. {doctor.name}
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
          {/* Week Days */}
          <div className="grid grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isPast = isPastDate(day);
              const isTodayDate = isToday(day);

              return (
                <Button
                  key={day.toISOString()}
                  variant={isSelected ? "default" : "outline"}
                  className={`h-20 flex flex-col items-center justify-center ${
                    isPast ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                  onClick={() => !isPast && handleDateSelect(day)}
                  disabled={isPast}
                >
                  <span className="text-xs font-medium">
                    {format(day, "EEE")}
                  </span>
                  <span className="text-2xl font-bold mt-1">
                    {format(day, "d")}
                  </span>
                  {isTodayDate && (
                    <Badge variant="secondary" className="mt-1 text-xs py-0">
                      Today
                    </Badge>
                  )}
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Available Time Slots */}
      {selectedDate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Available Time Slots
            </CardTitle>
            <CardDescription>
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Loading available slots...
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No available time slots for this date</p>
                <p className="text-sm mt-2">Please select another date</p>
              </div>
            ) : (
              <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
                {availableSlots.map((slot) => {
                  const isSelected = selectedTime === slot;

                  return (
                    <Button
                      key={slot}
                      variant={isSelected ? "default" : "outline"}
                      className="h-12"
                      onClick={() => handleTimeSelect(slot)}
                    >
                      {slot}
                    </Button>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Selected Appointment Summary */}
      {selectedDate && selectedTime && (
        <Card className="border-primary">
          <CardHeader>
            <CardTitle className="text-lg">Selected Appointment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Doctor:</span>
                <span className="font-medium">Dr. {doctor.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Specialization:</span>
                <span className="font-medium">{doctor.specialization}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Date:</span>
                <span className="font-medium">{format(selectedDate, "EEEE, MMMM d, yyyy")}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Time:</span>
                <span className="font-medium">{selectedTime}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

