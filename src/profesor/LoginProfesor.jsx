import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./LoginProfesor.css";

function LoginProfesor() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
const [fade, setFade] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();

    if (!email || !password) {
      alert("Completa todos los campos");
      return;
    }

    const profesores = JSON.parse(localStorage.getItem("profesores") || "[]");

    const profesor = profesores.find(
      (p) => p.email === email && String(p.password) === password
    );

    if (profesor) {
      localStorage.setItem("user", JSON.stringify({
        id: profesor.id,
        role: "profesor",
        email: profesor.email
      }));

      navigate("/panel-profesor");
      return;
    }

    alert("Credenciales incorrectas");
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