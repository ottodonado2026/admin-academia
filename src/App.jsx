import AppRouter from "./router/AppRouter";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/AuthContext";

function AppContent() {
  const { loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        width: "100%", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
        background: "#F8FAFC", color: "#1E293B", fontSize: "18px", fontWeight: "700"
      }}>
        Cargando sistema...
      </div>
    );
  }

  return <AppRouter />;
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;