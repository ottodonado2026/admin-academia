import { useEffect, useState } from "react";

export default function ProfesorTopbar() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("user"));
    setUser(userData);
  }, []);

  const nombreProfesor = user?.nombre || "Profesor";

  return (
    <header className="profesor-topbar">
      <div className="profesor-topbar-left">
        <h2>Panel Profesor</h2>
      </div>

      <div className="profesor-topbar-right">
        <div className="profesor-topbar-user">
          <strong>Profesor</strong>
          <span>{nombreProfesor}</span>
        </div>
      </div>
    </header>
  );
}