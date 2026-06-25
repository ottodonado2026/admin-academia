import { useEffect, useMemo, useState } from "react";
import "./ProfesorAsistenciaPage.css";

const STORAGE_KEYS = {
  user: "user",
  clases: "clases",
  cursos: "planesCursos",
};

import { useProfesorData } from "./hooks/useProfesorData";

const ESTADOS_EDITABLES = ["programada", "reprogramada", "completada"];

import { supabase } from "../../services/supabaseClient";
import { CURSOS_BASE } from "../../data/cursosBase";

function formatAMPM(timeStr) {
  if (!timeStr) return "--:--";
  const [hoursStr, minutesStr] = timeStr.split(':');
  if (!hoursStr || !minutesStr) return timeStr;
  let hours = parseInt(hoursStr, 10);
  const minutes = parseInt(minutesStr, 10);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; 
  return `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}

export default function ProfesorAsistenciaPage() {
  const [user, setUser] = useState(null);
  const { clases: misClasesRaw, loading, recargarDatos } = useProfesorData();
  const [cursos, setCursos] = useState([]);
  const [claseSeleccionadaId, setClaseSeleccionadaId] = useState(null);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("pendientes");

  useEffect(() => {
    const userDataStr = localStorage.getItem("user");
    setUser(userDataStr ? JSON.parse(userDataStr) : null);
    
    // Cursos from local storage since they are just a static list
    const cursosData = localStorage.getItem("planesCursos");
    setCursos(cursosData ? JSON.parse(cursosData) : []);
  }, []);

  const misClases = useMemo(() => {
    if (!user?.id || loading) return [];

    return misClasesRaw
      .map(normalizarClaseLegacy)
      .sort((a, b) => {
        const aDate = new Date(`${a.fecha}T${a.horaInicio || a.hora || "00:00"}`).getTime();
        const bDate = new Date(`${b.fecha}T${b.horaInicio || b.hora || "00:00"}`).getTime();
        return bDate - aDate;
      });
  }, [misClasesRaw, user, loading]);

  const clasesFiltradas = useMemo(() => {
    const term = normalizeText(busqueda);

    return misClases.filter((clase) => {
      const matchBusqueda =
        !term ||
        normalizeText(clase.curso).includes(term) ||
        normalizeText(clase.tema).includes(term) ||
        (clase.alumnos || []).some((alumno) =>
          normalizeText(alumno.nombre).includes(term)
        );

      let matchEstado = true;

      if (filtroEstado === "pendientes") {
        matchEstado = !clase.asistenciaCerrada;
      } else if (filtroEstado === "cerradas") {
        matchEstado = !!clase.asistenciaCerrada;
      } else if (filtroEstado === "completadas") {
        matchEstado = clase.estado === "completada";
      }

      return matchBusqueda && matchEstado;
    });
  }, [misClases, busqueda, filtroEstado]);

  const claseBase = useMemo(() => {
    if (!claseSeleccionadaId) return null;
    return misClases.find((clase) => String(clase.id) === String(claseSeleccionadaId)) || null;
  }, [misClases, claseSeleccionadaId]);

  const [claseEdicion, setClaseEdicion] = useState(null);

  useEffect(() => {
    setClaseEdicion(claseBase);
  }, [claseBase]);

  useEffect(() => {
    if (!claseSeleccionadaId && clasesFiltradas.length > 0) {
      setClaseSeleccionadaId(clasesFiltradas[0].id);
    }

    if (
      claseSeleccionadaId &&
      clasesFiltradas.length > 0 &&
      !clasesFiltradas.some((clase) => String(clase.id) === String(claseSeleccionadaId))
    ) {
      setClaseSeleccionadaId(clasesFiltradas[0].id);
    }

    if (clasesFiltradas.length === 0) {
      setClaseSeleccionadaId(null);
    }
  }, [clasesFiltradas, claseSeleccionadaId]);

  const stats = useMemo(() => {
    const hoy = new Date().toISOString().split("T")[0];

    let registrosHoy = 0;
    let horasHoy = 0;
    let avanceAcumulado = 0;
    let alumnosUnicos = new Map();

    misClases.forEach((clase) => {
      const esHoy = clase.fecha === hoy;

      (clase.alumnos || []).forEach((alumno) => {
        const horasAlumno = calcularHorasAcumuladasAlumno(alumno.id, misClases);
        const horasObjetivo = getHorasObjetivoCurso(clase, CURSOS_BASE, alumno);
        const progreso = calcularPorcentaje(horasAlumno, horasObjetivo);

        if (!alumnosUnicos.has(alumno.id)) {
          alumnosUnicos.set(alumno.id, progreso);
        }

        if (esHoy && alumno.asistio) {
          registrosHoy += 1;
        }

        if (esHoy) {
          horasHoy += calcularHorasGanadasEnClase(clase, alumno);
        }

        avanceAcumulado += progreso;
      });
    });

    const pendientes = misClases.filter((clase) => !clase.asistenciaCerrada).length;
    const totalAlumnosRegistros = misClases.reduce(
      (acc, clase) => acc + (clase.alumnos?.length || 0),
      0
    );

    const promedioAvance =
      totalAlumnosRegistros > 0
        ? Math.round(avanceAcumulado / totalAlumnosRegistros)
        : 0;

    return {
      pendientes,
      registrosHoy,
      horasHoy: round2(horasHoy),
      promedioAvance,
    };
  }, [misClases]);

  const actualizarAlumno = async (claseId, alumnoId, cambios) => {
    if (!claseEdicion || claseEdicion.id !== claseId) return;

    const alumnosActualizados = (claseEdicion.alumnos || []).map((alumno) => {
      if (String(alumno.id) !== String(alumnoId)) return alumno;

      const updated = {
        ...alumno,
        ...cambios,
      };

      if (Object.prototype.hasOwnProperty.call(cambios, "asistio") && !cambios.asistio) {
        updated.sumaHoras = false;
      }

      return updated;
    });

    setClaseEdicion((prev) => ({
      ...prev,
      alumnos: alumnosActualizados,
      updatedAt: new Date().toISOString(),
    }));

    // Optimistic background save
    await supabase.from("clases").update({ alumnos: alumnosActualizados }).eq("id", claseId);
  };

  const actualizarClase = async (claseId, cambios) => {
    if (!claseEdicion || claseEdicion.id !== claseId) return;

    setClaseEdicion((prev) => ({
      ...prev,
      ...cambios,
      updatedAt: new Date().toISOString(),
    }));

    await supabase.from("clases").update(cambios).eq("id", claseId);
  };

  const guardarAsistencia = async () => {
    if (!claseEdicion) return;
    await supabase.from("clases").update({
      alumnos: claseEdicion.alumnos,
    }).eq("id", claseEdicion.id);
    await recargarDatos();
    alert("Asistencia guardada correctamente");
  };

  const cerrarAsistencia = async () => {
    if (!claseEdicion) return;

    const tieneAsistenciaRegistrada = (claseEdicion.alumnos || []).some(
      (alumno) => alumno.asistio || alumno.sumaHoras || Number(alumno.horasManual || 0) > 0
    );

    if (!tieneAsistenciaRegistrada) {
      const confirmar = window.confirm(
        "Esta clase no tiene registros marcados todavía. ¿Deseas cerrarla de todos modos?"
      );
      if (!confirmar) return;
    }

    const estadoFinal =
      claseEdicion.estado === "programada" || claseEdicion.estado === "reprogramada"
        ? "completada"
        : claseEdicion.estado;

    await supabase.from("clases").update({
      asistenciaCerrada: true,
      estado: estadoFinal,
      alumnos: claseEdicion.alumnos,
    }).eq("id", claseEdicion.id);

    await recargarDatos();
    alert("Asistencia cerrada y horas consolidadas");
  };

  const reabrirAsistencia = async () => {
    if (!claseEdicion) return;

    const confirmar = window.confirm(
      "¿Deseas reabrir esta asistencia para seguir editándola?"
    );
    if (!confirmar) return;

    await supabase.from("clases").update({
      asistenciaCerrada: false,
    }).eq("id", claseEdicion.id);

    await recargarDatos();
    alert("Asistencia reabierta");
  };

  return (
    <div className="profesor-asistencia-page">
      <section className="asistencia-hero">
        <div>
          <h1>Asistencia y progreso</h1>
          <p>
            Registra asistencia, suma horas automáticamente o manualmente y
            visualiza el avance real de cada alumno por curso.
          </p>
        </div>

        <div className="asistencia-kpis">
          <div className="asistencia-kpi">
            <span>Pendientes</span>
            <strong>{stats.pendientes}</strong>
          </div>

          <div className="asistencia-kpi">
            <span>Asistencias hoy</span>
            <strong>{stats.registrosHoy}</strong>
          </div>

          <div className="asistencia-kpi">
            <span>Horas hoy</span>
            <strong>{stats.horasHoy}h</strong>
          </div>

          <div className="asistencia-kpi">
            <span>Promedio avance</span>
            <strong>{stats.promedioAvance}%</strong>
          </div>
        </div>
      </section>

      <section className="asistencia-layout">
        <aside className="asistencia-sidebar">
          <div className="asistencia-sidebar-card">
            <div className="section-head">
              <div>
                <h2>Clases</h2>
                <p>Selecciona una sesión para registrar asistencia.</p>
              </div>
            </div>

            <div className="asistencia-toolbar">
              <input
                type="text"
                placeholder="Buscar curso o alumno"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />

              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
              >
                <option value="pendientes">Pendientes</option>
                <option value="cerradas">Cerradas</option>
                <option value="completadas">Completadas</option>
                <option value="todas">Todas</option>
              </select>
            </div>

            <div className="asistencia-clases-list">
              {clasesFiltradas.length === 0 && (
                <div className="empty-state">
                  No hay clases que coincidan con los filtros.
                </div>
              )}

              {clasesFiltradas.map((clase) => {
                const totalAlumnos = clase.alumnos?.length || 0;
                const asistieron = (clase.alumnos || []).filter((a) => a.asistio).length;
                const claseActiva =
                  String(clase.id) === String(claseSeleccionadaId);

                return (
                  <button
                    key={clase.id}
                    type="button"
                    className={`asistencia-clase-item ${claseActiva ? "active" : ""}`}
                    onClick={() => setClaseSeleccionadaId(clase.id)}
                  >
                    <div className="asistencia-clase-item-top">
                      <div>
                        <strong>{clase.curso || "Clase sin curso"}</strong>
                        <p>{clase.tema || "Sin tema definido"}</p>
                      </div>

                      <span
                        className={`badge-status ${
                          clase.asistenciaCerrada ? "closed" : "open"
                        }`}
                      >
                        {clase.asistenciaCerrada ? "Cerrada" : "Pendiente"}
                      </span>
                    </div>

                    <div className="asistencia-clase-item-meta">
                      <span>{clase.fecha}</span>
                      <span>{clase.horaInicio || clase.hora || "--:--"}</span>
                      <span>{round2(Number(clase.duracionHoras || 0))}h</span>
                    </div>

                    <div className="asistencia-clase-item-footer">
                      <small>
                        {asistieron}/{totalAlumnos} con asistencia marcada
                      </small>
                      <small className={`estado-inline estado-${clase.estado}`}>
                        {clase.estado}
                      </small>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="asistencia-detail">
          {!claseEdicion && (
            <div className="asistencia-detail-card empty-big">
              <h2>Selecciona una clase</h2>
              <p>
                Aquí verás el detalle de asistencia, progreso por alumno, horas
                acumuladas y acciones de cierre.
              </p>
            </div>
          )}

          {claseEdicion && (
            <div className="asistencia-detail-card">
              <div className="section-head detail-head">
                <div>
                  <h2>{claseEdicion.curso || "Clase sin curso"}</h2>
                  <p>
                    {claseEdicion.tema || "Sin tema definido"} ·{" "}
                    {claseEdicion.modalidad || "Sin modalidad"}
                  </p>
                </div>

                <div className="detail-status-group">
                  <span className={`badge-estado estado-${claseEdicion.estado}`}>
                    {claseEdicion.estado}
                  </span>

                  <span
                    className={`badge-status ${
                      claseEdicion.asistenciaCerrada ? "closed" : "open"
                    }`}
                  >
                    {claseEdicion.asistenciaCerrada
                      ? "Asistencia cerrada"
                      : "Asistencia editable"}
                  </span>
                </div>
              </div>

              <div className="detalle-grid">
                <div className="detalle-box">
                  <span>Fecha</span>
                  <strong>{claseEdicion.fecha}</strong>
                </div>

                <div className="detalle-box">
                  <span>Horario</span>
                  <strong>
                    {formatAMPM(claseEdicion.horaInicio || claseEdicion.hora)}
                    {" - "}
                    {claseEdicion.horaFin ? formatAMPM(claseEdicion.horaFin) : "--:--"}
                  </strong>
                </div>

                <div className="detalle-box">
                  <span>Duración</span>
                  <strong>{round2(Number(claseEdicion.duracionHoras || 0))}h</strong>
                </div>

                <div className="detalle-box">
                  <span>Alumnos</span>
                  <strong>{claseEdicion.alumnos?.length || 0}</strong>
                </div>
              </div>

              <div className="asistencia-actions-top">
                <button
                  type="button"
                  className="btn-secundario-pro"
                  onClick={guardarAsistencia}
                >
                  Guardar cambios
                </button>

                {!claseEdicion.asistenciaCerrada ? (
                  <button
                    type="button"
                    className="btn-principal-pro"
                    onClick={cerrarAsistencia}
                  >
                    Cerrar asistencia
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn-secundario-pro"
                    onClick={reabrirAsistencia}
                  >
                    Reabrir asistencia
                  </button>
                )}
              </div>

              <div className="alumnos-asistencia-list">
                {(claseEdicion.alumnos || []).length === 0 && (
                  <div className="empty-state">
                    Esta clase no tiene alumnos registrados.
                  </div>
                )}

                {(claseEdicion.alumnos || []).map((alumno) => {
                  const horasAcumuladas = calcularHorasAcumuladasAlumno(
                    alumno.id,
                    misClasesRaw
                  );
                  const horasObjetivo = getHorasObjetivoCurso(
                    claseEdicion,
                    CURSOS_BASE,
                    alumno
                  );
                  const porcentaje = calcularPorcentaje(
                    horasAcumuladas,
                    horasObjetivo
                  );
                  const horasClase = calcularHorasGanadasEnClase(
                    claseEdicion,
                    alumno
                  );
                  const editable = ESTADOS_EDITABLES.includes(claseEdicion.estado);

                  return (
                    <article key={alumno.id} className="alumno-progress-card">
                      <div className="alumno-progress-top">
                        <div>
                          <h3>{alumno.nombre}</h3>
                          <p>
                            Curso: {renderNombreCurso(claseEdicion, CURSOS_BASE, alumno)}
                          </p>
                        </div>

                        <div className="alumno-progress-badges">
                          <span className={`mini-badge ${porcentaje >= 80 ? "ok" : porcentaje >= 40 ? "warn" : "danger"}`}>
                            {porcentaje >= 80
                              ? "Al día"
                              : porcentaje >= 40
                              ? "En progreso"
                              : "Atrasado"}
                          </span>

                          <span className="mini-badge neutral">
                            +{round2(horasClase)}h en esta clase
                          </span>
                        </div>
                      </div>

                      <div className="alumno-meta-grid">
                        <div className="mini-box">
                          <span>Acumuladas</span>
                          <strong>{round2(horasAcumuladas)}h</strong>
                        </div>

                        <div className="mini-box">
                          <span>Objetivo</span>
                          <strong>{round2(horasObjetivo)}h</strong>
                        </div>

                        <div className="mini-box">
                          <span>Progreso</span>
                          <strong>{porcentaje}%</strong>
                        </div>

                        <div className="mini-box">
                          <span>Estado pago</span>
                          <strong>{alumno.estadoPago || "Sin plan"}</strong>
                        </div>
                      </div>

                      <div className="progress-block">
                        <div className="progress-labels">
                          <span>Avance del alumno</span>
                          <strong>{round2(horasAcumuladas)} / {round2(horasObjetivo)}h</strong>
                        </div>

                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{ width: `${porcentaje}%` }}
                          />
                        </div>
                      </div>

                      <div className="alumno-controls-grid">
                        <label className="check-card">
                          <input
                            type="checkbox"
                            checked={!!alumno.asistio}
                            disabled={!editable || claseEdicion.asistenciaCerrada}
                            onChange={(e) =>
                              actualizarAlumno(claseEdicion.id, alumno.id, {
                                asistio: e.target.checked,
                              })
                            }
                          />
                          <span>Asistió</span>
                        </label>

                        <label className="check-card">
                          <input
                            type="checkbox"
                            checked={!!alumno.sumaHoras}
                            disabled={
                              !editable ||
                              claseEdicion.asistenciaCerrada ||
                              !alumno.asistio
                            }
                            onChange={(e) =>
                              actualizarAlumno(claseEdicion.id, alumno.id, {
                                sumaHoras: e.target.checked,
                              })
                            }
                          />
                          <span>Sumar horas automáticas</span>
                        </label>

                        <div className="input-group-mini">
                          <label>Ajuste manual (h)</label>
                          <input
                            type="number"
                            min="-10"
                            max="10"
                            step="0.5"
                            value={alumno.horasManual || ""}
                            disabled={!editable || claseEdicion.asistenciaCerrada}
                            onChange={(e) =>
                              actualizarAlumno(claseEdicion.id, alumno.id, {
                                horasManual: Number(e.target.value) || 0,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="alumno-observacion">
                        <label>Observación del alumno</label>
                        <textarea
                          placeholder="Ej: llegó tarde, repaso módulo 2, excelente avance..."
                          value={alumno.observacion || ""}
                          disabled={!editable || claseEdicion.asistenciaCerrada}
                          onChange={(e) =>
                            actualizarAlumno(claseEdicion.id, alumno.id, {
                              observacion: e.target.value,
                            })
                          }
                        />
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </section>
    </div>
  );
}

function safeParse(value, fallback) {
  try {
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function round2(value) {
  return Number(Number(value || 0).toFixed(2));
}

function calcularPorcentaje(actual, total) {
  if (!total || total <= 0) return 0;
  return Math.min(100, Math.round((Number(actual || 0) / Number(total || 1)) * 100));
}

function normalizarClaseLegacy(clase) {
  const alumnosNormalizados = Array.isArray(clase.alumnos)
    ? clase.alumnos.map((alumno) => ({
        ...alumno,
        asistio: Boolean(alumno.asistio),
        sumaHoras: Boolean(alumno.sumaHoras),
        horasManual: Number(alumno.horasManual || 0),
        observacion: alumno.observacion || "",
      }))
    : [];

  return {
    ...clase,
    horaInicio: clase.horaInicio || clase.hora || "",
    horaFin: clase.horaFin || "",
    duracionHoras: Number(clase.duracionHoras || 1),
    tema: clase.tema || "",
    asistenciaCerrada: Boolean(clase.asistenciaCerrada),
    alumnos: alumnosNormalizados,
  };
}

function getHorasObjetivoCurso(clase, cursos, alumno) {
  const cursoById = cursos.find(
    (curso) => String(curso.id) === String(clase.cursoId || alumno?.cursoId)
  );

  let horasBase = cursoById?.horasTotales || 24;

  if (alumno?.duracion && !isNaN(Number(alumno.duracion))) {
    const meses = Number(alumno.duracion);
    const modalidad = (alumno.modalidad || "regular").toLowerCase();
    const clasesPorMes = cursoById?.modalidades?.[modalidad] || 4;
    const horasPorClase = (cursoById?.horasPorModulo / cursoById?.clasesPorModulo) || 2;
    const horasCalculadas = meses * clasesPorMes * horasPorClase;
    if (horasCalculadas > 0) {
      horasBase = horasCalculadas;
    }
  }

  return horasBase;
}

function renderNombreCurso(clase, cursos, alumno) {
  const cursoById = cursos.find(
    (curso) => String(curso.id) === String(clase.cursoId || alumno?.cursoId)
  );

  return cursoById?.nombre || clase.curso || alumno?.curso || "Sin curso";
}

function calcularHorasGanadasEnClase(clase, alumno) {
  const horasBase =
    alumno.asistio && alumno.sumaHoras ? Number(clase.duracionHoras || 0) : 0;

  const ajusteManual = Number(alumno.horasManual || 0);

  return round2(horasBase + ajusteManual);
}

function calcularHorasAcumuladasAlumno(alumnoId, clases) {
  return round2(
    clases.reduce((acc, clase) => {
      if (clase.estado !== "completada" && !clase.asistenciaCerrada) {
        return acc;
      }

      const alumno = (clase.alumnos || []).find(
        (item) => String(item.id) === String(alumnoId)
      );

      if (!alumno) return acc;

      return acc + calcularHorasGanadasEnClase(clase, alumno);
    }, 0)
  );
}