import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";
import { useAuth } from "../context/AuthContext";
import LoginLoader from "../components/LoginLoader";
import { config } from "../config/institucion";

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

  const { user, role } = useAuth(); 

  useEffect(() => {
    if (user && role === "profesor") {
      setTimeout(() => {
        navigate("/panel-profesor");
      }, 1000);
    } else if (user && role && role !== "profesor") {
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
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password: password.trim()
      });

      if (error) {
        setIsLoggingIn(false);
        console.error("Error login Supabase:", error);
        await registrarIntentoLogin(email, false, error.message);
        alert("Credenciales incorrectas: " + error.message);
        return;
      }
      
      await registrarIntentoLogin(email, true);
    } catch (err) {
      setIsLoggingIn(false);
      console.error("Error inesperado en login:", err);
      alert("Ocurrió un error inesperado al iniciar sesión.");
    }
  };

  return (
    <>
      {isLoggingIn && <LoginLoader />}
      
      <div className={`login-page-wrapper ${fade ? "fade-out" : ""}`}>
        
        {/* Lado Izquierdo: Branding de Syncore */}
        <div className="login-left">
          <div className="login-left-content">
            <div className="syncore-logo">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7L12 12L22 7L12 2Z" fill="#0f62fe"/>
                <path d="M2 17L12 22L22 17" stroke="#0f62fe" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M2 12L12 17L22 12" stroke="#0f62fe" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>SYNCORE</span>
            </div>
            
            <h1 className="login-heading">
              Portal Docente.<br />
              <span className="text-highlight">Conectado.</span>
            </h1>
            
            <p className="login-subheading">
              Accede a la plataforma integral de {config.nombre} para gestionar tus clases, calificaciones y alumnos.
            </p>

            <div className="features-list">
              <div className="feature-item">
                <div className="feature-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#0f62fe" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="#0f62fe" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div>
                  <h4>Seguro y confiable</h4>
                  <p>Protegemos la información de tus alumnos.</p>
                </div>
              </div>
              <div className="feature-item">
                <div className="feature-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M18 20V10M12 20V4M6 20v-6" stroke="#0f62fe" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
                <div>
                  <h4>Intuitivo y moderno</h4>
                  <p>Herramientas diseñadas para facilitar tu enseñanza.</p>
                </div>
              </div>
            </div>
          </div>

          <div className="login-footer-info">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="3" y="11" width="18" height="11" rx="2" stroke="#0f62fe" strokeWidth="2"/><path d="M7 11V7a5 5 0 0110 0v4" stroke="#0f62fe" strokeWidth="2"/></svg>
            Tu información está protegida con tecnología de nivel empresarial.
          </div>
        </div>

        {/* Lado Derecho: Formulario de Profesor */}
        <div className="login-right">
          <div className="login-card">
            
            <div className="login-card-header">
               <div className="school-logo-placeholder">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 3l8 4.5-8 4.5-8-4.5L12 3zM12 12l8-4.5M12 12v9M12 12L4 7.5" stroke="#0f62fe" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
               </div>
               <h2>Portal Docente</h2>
               <p>Ingresa tus credenciales para acceder a tus clases.</p>
            </div>

            <form onSubmit={handleLogin} className="login-form-clean">
              <div className="form-group">
                <input
                  type="email"
                  placeholder="Correo electrónico"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <input
                  type="password"
                  placeholder="Contraseña"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button type="submit" className="btn-submit-clean">
                Ingresar &rarr;
              </button>
            </form>

            <div className="login-card-footer">
              <div className="login-alt-buttons">
                <button type="button" onClick={() => { setFade(true); setTimeout(() => navigate("/"), 300); }}>
                  ← Volver al portal administrativo
                </button>
              </div>
            </div>

          </div>

          <div className="syncore-copyright">
            © 2024 Syncore. Todos los derechos reservados.
          </div>
        </div>

      </div>

      <style>{`
        .login-page-wrapper {
          display: flex;
          min-height: 100vh;
          background: #F8FAFC;
          font-family: 'Geist', 'Inter', sans-serif;
          transition: all 0.3s ease;
        }

        .fade-out {
          opacity: 0;
          transform: scale(0.98);
        }

        /* LADO IZQUIERDO */
        .login-left {
          flex: 1;
          background: linear-gradient(145deg, #E6F0FF 0%, #F8FAFC 100%);
          padding: 60px 80px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          position: relative;
          overflow: hidden;
        }

        /* Ondas de fondo sutiles */
        .login-left::before {
          content: "";
          position: absolute;
          top: -20%; left: -10%; width: 700px; height: 700px;
          background: radial-gradient(circle, rgba(15,98,254,0.06) 0%, transparent 60%);
          border-radius: 50%;
          z-index: 0;
        }
        
        .login-left-content {
          position: relative;
          z-index: 1;
          max-width: 420px;
        }

        .syncore-logo {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 22px;
          font-weight: 800;
          color: #1E293B;
          letter-spacing: 0.5px;
          margin-bottom: 50px;
        }

        .login-heading {
          font-size: 42px;
          font-weight: 800;
          color: #1E293B;
          line-height: 1.15;
          margin-bottom: 20px;
          letter-spacing: -1px;
        }

        .text-highlight {
          color: #0f62fe;
        }

        .login-subheading {
          font-size: 15px;
          color: #475569;
          line-height: 1.5;
          margin-bottom: 40px;
        }

        .features-list {
          display: flex;
          flex-direction: column;
          gap: 25px;
        }

        .feature-item {
          display: flex;
          gap: 16px;
          align-items: flex-start;
        }

        .feature-icon {
          width: 44px;
          height: 44px;
          background: rgba(15,98,254,0.08);
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .feature-item h4 {
          margin: 0 0 4px 0;
          font-size: 15px;
          color: #1E293B;
          font-weight: 700;
        }
        
        .feature-item p {
          margin: 0;
          font-size: 13.5px;
          color: #64748b;
          line-height: 1.4;
        }

        .login-footer-info {
          font-size: 13px;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
        }

        /* LADO DERECHO */
        .login-right {
          flex: 1.2;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          background: #F8FAFC;
          padding: 40px;
          position: relative;
        }

        .login-card {
          width: 100%;
          max-width: 400px;
          background: #FFFFFF;
          border-radius: 20px;
          padding: 40px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.03), 0 1px 3px rgba(0,0,0,0.02);
          border: 1px solid #F1F5F9;
        }

        .login-card-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .school-logo-placeholder {
          width: 56px;
          height: 56px;
          background: #EEF2FF;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 16px;
          margin: 0 auto 20px auto;
        }

        .login-card-header h2 {
          font-size: 22px;
          color: #1E293B;
          margin: 0 0 8px 0;
          letter-spacing: -0.5px;
        }
        
        .login-card-header p {
          font-size: 13.5px;
          color: #64748b;
          margin: 0;
        }

        .login-form-clean {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group input {
          height: 48px;
          border: 1px solid #E2E8F0;
          border-radius: 12px;
          padding: 0 16px;
          font-size: 15px;
          color: #1E293B;
          background: #FFFFFF;
          transition: all 0.2s ease;
          outline: none;
        }

        .form-group input::placeholder {
          color: #94A3B8;
        }

        .form-group input:focus {
          border-color: #0f62fe;
          box-shadow: 0 0 0 3px rgba(15, 98, 254, 0.1);
        }

        .btn-submit-clean {
          height: 48px;
          border-radius: 12px;
          border: none;
          background: #0f62fe;
          color: white;
          font-weight: 600;
          font-size: 15px;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 8px;
        }

        .btn-submit-clean:hover {
          background: #004ee6;
          box-shadow: 0 4px 12px rgba(15,98,254,0.2);
        }

        .login-card-footer {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid #F1F5F9;
        }

        .login-alt-buttons {
          display: flex;
          gap: 10px;
          justify-content: center;
        }

        .login-alt-buttons button {
          background: white;
          border: 1px solid #E2E8F0;
          padding: 10px 16px;
          border-radius: 10px;
          font-size: 13px;
          color: #475569;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          flex: 1;
        }

        .login-alt-buttons button:hover {
          background: #F8FAFC;
          border-color: #CBD5E1;
        }

        .syncore-copyright {
          position: absolute;
          bottom: 24px;
          font-size: 12px;
          color: #94A3B8;
        }

        @media (max-width: 900px) {
          .login-page-wrapper {
            flex-direction: column;
          }
          .login-left {
            padding: 40px 24px;
            text-align: center;
          }
          .syncore-logo {
            justify-content: center;
          }
          .features-list {
            display: none;
          }
          .login-footer-info {
            display: none;
          }
          .login-right {
            padding: 24px;
            background: #FFFFFF;
          }
          .login-card {
            box-shadow: none;
            border: none;
            padding: 0;
          }
          .syncore-copyright {
            position: relative;
            margin-top: 40px;
            bottom: 0;
          }
        }
      `}</style>
    </>
  );
}

export default LoginProfesor;