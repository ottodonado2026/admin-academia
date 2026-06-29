import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { useAuth } from "../context/AuthContext";
import "./LoginProfesor.css";
import LoginLoader from "../components/LoginLoader";

// Utilidad para registrar intentos de login (auditoría de seguridad)
const registrarIntentoLogin = async (email, exitoso, mensajeError = null) => {
  try {
    await supabase.from("intentos_login").insert([{
      email: email?.toLowerCase()?.trim(),
      exitoso,
      mensaje_error: mensajeError,
      user_agent: navigator?.userAgent || "desconocido",
    }]);
  } catch (_) {}
};

function LoginProfesor() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
const [fade, setFade] = useState(false);
const [isLoggingIn, setIsLoggingIn] = useState(false);

  const { user, role, login } = useAuth(); // Agregado: usar AuthContext

  // Efecto para redirigir cuando el AuthContext confirme el rol
  useEffect(() => {
    if (user && role === "profesor") {
      setTimeout(() => {
        navigate("/panel-profesor");
      }, 1000);
    } else if (user && role && role !== "profesor") {
      // Si entra alguien que no es profesor, mandarlo a su ruta
      navigate("/");
    }
  }, [user, role, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!email || !password) {
      alert("Completa todos los campos");
      return;
    }

    setIsLoggingIn(true);
    try {
      // Usar login de AuthContext o directo de supabase
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password.trim()
      });

      if (error) {
        setIsLoggingIn(false);
        console.error("Error login Supabase:", error);
        // 🔒 Registrar intento fallido
        await registrarIntentoLogin(email, false, error.message);
        alert("Credenciales incorrectas: " + error.message);
        return;
      }
      
      // Registrar éxito
      await registrarIntentoLogin(email, true);
      // La redirección ocurrirá por el useEffect cuando cambie el rol
    } catch (err) {
      setIsLoggingIn(false);
      console.error("Error inesperado en login:", err);
      alert("Ocurrió un error inesperado al iniciar sesión.");
    }
  };

  return (
    <div className={`login-profesor-container ${fade ? "fade-out" : ""}`}>
      {isLoggingIn && <LoginLoader />}
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