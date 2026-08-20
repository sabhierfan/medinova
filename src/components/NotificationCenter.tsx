import { useState, useEffect } from "react";
import { Bell, Check, X, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useWebSocket } from "@/hooks/use-websocket";
import {
  fetchUserNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
  clearAllNotifications,
  type Notification,
} from "@/lib/dbService";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface NotificationCenterProps {
  userId: string;
  userRole: "patient" | "doctor" | "admin";
}

export const NotificationCenter = ({ userId }: NotificationCenterProps) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  
  const { notifications: wsNotifications, isConnected } = useWebSocket(userId);

  // Load notifications on mount
  useEffect(() => {
    loadNotifications();
    loadUnreadCount();
  }, [userId]);

  // Add WebSocket notifications to the list
  useEffect(() => {
    if (wsNotifications.length > 0) {
      setNotifications(prev => {
        const newNotifications = wsNotifications.filter(
          wsNotif => !prev.some(n => n.id === wsNotif.id)
        );
        return [...newNotifications, ...prev];
      });
      setUnreadCount(prev => prev + wsNotifications.length);
      
      // Show toast for new notifications
      wsNotifications.forEach(notif => {
        toast.info(notif.title, {
          description: notif.message,
        });
      });
    }
  }, [wsNotifications]);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const data = await fetchUserNotifications(userId, 50);
      setNotifications(data);
    } catch (error) {
      console.error("Error loading notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadUnreadCount = async () => {
    try {
      const count = await getUnreadNotificationCount(userId);
      setUnreadCount(count);
    } catch (error) {
      console.error("Error loading unread count:", error);
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    try {
      await markNotificationRead(notificationId);
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
      toast.error("Failed to mark notification as read");
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsRead(userId);
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      toast.success("All notifications marked as read");
    } catch (error) {
      console.error("Error marking all as read:", error);
      toast.error("Failed to mark all notifications as read");
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllNotifications(userId);
      setNotifications([]);
      setUnreadCount(0);
      toast.success("All notifications cleared");
    } catch (error) {
      console.error("Error clearing notifications:", error);
      toast.error("Failed to clear notifications");
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "appointment_confirmation":
        return "✅";
      case "appointment_reminder":
        return "⏰";
      case "appointment_cancelled":
        return "❌";
      case "appointment_rescheduled":
        return "🔄";
      case "appointment_completed":
        return "✔️";
      default:
        return "📋";
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
          {isConnected && (
            <span className="absolute bottom-0 right-0 h-2 w-2 bg-green-500 rounded-full" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {notifications.length > 0 && (
            <div className="flex gap-1">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="h-6 text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Read all
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearAll}
                className="h-6 text-xs"
              >
                <Trash2 className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No notifications</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                className={`flex items-start gap-3 p-3 cursor-pointer ${
                  !notification.read ? "bg-muted/50" : ""
                }`}
                onClick={() => !notification.read && handleMarkAsRead(notification.id)}
              >
                <span className="text-xl">{getNotificationIcon(notification.type)}</span>
                <div className="flex-1 space-y-1">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-none">
                      {notification.title}
                    </p>
                    {!notification.read && (
                      <Badge variant="default" className="h-2 w-2 p-0 rounded-full" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {notification.message}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {notification.createdAt &&
                      formatDistanceToNow(new Date(notification.createdAt), {
                        addSuffix: true,
                      })}
                  </p>
                </div>
              </DropdownMenuItem>
            ))
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

