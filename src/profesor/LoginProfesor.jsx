import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import "./LoginProfesor.css";

function LoginProfesor() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
const [fade, setFade] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      alert("Completa todos los campos");
      return;
    }

    try {
      // 1. Iniciar sesión usando Supabase Auth
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password.trim()
      });

      if (error) {
        console.error("Error login Supabase:", error);
        alert("Credenciales incorrectas: " + error.message);
        return;
      }

      const authUser = data.user;

      // 2. Buscar el perfil en la tabla de profesores (puede ser por ID o por email para compatibilidad)
      let profesor = null;
      const { data: profDB, error: profError } = await supabase
        .from("profesores")
        .select("*")
        .eq("id", authUser.id)
        .maybeSingle();

      if (!profError && profDB) {
        profesor = profDB;
      } else {
        // Fallback por email si el id no coincide (para legacy migrados)
        const { data: todos } = await supabase.from("profesores").select("*");
        const found = (todos || [])
          .map(p => ({ id: p.id, ...p.data }))
          .find(p => String(p.email).trim().toLowerCase() === email.trim().toLowerCase());

        if (found) {
          profesor = { id: found.id, data: found };
        }
      }

      if (profesor) {
        const payload = { id: profesor.id, ...profesor.data };
        localStorage.setItem(
          "user",
          JSON.stringify({
            id: payload.id,
            role: "profesor",
            nombre: payload.nombre,
            email: payload.email,
          })
        );

        navigate("/panel-profesor");
        return;
      }

      alert("No se encontró un perfil de profesor asociado a esta cuenta.");
    } catch (err) {
      console.error("Error inesperado en login:", err);
      alert("Ocurrió un error inesperado al iniciar sesión.");
    }
  };

  return (
    <div className={`login-profesor-container ${fade ? "fade-out" : ""}`}>
      <div className="login-card">

        <h1>Panel Profesor</h1>
        <p>Accede a tus clases y alumnos</p>

        <form onSubmit={handleLogin}>
          <input
            type="email"
            placeholder="Correo del profesor"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Contraseña"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button type="submit">Ingresar</button>
        </form>

        <span
  className="back-admin"
  onClick={() => {
    setFade(true);
    setTimeout(() => navigate("/"), 300);
  }}
>
  ← Volver al panel administrativo
</span>

      </div>
    </div>
  );
}

export default LoginProfesor;