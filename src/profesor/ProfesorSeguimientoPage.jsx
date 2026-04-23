import { useEffect, useState } from "react";
import "./ProfesorSeguimientoPage.css";

export default function ProfesorSeguimientoPage() {
  const [clases, setClases] = useState([]);
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(JSON.parse(localStorage.getItem("user")));
    setClases(JSON.parse(localStorage.getItem("clases")) || []);
  }, []);

  const misClases = clases.filter(
    (c) => String(c.profesorId) === String(user?.id)
  );

  const alumnos = [];

  misClases.forEach((c) => {
    (c.alumnos || []).forEach((a) => {
      if (!alumnos.find((x) => x.id === a.id)) {
        alumnos.push(a);
      }
    });
  });

  const actualizarNota = (alumnoId, texto) => {
    const nuevas = clases.map((c) => ({
      ...c,
      alumnos: c.alumnos?.map((a) =>
        a.id === alumnoId ? { ...a, seguimiento: texto } : a
      ),
    }));

    localStorage.setItem("clases", JSON.stringify(nuevas));
    setClases(nuevas);
  };

  return (
    <div className="seguimiento-page">
      <h2>Seguimiento de alumnos</h2>

      <div className="seguimiento-grid">
        {alumnos.map((a) => (
          <div key={a.id} className="seguimiento-card">
            <h3>{a.nombre}</h3>

            <textarea
              placeholder="Escribe seguimiento..."
              value={a.seguimiento || ""}
              onChange={(e) =>
                actualizarNota(a.id, e.target.value)
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}