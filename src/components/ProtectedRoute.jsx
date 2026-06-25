import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function ProtectedRoute({ children, role }) {
  const { user, role: userRole, loading, timeoutWarning, repairSession } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          width: "100%",
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#080b12",
          color: "white",
          fontSize: "18px",
          fontWeight: "700",
          textAlign: "center",
          padding: "20px"
        }}
      >
        <p>Cargando sesión...</p>
        
        {timeoutWarning && (
          <div style={{ marginTop: "20px", maxWidth: "400px", padding: "15px", background: "rgba(255, 59, 48, 0.1)", border: "1px solid rgba(255, 59, 48, 0.3)", borderRadius: "8px" }}>
            <p style={{ fontSize: "14px", fontWeight: "normal", color: "#ff8a80", marginBottom: "15px" }}>
              La conexión está tardando más de lo esperado. Si la pantalla se queda congelada, puedes intentar limpiar los datos temporales.
            </p>
            <button
              onClick={repairSession}
              style={{
                padding: "10px 20px",
                background: "#ff3b30",
                color: "white",
                border: "none",
                borderRadius: "6px",
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: "14px"
              }}
            >
              Reparar Sesión y Recargar
            </button>
          </div>
        )}
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
    
    // Los roles de alto nivel deberían tener acceso a los paneles administrativos protegidos
    const isSuperUser = ["admin", "owner", "gerente"].includes(userRole);

    if (!allowedRoles.includes(userRole) && !isSuperUser) {
      console.warn(`Acceso denegado. Se requiere: ${allowedRoles}, Tienes: ${userRole}`);
      return <Navigate to="/" replace />;
    }
  }

  return children;
}

export default ProtectedRoute;