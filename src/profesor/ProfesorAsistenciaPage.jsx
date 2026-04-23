import { useEffect, useMemo, useState } from "react";
import "./ProfesorAsistenciaPage.css";

const STORAGE_KEYS = {
  user: "user",
  clases: "clases",
  cursos: "planesCursos",
};

const ESTADOS_EDITABLES = ["programada", "reprogramada", "completada"];

export default function ProfesorAsistenciaPage() {
  const [user, setUser] = useState(null);
  const [clases, setClases] = useState([]);
  const [cursos, setCursos] = useState([]);
  const [claseSeleccionadaId, setClaseSeleccionadaId] = useState(null);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("pendientes");

  useEffect(() => {
    const userData = safeParse(localStorage.getItem(STORAGE_KEYS.user), null);
    const clasesData = safeParse(localStorage.getItem(STORAGE_KEYS.clases), []);
    const cursosData = safeParse(localStorage.getItem(STORAGE_KEYS.cursos), []);

    setUser(userData);
    setClases(Array.isArray(clasesData) ? clasesData : []);
    setCursos(Array.isArray(cursosData) ? cursosData : []);
  }, []);

  const misClases = useMemo(() => {
    if (!user?.id) return [];

    return clases
      .filter((clase) => String(clase.profesorId) === String(user.id))
      .map(normalizarClaseLegacy)
      .sort((a, b) => {
        const aDate = new Date(`${a.fecha}T${a.horaInicio || a.hora || "00:00"}`).getTime();
        const bDate = new Date(`${b.fecha}T${b.horaInicio || b.hora || "00:00"}`).getTime();
        return bDate - aDate;
      });
  }, [clases, user]);

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

  const claseSeleccionada = useMemo(() => {
    if (!claseSeleccionadaId) return null;
    return misClases.find((clase) => String(clase.id) === String(claseSeleccionadaId)) || null;
  }, [misClases, claseSeleccionadaId]);

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
        const horasObjetivo = getHorasObjetivoCurso(clase, cursos, alumno);
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
  }, [misClases, cursos]);

  const actualizarClaseLocal = (claseId, updater) => {
    const clasesActualizadas = clases.map((claseOriginal) => {
      if (String(claseOriginal.id) !== String(claseId)) return claseOriginal;

      const claseNormalizada = normalizarClaseLegacy(claseOriginal);
      const claseFinal = updater(claseNormalizada);

      return {
        ...claseOriginal,
        ...claseFinal,
      };
    });

    setClases(clasesActualizadas);
  };

  const actualizarAlumno = (claseId, alumnoId, cambios) => {
    actualizarClaseLocal(claseId, (clase) => {
      const alumnosActualizados = (clase.alumnos || []).map((alumno) => {
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

      return {
        ...clase,
        alumnos: alumnosActualizados,
        updatedAt: new Date().toISOString(),
      };
    });
  };

  const actualizarClase = (claseId, cambios) => {
    actualizarClaseLocal(claseId, (clase) => ({
      ...clase,
      ...cambios,
      updatedAt: new Date().toISOString(),
    }));
  };

  const guardarAsistencia = () => {
    localStorage.setItem(STORAGE_KEYS.clases, JSON.stringify(clases));
    alert("Asistencia guardada correctamente");
  };

  const cerrarAsistencia = () => {
    if (!claseSeleccionada) return;

    const tieneAsistenciaRegistrada = (claseSeleccionada.alumnos || []).some(
      (alumno) => alumno.asistio || alumno.sumaHoras || Number(alumno.horasManual || 0) > 0
    );

    if (!tieneAsistenciaRegistrada) {
      const confirmar = window.confirm(
        "Esta clase no tiene registros marcados todavía. ¿Deseas cerrarla de todos modos?"
      );
      if (!confirmar) return;
    }

    actualizarClase(claseSeleccionada.id, {
      asistenciaCerrada: true,
      estado:
        claseSeleccionada.estado === "programada" ||
        claseSeleccionada.estado === "reprogramada"
          ? "completada"
          : claseSeleccionada.estado,
    });

    const clasesActualizadas = clases.map((claseOriginal) => {
      if (String(claseOriginal.id) !== String(claseSeleccionada.id)) return claseOriginal;

      const claseNormalizada = normalizarClaseLegacy(claseOriginal);

      return {
        ...claseOriginal,
        ...claseNormalizada,
        asistenciaCerrada: true,
        estado:
          claseNormalizada.estado === "programada" ||
          claseNormalizada.estado === "reprogramada"
            ? "completada"
            : claseNormalizada.estado,
        updatedAt: new Date().toISOString(),
      };
    });

    setClases(clasesActualizadas);
    localStorage.setItem(STORAGE_KEYS.clases, JSON.stringify(clasesActualizadas));
    alert("Asistencia cerrada y horas consolidadas");
  };

  const reabrirAsistencia = () => {
    if (!claseSeleccionada) return;

    const confirmar = window.confirm(
      "¿Deseas reabrir esta asistencia para seguir editándola?"
    );
    if (!confirmar) return;

    const clasesActualizadas = clases.map((claseOriginal) => {
      if (String(claseOriginal.id) !== String(claseSeleccionada.id)) return claseOriginal;

      const claseNormalizada = normalizarClaseLegacy(claseOriginal);

      return {
        ...claseOriginal,
        ...claseNormalizada,
        asistenciaCerrada: false,
        updatedAt: new Date().toISOString(),
      };
    });

    setClases(clasesActualizadas);
    localStorage.setItem(STORAGE_KEYS.clases, JSON.stringify(clasesActualizadas));
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
          {!claseSeleccionada && (
            <div className="asistencia-detail-card empty-big">
              <h2>Selecciona una clase</h2>
              <p>
                Aquí verás el detalle de asistencia, progreso por alumno, horas
                acumuladas y acciones de cierre.
              </p>
            </div>
          )}

          {claseSeleccionada && (
            <div className="asistencia-detail-card">
              <div className="section-head detail-head">
                <div>
                  <h2>{claseSeleccionada.curso || "Clase sin curso"}</h2>
                  <p>
                    {claseSeleccionada.tema || "Sin tema definido"} ·{" "}
                    {claseSeleccionada.modalidad || "Sin modalidad"}
                  </p>
                </div>

                <div className="detail-status-group">
                  <span className={`badge-estado estado-${claseSeleccionada.estado}`}>
                    {claseSeleccionada.estado}
                  </span>

                  <span
                    className={`badge-status ${
                      claseSeleccionada.asistenciaCerrada ? "closed" : "open"
                    }`}
                  >
                    {claseSeleccionada.asistenciaCerrada
                      ? "Asistencia cerrada"
                      : "Asistencia editable"}
                  </span>
                </div>
              </div>

              <div className="detalle-grid">
                <div className="detalle-box">
                  <span>Fecha</span>
                  <strong>{claseSeleccionada.fecha}</strong>
                </div>

                <div className="detalle-box">
                  <span>Horario</span>
                  <strong>
                    {claseSeleccionada.horaInicio || claseSeleccionada.hora || "--:--"}
                    {" - "}
                    {claseSeleccionada.horaFin || "--:--"}
                  </strong>
                </div>

                <div className="detalle-box">
                  <span>Duración</span>
                  <strong>{round2(Number(claseSeleccionada.duracionHoras || 0))}h</strong>
                </div>

                <div className="detalle-box">
                  <span>Alumnos</span>
                  <strong>{claseSeleccionada.alumnos?.length || 0}</strong>
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

                {!claseSeleccionada.asistenciaCerrada ? (
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
                {(claseSeleccionada.alumnos || []).length === 0 && (
                  <div className="empty-state">
                    Esta clase no tiene alumnos registrados.
                  </div>
                )}

                {(claseSeleccionada.alumnos || []).map((alumno) => {
                  const horasAcumuladas = calcularHorasAcumuladasAlumno(
                    alumno.id,
                    misClases
                  );
                  const horasObjetivo = getHorasObjetivoCurso(
                    claseSeleccionada,
                    cursos,
                    alumno
                  );
                  const porcentaje = calcularPorcentaje(
                    horasAcumuladas,
                    horasObjetivo
                  );
                  const horasClase = calcularHorasGanadasEnClase(
                    claseSeleccionada,
                    alumno
                  );
                  const editable = ESTADOS_EDITABLES.includes(claseSeleccionada.estado);

                  return (
                    <article key={alumno.id} className="alumno-progress-card">
                      <div className="alumno-progress-top">
                        <div>
                          <h3>{alumno.nombre}</h3>
                          <p>
                            Curso: {renderNombreCurso(claseSeleccionada, cursos, alumno)}
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
                            disabled={!editable || claseSeleccionada.asistenciaCerrada}
                            onChange={(e) =>
                              actualizarAlumno(claseSeleccionada.id, alumno.id, {
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
                              claseSeleccionada.asistenciaCerrada ||
                              !alumno.asistio
                            }
                            onChange={(e) =>
                              actualizarAlumno(claseSeleccionada.id, alumno.id, {
                                sumaHoras: e.target.checked,
                              })
                            }
                          />
                          <span>Sumar horas automáticas</span>
                        </label>

                        <label className="input-card">
                          <span>Ajuste manual (h)</span>
                          <input
                            type="number"
                            min="0"
                            step="0.5"
                            value={alumno.horasManual ?? 0}
                            disabled={!editable || claseSeleccionada.asistenciaCerrada}
                            onChange={(e) =>
                              actualizarAlumno(claseSeleccionada.id, alumno.id, {
                                horasManual: Number(e.target.value || 0),
                              })
                            }
                          />
                        </label>
                      </div>

                      <div className="observacion-block">
                        <label>
                          <span>Observación del alumno</span>
                          <textarea
                            rows="3"
                            placeholder="Ej: llegó tarde, repaso módulo 2, excelente avance..."
                            value={alumno.observacion || ""}
                            disabled={!editable || claseSeleccionada.asistenciaCerrada}
                            onChange={(e) =>
                              actualizarAlumno(claseSeleccionada.id, alumno.id, {
                                observacion: e.target.value,
                              })
                            }
                          />
                        </label>
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

  const posiblesCampos = [
    cursoById?.horasTotales,
    cursoById?.duracionHoras,
    cursoById?.totalHoras,
    cursoById?.horas,
  ];

  const encontrada = posiblesCampos.find(
    (valor) => valor !== undefined && valor !== null && Number(valor) > 0
  );

  return Number(encontrada || 24);
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