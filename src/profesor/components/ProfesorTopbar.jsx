import { useEffect, useState } from "react";

export default function ProfesorTopbar() {
  const [user, setUser] = useState(null);
  const [profesor, setProfesor] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user"));
    setUser(userData);

    if (userData?.role === "profesor") {
      const profesores = JSON.parse(localStorage.getItem("profesores")) || [];

      const prof = profesores.find(
        (p) => String(p.id) === String(userData.id)
      );

      setProfesor(prof || null);
    }
  }, []);

  const nombreProfesor = profesor?.nombre || user?.nombre || "Profesor";
  const profesorId = profesor?.id || user?.id || "N/A";

  return (
    <header className="profesor-topbar">
      <div className="profesor-topbar-left">
        <h2>Panel Profesor</h2>
      </div>

      <div className="profesor-topbar-right">
        <div className="profesor-topbar-user">
          <strong>{nombreProfesor}</strong>
          <span>ID: PROF-{String(profesorId)}</span>
        </div>
      </div>
    </header>
  );
}