import { Navigate, Outlet, useLocation } from "react-router-dom";

const ProtectedAdminRoute = () => {
  const location = useLocation();
  const token = typeof window !== "undefined" ? localStorage.getItem("admin_token") : null;

  if (!token) {
    return <Navigate to="/admin-login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedAdminRoute;




