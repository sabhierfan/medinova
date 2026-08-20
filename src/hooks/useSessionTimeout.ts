import { useEffect, useRef } from "react";

/**
 * Custom hook to detect user inactivity and trigger a callback (e.g., auto logout).
 * @param onTimeout Callback function triggered when session times out.
 * @param timeoutMs Timeout duration in milliseconds (default: 5 minutes / 300,000ms).
 */
export const useSessionTimeout = (onTimeout: () => void, timeoutMs: number = 300000) => {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      onTimeout();
    }, timeoutMs);
  };

  useEffect(() => {
    // Activity events to monitor
    const events = ["mousemove", "keydown", "mousedown", "scroll", "touchstart"];

    // Initialize timer
    resetTimer();

    // Set up event listeners
    const handleActivity = () => resetTimer();
    events.forEach((event) => {
      window.addEventListener(event, handleActivity);
    });

    // Cleanup
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      events.forEach((event) => {
        window.removeEventListener(event, handleActivity);
      });
    };
  }, [onTimeout, timeoutMs]);
};
