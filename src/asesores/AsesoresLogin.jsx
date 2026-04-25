import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AsesoresPanel.css";


import { supabase } from "../services/supabaseClient";



function AsesoresLogin() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

try {
  // 🔐 LOGIN CON FIREBASE AUTH
 

// 🔐 LOGIN CON SUPABASE
const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
  email: form.email,
  password: form.password,
});

if (loginError) {
  setError("Credenciales incorrectas");
  return;
}

const user = loginData.user;

      if (!asesor) {
        setError("Credenciales incorrectas o usuario inactivo");
        return;
      }

      if (asesor.estado !== "activo") {
        setError("Credenciales incorrectas o usuario inactivo");
        return;
      }

     localStorage.setItem(
  "asesorAuth",
  JSON.stringify({
    ...asesor,
    asesorId: asesor.asesor_id,
  })
);
      navigate("/panel-asesor");
    
      } catch (error) {
  if (import.meta.env.DEV) {
    console.error("Error login:", error);
  }

  switch (error.code) {
    case "auth/user-not-found":
      setError("El usuario no existe.");
      break;

    case "auth/wrong-password":
      setError("Contraseña incorrecta.");
      break;

    case "auth/invalid-email":
      setError("Correo inválido.");
      break;

    case "auth/too-many-requests":
      setError("Demasiados intentos. Intenta más tarde.");
      break;

    case "auth/network-request-failed":
      setError("Error de conexión. Verifica tu internet.");
      break;

    default:
      setError("Error al iniciar sesión.");
      break;
  }
}
  };

  return (
    <div className="asesor-auth-page">
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