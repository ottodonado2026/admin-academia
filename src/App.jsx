import { Component } from "react";
import AppRouter from "./router/AppRouter";
import { AuthProvider, useAuth } from "./context/AuthContext";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("ErrorBoundary caught an error", error, info);
    this.setState({ info });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "20px", background: "#fee", color: "#900", fontFamily: "monospace" }}>
          <h2>Application Crashed</h2>
          <p>{this.state.error && this.state.error.toString()}</p>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {this.state.info && this.state.info.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}

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
    <ErrorBoundary>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;