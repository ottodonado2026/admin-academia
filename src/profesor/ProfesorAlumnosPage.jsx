import { useMemo, useState } from "react";
import "./ProfesorAlumnosPage.css";
import AlumnoCard from "./components/AlumnoCard";
import ModalExpediente from "./components/ModalExpediente";
import { useProfesorData } from "./hooks/useProfesorData";
import { supabase } from "../services/supabaseClient";

export default function ProfesorAlumnosPage() {
  const { clases, pagos, alumnos: todosLosAlumnos, loading, recargarDatos } = useProfesorData();
  const [busqueda, setBusqueda] = useState("");
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null);

  const userDataStr = localStorage.getItem("user");
  const user = userDataStr ? JSON.parse(userDataStr) : null;

  const alumnosProfesor = useMemo(() => {
    if (!user || loading) return [];

    const misClases = clases.filter(
      (c) => String(c.profesorId) === String(user.id) || String(c.profesor_db_id) === String(user.id)
    );

    const mapa = new Map();

    // Priorizar datos de la tabla alumnos
    misClases.forEach((clase) => {
      (clase.alumnos || []).forEach((a) => {
        if (!mapa.has(a.id)) {
          // buscar info extendida en la tabla de alumnos
          const alumnoDB = todosLosAlumnos.find((dbA) => dbA.id === a.id || dbA.alumno_id === a.id);
          mapa.set(a.id, {
            ...a,
            ...alumnoDB,
            id: a.id
          });
        }
      });
    });

    return Array.from(mapa.values());
  }, [clases, todosLosAlumnos, user, loading]);

  const alumnosFiltrados = useMemo(() => {
    return alumnosProfesor.filter((a) =>
      a.nombre?.toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [alumnosProfesor, busqueda]);

  const stats = useMemo(() => {
    const total = alumnosProfesor.length;

    const enMora = alumnosProfesor.filter((alumno) => {
      const plan = pagos.find(
        (p) =>
          String(p.alumnoId) === String(alumno.id) ||
          String(p.alumnoId) === String(alumno.alumno_id) ||
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
          <h2>Alumnos y Expedientes</h2>
          <p>
            Visualiza tus alumnos asignados, genera certificados, registra seguimientos y comunícate vía WhatsApp.
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

      {loading ? (
        <div className="profesor-alumnos-empty">Cargando alumnos...</div>
      ) : alumnosFiltrados.length === 0 ? (
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
              onSelect={setAlumnoSeleccionado}
            />
          ))}
        </div>
      )}

      {alumnoSeleccionado && (
        <ModalExpediente 
          alumno={alumnoSeleccionado}
          clases={clases}
          onClose={() => setAlumnoSeleccionado(null)}
          onActualizado={recargarDatos}
        />
      )}
    </div>
  );
}