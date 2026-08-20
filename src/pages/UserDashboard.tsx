import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { getCurrentUser } from "@/lib/localAuth";

const UserDashboard = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) {
      navigate("/login", { replace: true });
      return;
    }

    if (user.role === "doctor") {
      navigate("/doctor/dashboard", { replace: true });
    } else {
      navigate("/patient/dashboard", { replace: true });
    }
  }, [navigate]);

  return null;
};

export default UserDashboard;
