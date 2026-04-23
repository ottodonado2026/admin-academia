import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, role }) {
  const admin =
    JSON.parse(localStorage.getItem("auth")) ||
    JSON.parse(localStorage.getItem("user"));

 let asesor = null;
try {
  asesor = JSON.parse(localStorage.getItem("asesorAuth"));
} catch {
  asesor = null;
}

  // 🔥 ASESOR
  if (role === "asesor") {
    return asesor ? children : <Navigate to="/login-asesor" />;
  }

  // 🔥 ADMIN / PROFESOR
  if (!admin) {
    return <Navigate to="/" replace />;
  }

  if (role && admin.role !== role) {
    if (admin.role === "profesor") {
      return <Navigate to="/panel-profesor" replace />;
    }
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}

export default ProtectedRoute;