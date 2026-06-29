import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children, role }) {
  const { user, role: userRole, loading } = useAuth();
  const allowedRoles = role ? (Array.isArray(role) ? role : [role]) : [];

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
        Autenticando de forma segura...
      </div>
    );
  }

  // 1. Verificación estricta de Sesión (JWT Activo)
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // 2. Verificación criptográfica de Rol (Sin depender de LocalStorage)
  if (role) {
    // Roles superiores
    const isSuperUser = ["admin", "owner", "gerente"].includes(userRole);

    if (!allowedRoles.includes(userRole) && !isSuperUser) {
      console.warn(`🔒 Seguridad: Acceso denegado. Rol requerido: ${allowedRoles}. Rol actual: ${userRole}`);
      return <Navigate to="/" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;