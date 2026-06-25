import { useEffect, useMemo, useState } from "react";
import logo from "../../assets/logo.png";

export default function ProfesorSidebar({ activeView, setActiveView }) {
  const [user, setUser] = useState(null);
  const [open, setOpen] = useState(false);
 
 useEffect(() => {
  const userData = JSON.parse(localStorage.getItem("user"));
  setUser(userData);
}, []);

  const menu = useMemo(
    () => [
      { id: "dashboard", label: "Dashboard" },
      { id: "clases", label: "Clases" },
      { id: "alumnos", label: "Alumnos" },
      { id: "asistencia", label: "Asistencia" },
      { id: "calificaciones", label: "Calificaciones" },
      { id: "seguimiento", label: "Seguimiento" },
      { id: "pagos", label: "Pagos" },
    ],
    []
  );

  const logout = () => {
    localStorage.removeItem("user");
    window.location.href = "/";
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
          onClick={logout}
        >
          Salir
        </button>
      </div>
    </aside>
  </>
);
}