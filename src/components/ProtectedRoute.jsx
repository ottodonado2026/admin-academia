import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children, role }) {
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
    const allowedRoles = Array.isArray(role) ? role : [role];
    if (!allowedRoles.includes(userRole)) {
      console.warn(`Acceso denegado. Se requiere: ${allowedRoles}, Tienes: ${userRole}`);
      // Redirigir al inicio o a su panel correspondiente (simplificado a inicio por seguridad)
      return <Navigate to="/" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;