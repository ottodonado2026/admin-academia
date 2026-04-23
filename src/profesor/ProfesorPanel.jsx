import { useEffect, useMemo, useState } from "react";
import "./ProfesorPanel.css";

function ProfesorPanel() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [clases, setClases] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [profesores, setProfesores] = useState([]);
  const [claseSeleccionada, setClaseSeleccionada] = useState(null);
  const [alumnoExtraId, setAlumnoExtraId] = useState("");
  const [alumnosSeleccionados, setAlumnosSeleccionados] = useState([]);
  const [seccionActiva, setSeccionActiva] = useState("clases");

  const [nuevaClase, setNuevaClase] = useState({
    curso: "",
    fecha: "",
    hora: "",
    modalidad: "presencial",
    alumnoId: "",
    alumnosIds: [],
  });

  const getAlumnosClase = (clase) => {
    if (Array.isArray(clase?.alumnos) && clase.alumnos.length > 0) {
      return clase.alumnos;
    }

    const legacy = [];

    if (clase?.alumnoId || clase?.alumnoNombre) {
      legacy.push({
        id: clase.alumnoId,
        nombre: clase.alumnoNombre,
        estadoPago: getEstadoPago(clase.alumnoId),
        curso: getAlumnoById(clase.alumnoId)?.curso || "-",
        asistio: true,
        sumaHoras: true,
      });
    }

    (clase?.alumnosExtra || []).forEach((a) => {
      legacy.push({
        id: a.id,
        nombre: a.nombre,
        estadoPago: a.estadoPago || getEstadoPago(a.id),
        curso: a.curso || getAlumnoById(a.id)?.curso || "-",
        asistio: true,
        sumaHoras: true,
      });
    });

    return legacy;
  };

  useEffect(() => {
    const allClases = JSON.parse(localStorage.getItem("clases") || "[]");
    const misClases = allClases.filter(
      (c) => String(c.profesorId) === String(user?.id)
    );
    setClases(misClases);

    setAlumnos(JSON.parse(localStorage.getItem("alumnos") || "[]"));
    setPagos(JSON.parse(localStorage.getItem("pagos") || "[]"));
    setProfesores(JSON.parse(localStorage.getItem("profesores") || "[]"));
  }, [user?.id]);

  const profesorActual = useMemo(() => {
    return profesores.find((p) => String(p.id) === String(user?.id)) || null;
  }, [profesores, user?.id]);

  const cursosProfesor = useMemo(() => {
    if (!profesorActual) return [];

    if (Array.isArray(profesorActual.cursos)) {
      return profesorActual.cursos.filter(Boolean);
    }

    if (typeof profesorActual.especialidad === "string") {
      return profesorActual.especialidad
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean);
    }

    return [];
  }, [profesorActual]);

  const getEstadoPago = (alumnoId) => {
    let plan = pagos.find((p) => String(p.alumnoId) === String(alumnoId));

    if (!plan) {
      const alumno = alumnos.find((a) => String(a.id) === String(alumnoId));
      if (alumno) {
        plan = pagos.find((p) => p.alumno === alumno.nombre);
      }
    }

    return plan?.estado || "Sin plan";
  };

  const getAlumnoById = (alumnoId) => {
    return alumnos.find((a) => String(a.id) === String(alumnoId));
  };

  const guardarClases = (nuevas) => {
    localStorage.setItem("clases", JSON.stringify(nuevas));
    setClases(nuevas.filter((c) => String(c.profesorId) === String(user?.id)));
  };

  const agregarAlumnoSeleccionado = () => {
    if (!nuevaClase.alumnoId) {
      alert("Selecciona un alumno");
      return;
    }

    const alumno = getAlumnoById(nuevaClase.alumnoId);

    if (!alumno) {
      alert("Alumno no encontrado");
      return;
    }

    const yaExiste = alumnosSeleccionados.some(
      (a) => String(a.id) === String(alumno.id)
    );

    if (yaExiste) {
      alert("Ese alumno ya fue agregado");
      return;
    }

    setAlumnosSeleccionados((prev) => [
      ...prev,
      {
        id: alumno.id,
        nombre: alumno.nombre,
        estado: getEstadoPago(alumno.id),
      },
    ]);

    setNuevaClase((prev) => ({
      ...prev,
      alumnoId: "",
    }));
  };

  const quitarAlumnoSeleccionado = (id) => {
    setAlumnosSeleccionados((prev) =>
      prev.filter((a) => String(a.id) !== String(id))
    );
  };

  const crearClase = () => {
    if (!nuevaClase.curso || !nuevaClase.fecha || !nuevaClase.hora) {
      alert("Completa todos los campos");
      return;
    }

    if (alumnosSeleccionados.length === 0) {
      alert("Debes agregar al menos un alumno");
      return;
    }

    const hayMorosos = alumnosSeleccionados.some(
      (a) => getEstadoPago(a.id) === "En mora"
    );

    if (hayMorosos) {
      alert("Uno de los alumnos está en mora ❌");
      return;
    }

    const todas = JSON.parse(localStorage.getItem("clases") || "[]");

    const nueva = {
      id: Date.now(),
      profesorId: user.id,
      curso: nuevaClase.curso,
      fecha: nuevaClase.fecha,
      hora: nuevaClase.hora,
      modalidad: nuevaClase.modalidad,
      estado: "activa",
      duracionHoras: 1,
      alumnos: alumnosSeleccionados.map((a) => ({
        id: a.id,
        nombre: a.nombre,
        estadoPago: a.estado,
        curso: getAlumnoById(a.id)?.curso || "-",
        asistio: true,
        sumaHoras: true,
      })),
      createdAt: new Date().toISOString(),
    };

    guardarClases([nueva, ...todas]);

    setNuevaClase({
      curso: "",
      fecha: "",
      hora: "",
      modalidad: "presencial",
      alumnoId: "",
      alumnosIds: [],
    });

    setAlumnosSeleccionados([]);
  };

  const calcularProgresoAlumno = (alumnoId) => {
    const todasClases = JSON.parse(localStorage.getItem("clases") || "[]");

    const clasesAlumno = todasClases.filter((c) =>
      getAlumnosClase(c).some((a) => String(a.id) === String(alumnoId))
    );

    let horas = 0;

    clasesAlumno.forEach((c) => {
      const alumno = getAlumnosClase(c).find(
        (a) => String(a.id) === String(alumnoId)
      );

      if (c.estado === "completada" && alumno?.sumaHoras) {
        horas += c.duracionHoras || 1;
      }
    });

    return horas;
  };

  const cambiarEstado = (id, estado) => {
    const todas = JSON.parse(localStorage.getItem("clases") || "[]");

    const actualizadas = todas.map((c) =>
      c.id === id ? { ...c, estado } : c
    );

    guardarClases(actualizadas);

    if (claseSeleccionada?.id === id) {
      setClaseSeleccionada(
        actualizadas.find((c) => String(c.id) === String(id)) || null
      );
    }
  };

  const abrirClase = (clase) => {
    setClaseSeleccionada(clase);
    setAlumnoExtraId("");
  };

  const agregarAlumnoExtra = () => {
    if (!claseSeleccionada || !alumnoExtraId) {
      alert("Selecciona un alumno");
      return;
    }

    const alumno = getAlumnoById(alumnoExtraId);
    if (!alumno) return;

    const estadoPago = getEstadoPago(alumnoExtraId);

    if (estadoPago === "En mora") {
      alert("Alumno en mora");
      return;
    }

    const todas = JSON.parse(localStorage.getItem("clases") || "[]");

    const actualizadas = todas.map((c) => {
      if (String(c.id) !== String(claseSeleccionada.id)) return c;

      const alumnosActuales = getAlumnosClase(c);

      const yaExiste = alumnosActuales.some(
        (a) => String(a.id) === String(alumnoExtraId)
      );

      if (yaExiste) {
        alert("Ya está en la clase");
        return c;
      }

      return {
        ...c,
        alumnos: [
          ...alumnosActuales,
          {
            id: alumno.id,
            nombre: alumno.nombre,
            estadoPago,
            curso: alumno.curso || "-",
            asistio: true,
            sumaHoras: true,
          },
        ],
      };
    });

    guardarClases(actualizadas);

    const actualizada = actualizadas.find(
      (c) => String(c.id) === String(claseSeleccionada.id)
    );

    setClaseSeleccionada(actualizada || null);
    setAlumnoExtraId("");
  };

  const actualizarAlumnoClase = (claseId, alumnoId, cambios) => {
    const todas = JSON.parse(localStorage.getItem("clases") || "[]");

    const actualizadas = todas.map((c) => {
      if (String(c.id) !== String(claseId)) return c;

      const alumnosActuales = getAlumnosClase(c);

      return {
        ...c,
        alumnos: alumnosActuales.map((a) =>
          String(a.id) === String(alumnoId) ? { ...a, ...cambios } : a
        ),
      };
    });

    guardarClases(actualizadas);

    const actualizada = actualizadas.find(
      (c) => String(c.id) === String(claseId)
    );

    if (claseSeleccionada && String(claseSeleccionada.id) === String(claseId)) {
      setClaseSeleccionada(actualizada || null);
    }
  };

  const alumnosDisponiblesParaAgregar = useMemo(() => {
    if (!claseSeleccionada) return alumnos;

    const claseActualizada = clases.find(
      (c) => String(c.id) === String(claseSeleccionada.id)
    );

    const alumnosActuales = getAlumnosClase(
      claseActualizada || claseSeleccionada
    );

    return alumnos.filter((a) => {
      const yaExiste = alumnosActuales.some(
        (x) => String(x.id) === String(a.id)
      );

      return !yaExiste && getEstadoPago(a.id) !== "En mora";
    });
  }, [alumnos, claseSeleccionada, clases, pagos]);

  const alumnosValidosModal = useMemo(() => {
    if (!claseSeleccionada) return [];

    return getAlumnosClase(claseSeleccionada).filter((a) => {
      const estado = getEstadoPago(a.id);
      return estado !== "En mora";
    });
  }, [claseSeleccionada, pagos, clases, alumnos]);

  const resumenAsistencia = useMemo(() => {
    let totalRegistros = 0;
    let totalAsistencias = 0;
    let totalHoras = 0;

    clases.forEach((clase) => {
      const alumnosClase = getAlumnosClase(clase);
      totalRegistros += alumnosClase.length;

      alumnosClase.forEach((a) => {
        if (a.asistio) totalAsistencias += 1;
        if (clase.estado === "completada" && a.sumaHoras) {
          totalHoras += clase.duracionHoras || 1;
        }
      });
    });

    return {
      totalRegistros,
      totalAsistencias,
      totalHoras,
      porcentajeAsistencia:
        totalRegistros > 0
          ? Math.round((totalAsistencias / totalRegistros) * 100)
          : 0,
    };
  }, [clases]);

  return (
    <div className="panel-profesor">
      <header className="panel-header">
        <div>
          <h1>Caribbean Studio Academy</h1>
          <p>Panel del profesor - Gestión de clases</p>
        </div>

        <div className="panel-badge">
          {profesorActual?.nombre || "Profesor"}
        </div>
      </header>

      <div className="panel-tabs">
        <button
          type="button"
          className={`panel-tab ${seccionActiva === "clases" ? "active" : ""}`}
          onClick={() => setSeccionActiva("clases")}
        >
          Clases
        </button>

        <button
          type="button"
          className={`panel-tab ${
            seccionActiva === "asistencia" ? "active" : ""
          }`}
          onClick={() => setSeccionActiva("asistencia")}
        >
          Asistencia
        </button>
      </div>

      {seccionActiva === "clases" && (
        <>
          <div className="kpis">
            <div className="kpi">
              <span>Clases</span>
              <strong>{clases.length}</strong>
            </div>

            <div className="kpi">
              <span>Activas</span>
              <strong>
                {clases.filter((c) => c.estado === "activa").length}
              </strong>
            </div>

            <div className="kpi">
              <span>Completadas</span>
              <strong>
                {clases.filter((c) => c.estado === "completada").length}
              </strong>
            </div>

            <div className="kpi">
              <span>Canceladas</span>
              <strong>
                {clases.filter((c) => c.estado === "cancelada").length}
              </strong>
            </div>
          </div>

          <div className="card">
            <h2>Agendar clase</h2>

            <div className="form">
              <select
                value={nuevaClase.curso}
                onChange={(e) =>
                  setNuevaClase({ ...nuevaClase, curso: e.target.value })
                }
              >
                <option value="">Seleccionar curso</option>
                {cursosProfesor.map((curso, i) => (
                  <option key={i} value={curso}>
                    {curso}
                  </option>
                ))}
              </select>

              <input
                type="date"
                value={nuevaClase.fecha}
                onChange={(e) =>
                  setNuevaClase({ ...nuevaClase, fecha: e.target.value })
                }
              />

              <input
                type="time"
                value={nuevaClase.hora}
                onChange={(e) =>
                  setNuevaClase({ ...nuevaClase, hora: e.target.value })
                }
              />

              <select
                value={nuevaClase.modalidad}
                onChange={(e) =>
                  setNuevaClase({ ...nuevaClase, modalidad: e.target.value })
                }
              >
                <option value="presencial">Presencial</option>
                <option value="virtual">Virtual</option>
              </select>

              <select
                value={nuevaClase.alumnoId}
                onChange={(e) =>
                  setNuevaClase({ ...nuevaClase, alumnoId: e.target.value })
                }
              >
                <option value="">Seleccionar alumno</option>
                {alumnos.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.nombre} - {getEstadoPago(a.id)}
                  </option>
                ))}
              </select>

              <button type="button" onClick={agregarAlumnoSeleccionado}>
                Agregar
              </button>

              <button type="button" onClick={crearClase}>
                Crear clase
              </button>

              <div className="alumnos-seleccionados">
                {alumnosSeleccionados.map((a, index) => (
                  <div
                    key={a.id}
                    className={`alumno-chip ${index === 0 ? "principal" : ""}`}
                  >
                    {a.nombre} · {a.estado}
                    <button
                      type="button"
                      className="alumno-chip-remove"
                      onClick={() => quitarAlumnoSeleccionado(a.id)}
                      title="Quitar alumno"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="card">
            <h2>Mis clases</h2>

            <div className="clases-list">
              {clases.map((c) => (
                <div
                  key={c.id}
                  className="clase-card"
                  onClick={() => abrirClase(c)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") abrirClase(c);
                  }}
                >
                  <div className="clase-card-top">
                    <span className="clase-curso">{c.curso}</span>
                    <span className={`estado ${c.estado}`}>{c.estado}</span>
                  </div>

                  <div className="clase-card-body">
                    <div className="clase-line">
                      {getAlumnosClase(c)
                        .map((a) => a.nombre)
                        .join(", ")}
                    </div>
                    <div className="clase-line">
                      {c.fecha} · {c.hora}
                    </div>
                    <div className="clase-line">{c.modalidad}</div>
                  </div>

                  <div className="acciones" onClick={(e) => e.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => cambiarEstado(c.id, "completada")}
                      title="Marcar completada"
                    >
                      ✔
                    </button>

                  <button
  type="button"
  onClick={() => solicitarEliminacion(c.id)}
  title="Solicitar eliminación"
>
  🗑
</button>
                  </div>
                </div>
              ))}

              {clases.length === 0 && (
                <div className="sin-clases">
                  No tienes clases registradas todavía.
                </div>
              )}
            </div>
          </div>

          {claseSeleccionada && (
            <div
              className="modal-overlay"
              onClick={() => setClaseSeleccionada(null)}
            >
              <div className="modal-card" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                  <div>
                    <span style={{ fontSize: "12px", color: "#aaa" }}>
                      {profesorActual?.nombre || "Profesor"}
                    </span>
                    <h2>{claseSeleccionada.curso}</h2>
                  </div>

                  <div className="modal-icons">
                    <span>🎓</span>
                    <span>📅</span>
                  </div>
                </div>

                <div className="modal-section">
                  <h3>Agregar alumno</h3>

                  <div className="extra-row">
                    <select
                      value={alumnoExtraId}
                      onChange={(e) => setAlumnoExtraId(e.target.value)}
                    >
                      <option value="">Seleccionar alumno</option>

                      {alumnosDisponiblesParaAgregar.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.nombre} - {getEstadoPago(a.id)}
                        </option>
                      ))}
                    </select>

                    <button type="button" onClick={agregarAlumnoExtra}>
                      Agregar
                    </button>
                  </div>
                </div>

                <div className="modal-grid">
                  <div className="modal-item">
                    <span>Fecha</span>
                    <strong>{claseSeleccionada.fecha}</strong>
                  </div>

                  <div className="modal-item">
                    <span>Horario</span>
                    <strong>{claseSeleccionada.hora}</strong>
                  </div>

                  <div className="modal-item">
                    <span>Modalidad</span>
                    <strong>{claseSeleccionada.modalidad}</strong>
                  </div>

                  <div className="modal-item">
                    <span>Estado de clase</span>
                    <strong>{claseSeleccionada.estado}</strong>
                  </div>
                </div>

                <div className="modal-section">
                  <h3>Alumnos en la clase</h3>

                  <div className="alumnos-modal-list">
                    {alumnosValidosModal.map((a) => (
                      <div key={a.id} className="alumno-row">
                        <span>{a.nombre}</span>
                        <span className="estado ok">{getEstadoPago(a.id)}</span>
                      </div>
                    ))}

                    {alumnosValidosModal.length === 0 && (
                      <span style={{ color: "#888", fontSize: "12px" }}>
                        No hay alumnos disponibles
                      </span>
                    )}
                  </div>
                </div>

                <div className="modal-actions">
                  <button
                    type="button"
                    className="btn-secundario-modal"
                    onClick={() =>
                      cambiarEstado(claseSeleccionada.id, "completada")
                    }
                  >
                    Marcar completada
                  </button>

                  <button
                    type="button"
                    className="btn-secundario-modal danger"
                    onClick={() =>
                      cambiarEstado(claseSeleccionada.id, "cancelada")
                    }
                  >
                    Cancelar clase
                  </button>

                  <button
                    type="button"
                    className="btn-cerrar"
                    onClick={() => setClaseSeleccionada(null)}
                  >
                    Cerrar
                  </button>

                  
                </div>
              </div>
              
            </div>
            
          )}
        </>
      )}

      {seccionActiva === "asistencia" && (
        <>
          <div className="kpis">
            <div className="kpi">
              <span>Registros</span>
              <strong>{resumenAsistencia.totalRegistros}</strong>
            </div>

            <div className="kpi">
              <span>Asistencias</span>
              <strong>{resumenAsistencia.totalAsistencias}</strong>
            </div>

            <div className="kpi">
              <span>% asistencia</span>
              <strong>{resumenAsistencia.porcentajeAsistencia}%</strong>
            </div>

            <div className="kpi">
              <span>Horas sumadas</span>
              <strong>{resumenAsistencia.totalHoras}</strong>
            </div>
          </div>

          <div className="card asistencia-panel">
            <h2>Asistencia de clases creadas</h2>

            {clases.length === 0 && (
              <div className="sin-clases">
                No tienes clases registradas todavía.
              </div>
            )}

            {clases.map((c) => (
              <div key={c.id} className="asistencia-clase">
                <div className="asistencia-header">
                  <div>
                    <strong>{c.curso}</strong>
                    <span className={`estado ${c.estado}`}>{c.estado}</span>
                  </div>

                  <div className="asistencia-meta">
                    <span>{c.fecha}</span>
                    <span>{c.hora}</span>
                    <span>{c.modalidad}</span>
                  </div>
                </div>

                <div className="asistencia-alumnos">
                  {getAlumnosClase(c).map((a) => (
                    <div key={`${c.id}-${a.id}`} className="asistencia-item">
                      <div className="asistencia-info">
                        <strong>{a.nombre}</strong>
                        <span>Pago: {a.estadoPago}</span>
                        <span>Curso: {a.curso || "-"}</span>
                        <span>
                          Horas completadas: {calcularProgresoAlumno(a.id)}
                        </span>
                      </div>

                      <div className="asistencia-actions">
                        <label>
                          <input
                            type="checkbox"
                            checked={!!a.asistio}
                            onChange={(e) =>
                              actualizarAlumnoClase(c.id, a.id, {
                                asistio: e.target.checked,
                                sumaHoras: e.target.checked
                                  ? a.sumaHoras
                                  : false,
                              })
                            }
                          />
                          Asistió
                        </label>

                        <label>
                          <input
                            type="checkbox"
                            checked={!!a.sumaHoras}
                            disabled={!a.asistio}
                            onChange={(e) =>
                              actualizarAlumnoClase(c.id, a.id, {
                                sumaHoras: e.target.checked,
                              })
                            }
                          />
                          Sumar horas
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default ProfesorPanel;