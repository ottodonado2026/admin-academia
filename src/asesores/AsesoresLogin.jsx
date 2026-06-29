import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "./AsesoresPanel.css";
import { supabase } from "../services/supabaseClient";
import LoginLoader from "../components/LoginLoader";



function AsesoresLogin() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const { user, role } = useAuth(); // Agregado: usar AuthContext

  // Efecto para redirigir cuando el AuthContext confirme el rol
  useEffect(() => {
    if (user && role === "asesor") {
      setTimeout(() => {
        navigate("/panel-asesor");
      }, 1000);
    } else if (user && role && role !== "asesor") {
      // Si entra alguien que no es asesor, mandarlo a su ruta
      navigate("/");
    }
  }, [user, role, navigate]);

const handleLogin = async (e) => {
  e.preventDefault();
  setIsLoggingIn(true);

  try {
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.trim().toLowerCase(),
      password: form.password,
    });

    if (error) {
      setIsLoggingIn(false);
      console.error("ERROR LOGIN SUPABASE:", error);
      setError(error.message);
      return;
    }

    // La redirección ocurrirá por el useEffect cuando cambie el rol
  } catch (err) {
    setIsLoggingIn(false);
    console.error("ERROR INESPERADO LOGIN:", err);
    setError(err.message || "Error inesperado");
  }
};

  return (
    <div className="asesor-auth-page">
      {isLoggingIn && <LoginLoader />}
      <div className="asesor-auth-card">
        <h1>💰 Panel Comercial</h1>
        <p>Caribbean Studio Academy</p>

        <form onSubmit={handleLogin} className="asesor-auth-form">
          <input
            name="email"
            placeholder="Correo"
            value={form.email}
            onChange={handleChange}
            required
          />

          <input
            name="password"
            type="password"
            placeholder="Contraseña"
            value={form.password}
            onChange={handleChange}
            required
          />

          {error && <div className="alert-error">{error}</div>}

          <button className="btn-primary">Ingresar</button>

          <span
            style={{
              marginTop: "12px",
              fontSize: "12px",
              color: "#aaa",
              cursor: "pointer",
            }}
            onClick={() => navigate("/")}
          >
            ← Volver al panel principal
          </span>
        </form>
      </div>
    </div>
  );
}

export default AsesoresLogin;