import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AppointmentCalendar } from "./AppointmentCalendar";
import { bookAppointment, type Doctor, type Patient } from "@/lib/dbService";
import { toast } from "sonner";
import { format } from "date-fns";

interface EnhancedAppointmentBookingProps {
  isOpen: boolean;
  onClose: () => void;
  doctor: Doctor;
  patient: Patient;
  onSuccess: () => void;
}

export const EnhancedAppointmentBooking = ({
  isOpen,
  onClose,
  doctor,
  patient,
  onSuccess,
}: EnhancedAppointmentBookingProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSelectSlot = (date: Date, time: string) => {
    setSelectedDate(date);
    setSelectedTime(time);
  };

  const handleBookAppointment = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error("Please select a date and time");
      return;
    }

    try {
      setLoading(true);

      // Combine date and time
      const [hours, minutes] = selectedTime.split(":").map(Number);
      const appointmentDateTime = new Date(selectedDate);
      appointmentDateTime.setHours(hours, minutes, 0, 0);

      await bookAppointment({
        patient_id: patient._id,
        doctor_id: doctor._id,
        appointment_date: appointmentDateTime.toISOString(),
        duration: 30, // Default 30 minutes
        notes: notes || undefined,
        status: "scheduled",
      });

      toast.success("Appointment request sent! Waiting for doctor approval.");
      onSuccess();
      handleClose();
    } catch (error: any) {
      console.error("Error booking appointment:", error);
      toast.error(error.message || "Failed to book appointment");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedDate(null);
    setSelectedTime(null);
    setNotes("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book Appointment with Dr. {doctor.name}</DialogTitle>
          <DialogDescription>
            {doctor.specialization} • Select your preferred date and time
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <AppointmentCalendar
            doctor={doctor}
            onSelectSlot={handleSelectSlot}
            selectedDate={selectedDate || undefined}
            selectedTime={selectedTime || undefined}
          />

          <div className="space-y-2">
            <Label htmlFor="notes">Additional Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any specific concerns or symptoms you'd like to mention..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleBookAppointment}
              disabled={!selectedDate || !selectedTime || loading}
            >
              {loading ? "Booking..." : "Confirm Booking"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

