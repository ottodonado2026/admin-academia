import { useEffect, useMemo, useState } from "react";

export default function ProfesorSidebar({ activeView, setActiveView }) {
  const [user, setUser] = useState(null);
  const [profesor, setProfesor] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user"));
    const profesores = JSON.parse(localStorage.getItem("profesores")) || [];

    setUser(userData);

    if (userData?.id) {
      const prof = profesores.find(
        (p) => String(p.id) === String(userData.id)
      );
      setProfesor(prof || null);
    }
  }, []);

  const menu = useMemo(
    () => [
      { id: "dashboard", label: "Dashboard" },
      { id: "clases", label: "Clases" },
      { id: "alumnos", label: "Alumnos" },
      { id: "asistencia", label: "Asistencia" },
      { id: "calificaciones", label: "Calificaciones" },
      { id: "seguimiento", label: "Seguimiento" },
    ],
    []
  );

  const logout = () => {
    localStorage.removeItem("user");
    window.location.href = "/";
  };

  const nombreProfesor = profesor?.nombre || user?.nombre || "Profesor";
  const profesorId = profesor?.id || user?.id || "N/A";

  return (
    <aside className="profesor-sidebar">
      <div className="profesor-sidebar-top">
       
          <div className="profesor-sidebar-academy">
  <span className="academy-kicker">Academia</span>
  <div className="profesor-sidebar-academy-text">
    <h1 className="academy-line-one">CARIBBEAN</h1>
    <h2 className="academy-line-two">Studio Academy</h2>
  </div>
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
              onClick={() => setActiveView(item.id)}
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
  );
}