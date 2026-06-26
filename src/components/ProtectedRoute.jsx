import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children, role }) {
  const { user, role: userRole, loading } = useAuth();
  const allowedRoles = role ? (Array.isArray(role) ? role : [role]) : [];

  // 1. Bypass para profesores (autenticados vía localStorage)
  let isProfesorBypass = false;
  if (allowedRoles.includes("profesor")) {
    try {
      const localUser = JSON.parse(localStorage.getItem("user") || "null");
      if (localUser?.role === "profesor") {
        isProfesorBypass = true;
      }
    } catch (e) {
      console.error("Error leyendo sesión local de profesor:", e);
    }
  }

  // 2. Bypass para asesores (autenticados vía localStorage)
  let isAsesorBypass = false;
  if (allowedRoles.includes("asesor")) {
    try {
      const localAsesor = JSON.parse(localStorage.getItem("asesorAuth") || "null");
      if (localAsesor) {
        isAsesorBypass = true;
      }
    } catch (e) {
      console.error("Error leyendo sesión local de asesor:", e);
    }
  }

  if (isProfesorBypass || isAsesorBypass) {
    return children;
  }

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