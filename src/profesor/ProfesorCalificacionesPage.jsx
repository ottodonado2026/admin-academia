import { useMemo, useState } from "react";
import "./ProfesorCalificacionesPage.css";
import { useProfesorData } from "./hooks/useProfesorData";
import { supabase } from "../services/supabaseClient";
import { CURSOS_BASE } from "../data/cursosBase";

export default function ProfesorCalificacionesPage() {
  const { clases, alumnos: todosLosAlumnos, loading, recargarDatos } = useProfesorData();
  const [busqueda, setBusqueda] = useState("");
  const [filtroCurso, setFiltroCurso] = useState("todos");
  const [filtroRendimiento, setFiltroRendimiento] = useState("todos");
  const [guardandoId, setGuardandoId] = useState(null);

  const userDataStr = localStorage.getItem("user");
  const user = userDataStr ? JSON.parse(userDataStr) : null;

  const misClases = useMemo(() => {
    if (!user || loading) return [];
    return clases.filter(
      (c) => String(c.profesorId) === String(user.id) || String(c.profesor_db_id) === String(user.id)
    );
  }, [clases, user, loading]);

  const alumnos = useMemo(() => {
    const alumnosMap = {};

    misClases.forEach((clase) => {
      (clase.alumnos || []).forEach((a) => {
        if (!alumnosMap[a.id]) {
          const alumnoDB = todosLosAlumnos.find((db) => db.id === a.id || db.alumno_id === a.id);
          const curso = CURSOS_BASE.find((c) => String(c.id) === String(alumnoDB?.cursoId || a.curso) || c.nombre.toLowerCase().includes(String(a.curso || "").toLowerCase()));
          
          alumnosMap[a.id] = {
            ...a,
            ...alumnoDB,
            id: a.id,
            cursoNombre: curso?.nombre || a.curso || "Sin curso",
            cursoId: curso?.id || "-",
            calificacion_final: alumnoDB?.calificacion_final || ""
          };
        }
      });
    });

    return Object.values(alumnosMap)
      .sort((a, b) => Number(b.calificacion_final || 0) - Number(a.calificacion_final || 0));
  }, [misClases, todosLosAlumnos]);

  const cursosDisponibles = useMemo(() => {
    const mapa = new Map();
    alumnos.forEach((alumno) => {
      const id = alumno.cursoId || alumno.cursoNombre;
      if (!mapa.has(id)) {
        mapa.set(id, { id, nombre: alumno.cursoNombre });
      }
    });
    return Array.from(mapa.values()).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [alumnos]);

  const alumnosFiltrados = useMemo(() => {
    const term = normalizeText(busqueda);

    return alumnos.filter((alumno) => {
      const matchBusqueda =
        !term ||
        normalizeText(alumno.nombre).includes(term) ||
        normalizeText(alumno.cursoNombre).includes(term);

      const matchCurso =
        filtroCurso === "todos" ||
        String(alumno.cursoId) === String(filtroCurso) ||
        String(alumno.cursoNombre) === String(filtroCurso);

      const estadoRendimiento = getRendimientoKey(Number(alumno.calificacion_final || 0));

      const matchRendimiento =
        filtroRendimiento === "todos" ||
        estadoRendimiento === filtroRendimiento;

      return matchBusqueda && matchCurso && matchRendimiento;
    });
  }, [alumnos, busqueda, filtroCurso, filtroRendimiento]);

  const stats = useMemo(() => {
    const totalAlumnos = alumnos.length;
    const conNotas = alumnos.filter((a) => Number(a.calificacion_final) > 0).length;

    const promedioGeneral = conNotas
      ? round1(alumnos.reduce((acc, a) => acc + Number(a.calificacion_final || 0), 0) / conNotas)
      : 0;

    const altoRendimiento = alumnos.filter((a) => Number(a.calificacion_final) >= 8).length;
    const enRiesgo = alumnos.filter((a) => Number(a.calificacion_final) > 0 && Number(a.calificacion_final) < 6).length;

    return { totalAlumnos, conNotas, promedioGeneral, altoRendimiento, enRiesgo };
  }, [alumnos]);

  const guardarCalificacion = async (alumnoId, valor) => {
    setGuardandoId(alumnoId);
    try {
      const { error } = await supabase
        .from("alumnos")
        .update({ calificacion_final: Number(valor) })
        .eq("id", alumnoId);

      if (error) {
        console.error("Error guardando calificacion:", error);
        alert("Hubo un error al guardar.");
      } else {
        recargarDatos();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setGuardandoId(null);
    }
  };

  return (
    <div className="profesor-calificaciones-page">
      <section className="calificaciones-hero">
        <div>
          <h1>Calificaciones Globales</h1>
          <p>
            Consulta y evalúa el rendimiento académico final de tus alumnos, registra sus notas de módulo.
          </p>
        </div>

        <div className="calificaciones-kpis">
          <div className="cal-kpi-card">
            <span>Total alumnos</span>
            <strong>{stats.totalAlumnos}</strong>
          </div>
          <div className="cal-kpi-card">
            <span>Con nota final</span>
            <strong>{stats.conNotas}</strong>
          </div>
          <div className="cal-kpi-card">
            <span>Promedio grupal</span>
            <strong>{stats.promedioGeneral}</strong>
          </div>
          <div className="cal-kpi-card">
            <span>Alto rendimiento</span>
            <strong>{stats.altoRendimiento}</strong>
          </div>
        </div>
      </section>

      <section className="calificaciones-toolbar-card">
        <div className="calificaciones-toolbar">
          <input
            type="text"
            placeholder="Buscar alumno o curso"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />

          <select
            value={filtroCurso}
            onChange={(e) => setFiltroCurso(e.target.value)}
          >
            <option value="todos">Todos los cursos</option>
            {cursosDisponibles.map((curso) => (
              <option key={curso.id} value={curso.id}>
                {curso.nombre}
              </option>
            ))}
          </select>

          <select
            value={filtroRendimiento}
            onChange={(e) => setFiltroRendimiento(e.target.value)}
          >
            <option value="todos">Todo rendimiento</option>
            <option value="ok">Excelente (≥8)</option>
            <option value="warn">Aceptable (6-7.9)</option>
            <option value="danger">En riesgo (&lt;6)</option>
            <option value="sin_notas">Sin notas</option>
          </select>
        </div>

        <div className="calificaciones-summary-row">
          <span>Mostrando <strong>{alumnosFiltrados.length}</strong> alumnos</span>
          <span>En riesgo: <strong>{stats.enRiesgo}</strong></span>
        </div>
      </section>

      {loading ? (
        <div className="calificaciones-empty">Cargando datos...</div>
      ) : alumnosFiltrados.length === 0 ? (
        <div className="calificaciones-empty">
          No hay alumnos que coincidan con los filtros actuales.
        </div>
      ) : (
        <section className="calificaciones-grid-pro">
          {alumnosFiltrados.map((alumno, index) => {
            const calificacion = Number(alumno.calificacion_final || 0);
            const estadoClass = getRendimientoKey(calificacion);
            const estadoLabel = getRendimientoLabel(calificacion);

            return (
              <article key={alumno.id} className="cal-card-pro">
                <div className="cal-card-header">
                  <div className="cal-card-title-wrap">
                    <div className="cal-rank-badge">#{index + 1}</div>
                    <div>
                      <h3>{alumno.nombre}</h3>
                      <p>{alumno.cursoNombre}</p>
                      <small>{alumno.cursoId}</small>
                    </div>
                  </div>
                  <span className={`cal-badge ${estadoClass}`}>
                    {estadoLabel}
                  </span>
                </div>

                <div className="cal-actions-inline">
                  <label>Nota Final (0-10):</label>
                  <div className="input-group-cal">
                    <input 
                      type="number" 
                      min="0" max="10" step="0.1"
                      defaultValue={alumno.calificacion_final || ""}
                      onBlur={(e) => {
                        const val = e.target.value;
                        if (val !== String(alumno.calificacion_final || "")) {
                          guardarCalificacion(alumno.alumno_id || alumno.id, val);
                        }
                      }}
                      disabled={guardandoId === (alumno.alumno_id || alumno.id)}
                    />
                    {guardandoId === (alumno.alumno_id || alumno.id) && <span className="saving-spinner">...</span>}
                  </div>
                </div>

                <div className="cal-progress-block" style={{marginTop: "1rem"}}>
                  <div className="cal-progress-head">
                    <span>Rendimiento general</span>
                    <strong>{Math.min(100, calificacion * 10)}%</strong>
                  </div>
                  <div className="cal-progress-bar">
                    <div
                      className={`cal-progress-fill ${estadoClass}`}
                      style={{ width: `${Math.min(100, calificacion * 10)}%` }}
                    />
                  </div>
                </div>
              </article>
            );
          })}
        </section>
      )}
    </div>
  );
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function round1(value) {
  return Number(Number(value || 0).toFixed(1));
}

function getRendimientoKey(promedio) {
  if (!promedio || promedio <= 0) return "sin_notas";
  if (promedio >= 8) return "ok";
  if (promedio >= 6) return "warn";
  return "danger";
}

function getRendimientoLabel(promedio) {
  if (!promedio || promedio <= 0) return "Sin notas";
  if (promedio >= 8) return "Excelente";
  if (promedio >= 6) return "Aceptable";
  return "En riesgo";
}