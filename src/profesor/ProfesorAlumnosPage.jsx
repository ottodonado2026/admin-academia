import { useEffect, useMemo, useState } from "react";
import "./ProfesorAlumnosPage.css";
import AlumnoCard from "./components/AlumnoCard";

export default function ProfesorAlumnosPage() {
  const [user, setUser] = useState(null);
  const [alumnos, setAlumnos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [clases, setClases] = useState([]);

  const [busqueda, setBusqueda] = useState("");

  useEffect(() => {
    setUser(JSON.parse(localStorage.getItem("user")));
    setAlumnos(JSON.parse(localStorage.getItem("alumnos")) || []);
    setPagos(JSON.parse(localStorage.getItem("pagos")) || []);
    setClases(JSON.parse(localStorage.getItem("clases")) || []);
  }, []);

  const alumnosProfesor = useMemo(() => {
    if (!user) return [];

    const misClases = clases.filter(
      (c) => String(c.profesorId) === String(user.id)
    );

    const mapa = new Map();

    misClases.forEach((clase) => {
      (clase.alumnos || []).forEach((a) => {
        if (!mapa.has(a.id)) {
          mapa.set(a.id, a);
        }
      });
    });

    return Array.from(mapa.values());
  }, [clases, user]);

  const alumnosFiltrados = useMemo(() => {
    return alumnosProfesor.filter((a) =>
      a.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [alumnosProfesor, busqueda]);

  const stats = useMemo(() => {
    const total = alumnosProfesor.length;

    const enMora = alumnosProfesor.filter((alumno) => {
      const plan = pagos.find(
        (p) =>
          String(p.alumnoId) === String(alumno.id) ||
          String(p.alumnoId) === String(alumno.alumnoId) ||
          String(p.alumnoDbId) === String(alumno.id) ||
          String(p.alumno).trim().toLowerCase() ===
            String(alumno.nombre).trim().toLowerCase()
      );

      return plan?.estado === "En mora";
    }).length;

    const activos = alumnosProfesor.filter((alumno) => {
      const estado = String(alumno.estadoAcademico || alumno.estado || "activo").toLowerCase();
      return estado === "activo";
    }).length;

    return { total, enMora, activos };
  }, [alumnosProfesor, pagos]);

  return (
    <div className="profesor-alumnos-page">
      <div className="profesor-alumnos-header">
        <div>
          <h2>Alumnos</h2>
          <p>
            Visualiza tus alumnos asignados, su estado académico y su relación
            con clases y pagos.
          </p>
        </div>

        <div className="profesor-alumnos-toolbar">
          <input
            className="profesor-alumnos-search"
            type="text"
            placeholder="Buscar alumno..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
      </div>

      <div className="profesor-alumnos-kpis">
        <div className="profesor-alumnos-kpi">
          <span>Total alumnos</span>
          <strong>{stats.total}</strong>
        </div>

        <div className="profesor-alumnos-kpi">
          <span>Activos</span>
          <strong>{stats.activos}</strong>
        </div>

        <div className="profesor-alumnos-kpi">
          <span>En mora</span>
          <strong>{stats.enMora}</strong>
        </div>
      </div>

      {alumnosFiltrados.length === 0 ? (
        <div className="profesor-alumnos-empty">
          No hay alumnos asignados o no coinciden con la búsqueda.
        </div>
      ) : (
        <div className="profesor-alumnos-grid">
          {alumnosFiltrados.map((alumno) => (
            <AlumnoCard
              key={alumno.id}
              alumno={alumno}
              pagos={pagos}
              clases={clases}
            />
          ))}
        </div>
      )}
    </div>
  );
}