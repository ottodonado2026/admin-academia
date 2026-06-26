import { useState } from "react";
import { useNavigate } from "react-router-dom";
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

const handleLogin = async (e) => {
  e.preventDefault();
  setIsLoggingIn(true);

  try {
    setError("");

    const { data, error } = await supabase.auth.signInWithPassword({
      email: form.email.trim().toLowerCase(),
      password: form.password,
    });

    if (error) {
      setIsLoggingIn(false);
      console.error("ERROR LOGIN SUPABASE:", error);
      setError(error.message);
      return;
    }

    const user = data?.user;

    if (!user) {
      setIsLoggingIn(false);
      setError("No se encontró usuario");
      return;
    }

    const { data: asesorDB, error: asesorError } = await supabase
      .from("asesores")
      .select("*")
      .eq("auth_uid", user.id)
      .single();

    if (asesorError || !asesorDB) {
      setIsLoggingIn(false);
      console.error("ERROR BUSCANDO ASESOR:", asesorError);
      setError("Este usuario no está registrado como asesor");
      return;
    }

    localStorage.setItem(
      "asesorAuth",
      JSON.stringify({
        id: asesorDB.id,
        nombre: asesorDB.nombre,
        email: asesorDB.email,
        asesorId: asesorDB.asesor_id,
        estado: asesorDB.estado,
      })
    );

   setTimeout(() => {
     navigate("/panel-asesor"); 
   }, 2500);

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