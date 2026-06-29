import { useMemo, useState } from "react";
import logo from "../../assets/logo.png";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function ProfesorSidebar({ activeView, setActiveView }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const menu = useMemo(
    () => [
      { id: "dashboard", label: "Dashboard" },
      { id: "clases", label: "Clases" },
      { id: "alumnos", label: "Alumnos" },
      { id: "asistencia", label: "Asistencia" },
      { id: "calificaciones", label: "Calificaciones" },
      { id: "pagos", label: "Pagos" },
    ],
    []
  );

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

 const nombreProfesor = user?.nombre || "Profesor";
const profesorId =
  user?.id ||
  user?.profesorId ||
  user?.numeroDocumento ||
  user?.email?.split("@")[0] ||
  "N/A";

 return (
  <>
    {/* TOPBAR MOBILE */}
    <div className="profesor-mobile-topbar">
      <button onClick={() => setOpen(true)}>☰</button>
      <h3>Profesor</h3>
    </div>

    {/* OVERLAY */}
    {open && (
      <div
        className="profesor-sidebar-overlay"
        onClick={() => setOpen(false)}
      />
    )}

    <aside className={`profesor-sidebar ${open ? "open" : ""}`}>
      <div className="profesor-sidebar-top">

        <div className="profesor-sidebar-academy">
          <img src={logo} alt="Caribbean Studio Academy" className="profesor-sidebar-logo" />
          <span className="academy-kicker">Academia</span>
        </div>

        <div className="profesor-sidebar-brand">
          <h2>{nombreProfesor}</h2>
          <span>ID: PROF-{String(profesorId)}</span>
        </div>

        <nav className="profesor-sidebar-nav">
          {menu.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`profesor-sidebar-link ${
                activeView === item.id ? "active" : ""
              }`}
              onClick={() => {
                setActiveView(item.id);
                setOpen(false);
              }}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="profesor-sidebar-bottom">
        <button
          type="button"
          className="profesor-sidebar-logout"
          onClick={handleLogout}
        >
          Salir
        </button>
      </div>
    </aside>
  </>
);
}