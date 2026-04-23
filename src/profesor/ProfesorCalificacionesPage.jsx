import { useEffect, useMemo, useState } from "react";
import "./ProfesorCalificacionesPage.css";

export default function ProfesorCalificacionesPage() {
  const [clases, setClases] = useState([]);
  const [user, setUser] = useState(null);
  const [cursos, setCursos] = useState([]);

  const [busqueda, setBusqueda] = useState("");
  const [filtroCurso, setFiltroCurso] = useState("todos");
  const [filtroRendimiento, setFiltroRendimiento] = useState("todos");

  useEffect(() => {
    setUser(JSON.parse(localStorage.getItem("user")));
    setClases(JSON.parse(localStorage.getItem("clases")) || []);
    setCursos(JSON.parse(localStorage.getItem("planesCursos")) || []);
  }, []);

  const misClases = useMemo(() => {
    return clases.filter(
      (c) => String(c.profesorId) === String(user?.id)
    );
  }, [clases, user]);

  const alumnos = useMemo(() => {
    const alumnosMap = {};

    misClases.forEach((clase) => {
      (clase.alumnos || []).forEach((alumno) => {
        if (!alumnosMap[alumno.id]) {
          const cursoInfo = getCursoInfo(alumno, clase, cursos);

          alumnosMap[alumno.id] = {
            ...alumno,
            notas: [],
            clasesConNota: 0,
            ultimaNota: null,
            cursoNombre: cursoInfo.nombre,
            cursoId: cursoInfo.id,
          };
        }

        if (alumno.calificacion !== null && alumno.calificacion !== undefined && alumno.calificacion !== "") {
          const nota = Number(alumno.calificacion);

          if (!Number.isNaN(nota)) {
            alumnosMap[alumno.id].notas.push(nota);
            alumnosMap[alumno.id].clasesConNota += 1;
            alumnosMap[alumno.id].ultimaNota = nota;
          }
        }
      });
    });

    return Object.values(alumnosMap)
      .map((alumno) => ({
        ...alumno,
        promedio: calcularPromedio(alumno.notas),
      }))
      .sort((a, b) => b.promedio - a.promedio);
  }, [misClases, cursos]);

  const cursosDisponibles = useMemo(() => {
    const mapa = new Map();

    alumnos.forEach((alumno) => {
      const id = alumno.cursoId || alumno.cursoNombre;
      if (!mapa.has(id)) {
        mapa.set(id, {
          id,
          nombre: alumno.cursoNombre || "Sin curso",
        });
      }
    });

    return Array.from(mapa.values()).sort((a, b) =>
      a.nombre.localeCompare(b.nombre, "es")
    );
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

      const estadoRendimiento = getRendimientoKey(alumno.promedio);

      const matchRendimiento =
        filtroRendimiento === "todos" ||
        estadoRendimiento === filtroRendimiento;

      return matchBusqueda && matchCurso && matchRendimiento;
    });
  }, [alumnos, busqueda, filtroCurso, filtroRendimiento]);

  const stats = useMemo(() => {
    const totalAlumnos = alumnos.length;
    const conNotas = alumnos.filter((a) => a.notas.length > 0).length;

    const promedioGeneral = conNotas
      ? round1(
          alumnos.reduce((acc, alumno) => acc + alumno.promedio, 0) / conNotas
        )
      : 0;

    const altoRendimiento = alumnos.filter((a) => a.promedio >= 8).length;
    const enRiesgo = alumnos.filter((a) => a.promedio > 0 && a.promedio < 6).length;

    return {
      totalAlumnos,
      conNotas,
      promedioGeneral,
      altoRendimiento,
      enRiesgo,
    };
  }, [alumnos]);

  return (
    <div className="profesor-calificaciones-page">
      <section className="calificaciones-hero">
        <div>
          <h1>Calificaciones</h1>
          <p>
            Consulta el rendimiento académico de tus alumnos, revisa su
            promedio, filtra por curso y detecta alumnos de alto rendimiento o
            en riesgo.
          </p>
        </div>

        <div className="calificaciones-kpis">
          <div className="cal-kpi-card">
            <span>Total alumnos</span>
            <strong>{stats.totalAlumnos}</strong>
          </div>

          <div className="cal-kpi-card">
            <span>Con notas</span>
            <strong>{stats.conNotas}</strong>
          </div>

          <div className="cal-kpi-card">
            <span>Promedio general</span>
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
            <option value="ok">Excelente</option>
            <option value="warn">Aceptable</option>
            <option value="danger">En riesgo</option>
            <option value="sin_notas">Sin notas</option>
          </select>
        </div>

        <div className="calificaciones-summary-row">
          <span>
            Mostrando <strong>{alumnosFiltrados.length}</strong> alumnos
          </span>
          <span>
            En riesgo: <strong>{stats.enRiesgo}</strong>
          </span>
        </div>
      </section>

      {alumnosFiltrados.length === 0 ? (
        <div className="calificaciones-empty">
          No hay alumnos que coincidan con los filtros actuales.
        </div>
      ) : (
        <section className="calificaciones-grid-pro">
          {alumnosFiltrados.map((alumno, index) => {
            const estadoClass = getRendimientoKey(alumno.promedio);
            const estadoLabel = getRendimientoLabel(alumno.promedio);

            return (
              <article key={alumno.id} className="cal-card-pro">
                <div className="cal-card-header">
                  <div className="cal-card-title-wrap">
                    <div className="cal-rank-badge">#{index + 1}</div>

                    <div>
                      <h3>{alumno.nombre}</h3>
                      <p>{alumno.cursoNombre || "Sin curso"}</p>
                      <small>{alumno.cursoId || "-"}</small>
                    </div>
                  </div>

                  <span className={`cal-badge ${estadoClass}`}>
                    {estadoLabel}
                  </span>
                </div>

                <div className="cal-card-stats">
                  <div className="cal-stat-box">
                    <span>Promedio</span>
                    <strong>{alumno.promedio}</strong>
                  </div>

                  <div className="cal-stat-box">
                    <span>Notas</span>
                    <strong>{alumno.notas.length}</strong>
                  </div>

                  <div className="cal-stat-box">
                    <span>Última nota</span>
                    <strong>
                      {alumno.ultimaNota !== null ? alumno.ultimaNota : "-"}
                    </strong>
                  </div>

                  <div className="cal-stat-box">
                    <span>Clases evaluadas</span>
                    <strong>{alumno.clasesConNota}</strong>
                  </div>
                </div>

                <div className="cal-progress-block">
                  <div className="cal-progress-head">
                    <span>Rendimiento general</span>
                    <strong>{Math.min(100, alumno.promedio * 10)}%</strong>
                  </div>

                  <div className="cal-progress-bar">
                    <div
                      className={`cal-progress-fill ${estadoClass}`}
                      style={{ width: `${Math.min(100, alumno.promedio * 10)}%` }}
                    />
                  </div>
                </div>

                <div className="cal-notas-section">
                  <span className="cal-notas-label">Notas registradas</span>

                  <div className="cal-notas-chips">
                    {alumno.notas.length > 0 ? (
                      alumno.notas.map((nota, notaIndex) => (
                        <span
                          key={`${alumno.id}-${notaIndex}`}
                          className="cal-nota-chip"
                        >
                          {nota}
                        </span>
                      ))
                    ) : (
                      <span className="cal-no-notes">Sin notas registradas</span>
                    )}
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

function calcularPromedio(notas) {
  if (!notas.length) return 0;
  return round1(notas.reduce((acc, item) => acc + item, 0) / notas.length);
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

function getCursoInfo(alumno, clase, cursos) {
  const cursoEncontrado = cursos.find(
    (curso) =>
      String(curso.id) === String(alumno.cursoId || clase.cursoId || alumno.curso) ||
      normalizeText(curso.nombre) === normalizeText(alumno.curso || clase.curso)
  );

  return {
    id: cursoEncontrado?.id || alumno.cursoId || clase.cursoId || alumno.curso || "-",
    nombre: cursoEncontrado?.nombre || clase.curso || alumno.curso || "Sin curso",
  };
}