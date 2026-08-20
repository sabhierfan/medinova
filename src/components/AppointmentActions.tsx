import { useState } from "react";
import { MoreVertical, Calendar, XCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { rescheduleAppointment, cancelAppointment, type Appointment } from "@/lib/dbService";

interface AppointmentActionsProps {
  appointment: Appointment;
  onSuccess: () => void;
}

export const AppointmentActions = ({ appointment, onSuccess }: AppointmentActionsProps) => {
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false);
  const [isCancelOpen, setIsCancelOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Reschedule state
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [rescheduleReason, setRescheduleReason] = useState("");

  // Cancel state
  const [cancelReason, setCancelReason] = useState("");

  const handleReschedule = async () => {
    if (!newDate || !newTime) {
      toast.error("Please provide new date and time");
      return;
    }

    if (!rescheduleReason.trim()) {
      toast.error("Please provide a reason for rescheduling");
      return;
    }

    try {
      setLoading(true);
      const newDateTime = `${newDate}T${newTime}:00`;
      
      await rescheduleAppointment(
        appointment._id,
        new Date(newDateTime).toISOString(),
        rescheduleReason,
        appointment.duration
      );

      toast.success("Appointment rescheduled successfully!");
      setIsRescheduleOpen(false);
      resetRescheduleForm();
      onSuccess();
    } catch (error: any) {
      console.error("Error rescheduling appointment:", error);
      toast.error(error.message || "Failed to reschedule appointment");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error("Please provide a reason for cancellation");
      return;
    }

    try {
      setLoading(true);
      
      await cancelAppointment(appointment._id, cancelReason, "patient");

      toast.success("Appointment cancelled successfully");
      setIsCancelOpen(false);
      resetCancelForm();
      onSuccess();
    } catch (error: any) {
      console.error("Error cancelling appointment:", error);
      toast.error(error.message || "Failed to cancel appointment");
    } finally {
      setLoading(false);
    }
  };

  const resetRescheduleForm = () => {
    setNewDate("");
    setNewTime("");
    setRescheduleReason("");
  };

  const resetCancelForm = () => {
    setCancelReason("");
  };

  // Only show actions for scheduled appointments
  if (appointment.status !== "scheduled") {
    return null;
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon">
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setIsRescheduleOpen(true)}>
            <Calendar className="h-4 w-4 mr-2" />
            Reschedule
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setIsCancelOpen(true)}
            className="text-destructive"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Cancel
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Reschedule Dialog */}
      <Dialog open={isRescheduleOpen} onOpenChange={setIsRescheduleOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Choose a new date and time for your appointment with Dr. {appointment.doctor?.name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-date">New Date *</Label>
              <Input
                id="new-date"
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="new-time">New Time *</Label>
              <Input
                id="new-time"
                type="time"
                value={newTime}
                onChange={(e) => setNewTime(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reschedule-reason">Reason for Rescheduling *</Label>
              <Textarea
                id="reschedule-reason"
                placeholder="Please explain why you need to reschedule..."
                value={rescheduleReason}
                onChange={(e) => setRescheduleReason(e.target.value)}
                rows={3}
                required
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRescheduleOpen(false);
                  resetRescheduleForm();
                }}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button onClick={handleReschedule} disabled={loading}>
                {loading ? "Rescheduling..." : "Confirm Reschedule"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Cancel Dialog */}
      <Dialog open={isCancelOpen} onOpenChange={setIsCancelOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancel Appointment</DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel your appointment with Dr. {appointment.doctor?.name}?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="cancel-reason">Reason for Cancellation *</Label>
              <Textarea
                id="cancel-reason"
                placeholder="Please explain why you need to cancel..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                required
              />
            </div>

            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setIsCancelOpen(false);
                  resetCancelForm();
                }}
                disabled={loading}
              >
                Keep Appointment
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancel}
                disabled={loading}
              >
                {loading ? "Cancelling..." : "Cancel Appointment"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

