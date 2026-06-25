import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children, role }) {
  const allowedRoles = role ? (Array.isArray(role) ? role : [role]) : [];

  // 1. Bypass para profesores (autenticados vía localStorage)
  if (allowedRoles.includes("profesor")) {
    try {
      const localUser = JSON.parse(localStorage.getItem("user") || "null");
      if (localUser?.role === "profesor") {
        return children;
      }
    } catch (e) {
      console.error("Error leyendo sesión local de profesor:", e);
    }
  }

  // 2. Bypass para asesores (autenticados vía localStorage)
  if (allowedRoles.includes("asesor")) {
    try {
      const localAsesor = JSON.parse(localStorage.getItem("asesorAuth") || "null");
      if (localAsesor) {
        return children;
      }
    } catch (e) {
      console.error("Error leyendo sesión local de asesor:", e);
    }
  }

  const { user, role: userRole, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          width: "100%",
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#080b12",
          color: "white",
          fontSize: "18px",
          fontWeight: "700",
        }}
      >
        Cargando sesión...
      </div>
    );
  }

  // No autenticado
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // Verificación de roles (si se especificó un rol en la ruta)
  if (role) {
    // Los roles de alto nivel del panel de administración
    const isSuperUser = ["admin", "owner", "gerente"].includes(userRole);

    if (!allowedRoles.includes(userRole) && !isSuperUser) {
      console.warn(`Acceso denegado. Se requiere: ${allowedRoles}, Tienes: ${userRole}`);
      return <Navigate to="/" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;