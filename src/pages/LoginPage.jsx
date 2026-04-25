import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../services/supabaseClient";



function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [nombre, setNombre] = useState("");
const [roleLabel, setRoleLabel] = useState("");



  const [fade, setFade] = useState(false);

const handleLogin = async (e) => {
  e.preventDefault();

  if (!email || !password) {
    alert("Completa todos los campos");
    return;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    alert("Credenciales incorrectas");
    return;
  }

  // validar rol en Supabase
  // 🔥 obtener usuario autenticado
const user = data.user;

// 🔥 buscar por auth_uid (forma correcta)
const { data: usuario, error: userError } = await supabase
  .from("usuarios")
  .select("role, nombre")
  .eq("auth_uid", user.id)
  .maybeSingle();

  if (!usuario || !usuario.nombre) {
  alert("El usuario no tiene nombre asignado en el sistema");
  return;
}


if (!usuario) {
  alert("Usuario no registrado en el sistema");
  return;
}

if (!["owner", "contador", "coordinador"].includes(usuario.role)) {
  alert("No tienes permisos");
  return;
}

const roleLabels = {
  owner: "Gerente",
  contador: "Contador",
  coordinador: "Coordinador",
};



navigate("/dashboard");
};


  return (
    <>
      {/* 🔥 AQUI VA LA ANIMACIÓN (esto te faltaba) */}
      <style>
  {`
  @keyframes bgMove {
    0% {
      background-position: 20% 20%, 80% 30%, 50% 80%;
    }
    50% {
      background-position: 30% 40%, 70% 20%, 60% 70%;
    }
    100% {
      background-position: 25% 25%, 75% 35%, 55% 85%;
    }
  }

  @keyframes pulseGlow {
    0% {
      box-shadow: 0 0 10px rgba(57,255,20,0.1);
    }
    50% {
      box-shadow: 0 0 25px rgba(57,255,20,0.25);
    }
    100% {
      box-shadow: 0 0 10px rgba(57,255,20,0.1);
    }
  }

  /* 🔥 AQUÍ VA EL EQUALIZER */
  .equalizer {
    position: absolute;
    bottom: 40px;
    height: 150px;
    left: 0;
    width: 100%;
    

    display: flex;
    justify-content: center;
    align-items: flex-end;
    gap: 4px;

    pointer-events: none;
    z-index: 0;
  }

  .equalizer span {
  width: 6px;
  height: 20px;

  background: linear-gradient(180deg, #39ff14, #00c8ff);

  border-radius: 4px;

  box-shadow: 0 0 10px rgba(57,255,20,0.6); /* 🔥 glow */

  animation: equalizer 1s infinite ease-in-out;
}

  @keyframes equalizer {
    0%, 100% {
      height: 20px;
    }
    50% {
      height: 100px;
    }
  }
   


  .login-container {
  transition: all 0.3s ease;
}

/* 🔥 SALIDA */
.fade-out {
  opacity: 0;
  transform: scale(0.95);
  filter: blur(4px);
}
  `}
</style>

      <div className={`login-container ${fade ? "fade-out" : ""}`} style={styles.container}>
        <div className="equalizer">
 {Array.from({ length: 20 }).map((_, i) => (
  <span
    key={i}
    style={{
      animationDelay: `${Math.random()}s`,
      animationDuration: `${0.8 + Math.random()}s`,
    }}
  ></span>
))}
</div>
        <div style={styles.card}>
          <h1 style={styles.title}>CARIBBEAN STUDIO ACADEMY</h1>
          <p style={styles.subtitle}>
  Accede como administrador, profesor o asesor
</p>

          <form onSubmit={handleLogin} style={styles.form}>
            <input
              type="email"
              placeholder="Correo"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={styles.input}
            />

            <input
              type="password"
              placeholder="Contraseña"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={styles.input}
            />

            <button type="submit" style={styles.button}>
              Ingresar
            </button>
          </form>

          <p style={styles.demo}>
            admin@test.com / 123456
          </p>
          <button
  
  
  type="button"
  onClick={() => {
    setFade(true);
    setTimeout(() => navigate("/login-profesor"), 300);
  }}
  className="btn-profesor"
>
  👨‍🏫 Soy profesor
</button>
<button
  type="button"
  onClick={() => {
    setFade(true);
    setTimeout(() => navigate("/login-asesor"), 300);
  }}
  className="btn-profesor"
>
  💰 Soy asesor
</button>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px",
    position: "relative",
overflow: "hidden",

    /* 🔥 FONDO DJ ANIMADO */
    background: `
      radial-gradient(circle at 20% 20%, rgba(57,255,20,0.15), transparent 40%),
      radial-gradient(circle at 80% 30%, rgba(255,0,150,0.15), transparent 40%),
      radial-gradient(circle at 50% 80%, rgba(0,200,255,0.15), transparent 40%),
      #050505
    `,
    animation: "bgMove 10s infinite alternate ease-in-out",
  },

  card: {
    width: "100%",
    maxWidth: "380px",
    padding: "30px",
    borderRadius: "20px",
    background: "rgba(16,18,27,0.8)",
    border: "1px solid rgba(255,255,255,0.08)",
    backdropFilter: "blur(12px)",
    position: "relative",
    zIndex: 2,
    /* 🔥 GLOW DJ */
    boxShadow: `
      0 20px 60px rgba(0,0,0,0.6),
      0 0 25px rgba(57,255,20,0.15)
    `,
    animation: "pulseGlow 3s infinite ease-in-out",

    textAlign: "center",
  },

  title: {
    fontSize: "20px",
    marginBottom: "5px",
  },

  subtitle: {
    color: "#a9b0c3",
    fontSize: "14px",
    marginBottom: "20px",
  },

  form: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },

  input: {
    height: "45px",
    borderRadius: "12px",
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.03)",
    color: "white",
    padding: "0 12px",
    outline: "none",
  },

  button: {
    marginTop: "10px",
    height: "45px",
    borderRadius: "12px",
    border: "none",

    /* 🔥 BOTÓN DJ */
    background: "linear-gradient(135deg, #39ff14, #00c8ff)",

    color: "white",
    fontWeight: "bold",
    cursor: "pointer",
  },

  demo: {
    marginTop: "15px",
    fontSize: "12px",
    color: "#a9b0c3",
  },
  
};


export default LoginPage;