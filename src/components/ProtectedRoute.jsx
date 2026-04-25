import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, role }) {

  import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";

function ProtectedRoute({ children, role }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user);
      setLoading(false);
    };

    checkUser();
  }, []);

  if (loading) return null;

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;

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