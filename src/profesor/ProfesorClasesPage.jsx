import { useEffect, useMemo, useState } from "react";
import "./ProfesorClasesPage.css";
import ClaseCard from "./components/ClaseCard";
import ModalClase from "./components/ModalClase";

const STORAGE_KEYS = {
  user: "user",
  alumnos: "alumnos",
  pagos: "pagos",
  profesores: "profesores",
  clases: "clases",
};

const ESTADOS_CLASE = {
  PROGRAMADA: "programada",
  COMPLETADA: "completada",
  CANCELADA: "cancelada",
  REPROGRAMADA: "reprogramada",
};

const ESTADOS_ACADEMICOS_BLOQUEADOS = ["congelado", "retirado", "cancelado"];

function ProfesorClasesPage() {
  const [user, setUser] = useState(null);
  const [profesorActual, setProfesorActual] = useState(null);

  const [alumnos, setAlumnos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [profesores, setProfesores] = useState([]);
  const [clases, setClases] = useState([]);

  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroFecha, setFiltroFecha] = useState("todos");

  const [modoFormulario, setModoFormulario] = useState("crear");
  const [claseEditandoId, setClaseEditandoId] = useState(null);

 const [formData, setFormData] = useState({
  curso: "",      // lo dejamos por compatibilidad
  cursoId: "",    // 👈 NUEVO (IMPORTANTE)
  fecha: "",
  horaInicio: "",
  horaFin: "",
  modalidad: "presencial",
  duracionHoras: 1,
  modulo: 1,
  tema: "",
  observaciones: "",
  alumnosIds: [],
});

  const [claseSeleccionada, setClaseSeleccionada] = useState(null);

  useEffect(() => {
    const userData = safeParse(localStorage.getItem(STORAGE_KEYS.user), null);
    const alumnosData = safeParse(localStorage.getItem(STORAGE_KEYS.alumnos), []);
    const pagosData = safeParse(localStorage.getItem(STORAGE_KEYS.pagos), []);
    const profesoresData = safeParse(
      localStorage.getItem(STORAGE_KEYS.profesores),
      []
    );
    const clasesData = safeParse(localStorage.getItem(STORAGE_KEYS.clases), []);

    setUser(userData);
    setAlumnos(Array.isArray(alumnosData) ? alumnosData : []);
    setPagos(Array.isArray(pagosData) ? pagosData : []);
    setProfesores(Array.isArray(profesoresData) ? profesoresData : []);
    setClases(Array.isArray(clasesData) ? clasesData : []);
  }, []);

  useEffect(() => {
    if (!user?.id || profesores.length === 0) return;

    const profesor = profesores.find(
      (p) => String(p.id) === String(user.id)
    );

    setProfesorActual(profesor || null);
  }, [user, profesores]);

  const cursosProfesor = useMemo(() => {
  if (!profesorActual) return [];

  const cursos = JSON.parse(localStorage.getItem("planesCursos") || "[]");

  // obtener especialidades del profesor
  let especialidades = [];

  if (Array.isArray(profesorActual.especialidades)) {
    especialidades = profesorActual.especialidades;
  } else if (typeof profesorActual.especialidad === "string") {
    especialidades = profesorActual.especialidad
      .split(",")
      .map((c) => c.trim().toLowerCase());
  }

  // filtrar cursos reales del sistema
  const cursosFiltrados = cursos.filter((curso) =>
    especialidades.includes(String(curso.categoria).toLowerCase())
  );

  return cursosFiltrados;
}, [profesorActual]);

  const misClases = useMemo(() => {
    if (!user?.id) return [];

    return clases
      .filter((c) => String(c.profesorId) === String(user.id))
      .sort((a, b) => {
        const aDate = new Date(`${a.fecha}T${a.horaInicio || "00:00"}`).getTime();
        const bDate = new Date(`${b.fecha}T${b.horaInicio || "00:00"}`).getTime();
        return bDate - aDate;
      });
  }, [clases, user]);

  const clasesFiltradas = useMemo(() => {
    const term = busqueda.trim().toLowerCase();

    return misClases.filter((clase) => {
      const matchBusqueda =
        !term ||
        clase.curso?.toLowerCase().includes(term) ||
        clase.tema?.toLowerCase().includes(term) ||
        (clase.alumnos || []).some((a) => a.nombre?.toLowerCase().includes(term));

      const matchEstado =
        filtroEstado === "todos" || clase.estado === filtroEstado;

      const hoy = new Date();
      const fechaClase = new Date(`${clase.fecha}T00:00:00`);

      let matchFecha = true;
      if (filtroFecha === "hoy") {
        matchFecha = fechaClase.toDateString() === hoy.toDateString();
      } else if (filtroFecha === "proximas") {
        matchFecha = fechaClase >= new Date(hoy.toDateString());
      } else if (filtroFecha === "pasadas") {
        matchFecha = fechaClase < new Date(hoy.toDateString());
      }

      return matchBusqueda && matchEstado && matchFecha;
    });
  }, [misClases, busqueda, filtroEstado, filtroFecha]);

  const alumnosDisponibles = useMemo(() => {
    return alumnos
      .filter((alumno) => {
        const cursoAlumno = alumno.cursoId || alumno.curso || "";
        const pagoEstado = getEstadoPagoAlumno(alumno, pagos);
        const estadoAcademico = String(
          alumno.estadoAcademico || alumno.estado || "activo"
        ).toLowerCase();

        const permitidoPorCurso =
  cursosProfesor.length === 0 ||
  cursosProfesor.some(
    (curso) => String(curso.id) === String(cursoAlumno)
  );

        return (
          permitidoPorCurso &&
          pagoEstado !== "En mora" &&
          !ESTADOS_ACADEMICOS_BLOQUEADOS.includes(estadoAcademico)
        );
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  }, [alumnos, pagos, cursosProfesor]);

  const stats = useMemo(() => {
    const hoy = new Date().toISOString().split("T")[0];

    const horasTotales = misClases.reduce(
      (acc, item) => acc + Number(item.duracionHoras || 0),
      0
    );

    const clasesHoy = misClases.filter((c) => c.fecha === hoy).length;
    const programadas = misClases.filter(
      (c) => c.estado === ESTADOS_CLASE.PROGRAMADA || c.estado === ESTADOS_CLASE.REPROGRAMADA
    ).length;
    const completadas = misClases.filter(
      (c) => c.estado === ESTADOS_CLASE.COMPLETADA
    ).length;

    return {
      total: misClases.length,
      programadas,
      completadas,
      clasesHoy,
      horasTotales,
    };
  }, [misClases]);

  const guardarClasesEnStorage = (nuevasClases) => {
    localStorage.setItem(STORAGE_KEYS.clases, JSON.stringify(nuevasClases));
    setClases(nuevasClases);
  };

  const resetFormulario = () => {
    setModoFormulario("crear");
    setClaseEditandoId(null);
    setFormData({
  curso: "",
  cursoId: cursosProfesor[0]?.id || "",
      fecha: "",
      horaInicio: "",
      horaFin: "",
      modalidad: "presencial",
      duracionHoras: 1,
      modulo: 1,
      tema: "",
      observaciones: "",
      alumnosIds: [],
    });
  };

  useEffect(() => {
  if (cursosProfesor.length > 0 && !formData.cursoId) {
    setFormData((prev) => ({
      ...prev,
      cursoId: cursosProfesor[0].id,
    }));
  }
}, [cursosProfesor, formData.cursoId]);

  const handleChange = (field, value) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      if (field === "horaInicio" && prev.horaInicio !== value && (!prev.horaFin || prev.horaFin <= value)) {
        updated.horaFin = calcularHoraFin(value, Number(prev.duracionHoras || 1));
      }

      if (field === "duracionHoras") {
        updated.horaFin = calcularHoraFin(prev.horaInicio, Number(value || 1));
      }

      return updated;
    });
  };

  const toggleAlumno = (alumnoId) => {
    setFormData((prev) => {
      const existe = prev.alumnosIds.includes(alumnoId);

      return {
        ...prev,
        alumnosIds: existe
          ? prev.alumnosIds.filter((id) => id !== alumnoId)
          : [...prev.alumnosIds, alumnoId],
      };
    });
  };

  const construirPayloadClase = () => {
    const cursoSeleccionado = cursosProfesor.find(
  (curso) => String(curso.id) === String(formData.cursoId)
);
    const alumnosClase = formData.alumnosIds
      .map((id) => alumnos.find((a) => String(a.id) === String(id)))
      .filter(Boolean)
      .map((alumno) => {
        const estadoPago = getEstadoPagoAlumno(alumno, pagos);
        const horasCompletadas = calcularHorasCompletadasAlumno(alumno.id, clases, user?.id);
        const cursoAlumno = alumno.cursoId || alumno.curso || "";

        return {
          id: alumno.id,
          alumnoId: alumno.alumnoId || "",
          nombre: alumno.nombre,
          telefono: alumno.telefono || "",
          curso: cursoAlumno,
          estadoPago,
          estadoAcademico: alumno.estadoAcademico || alumno.estado || "activo",
          asistio: false,
          sumaHoras: false,
          calificacion: null,
          observacion: "",
          horasCompletadas,
        };
      });

    return {
      profesorId: user?.id,
      profesorNombre: profesorActual?.nombre || "Profesor",
      cursoId: formData.cursoId,
curso: cursoSeleccionado?.nombre || "",
categoriaCurso: cursoSeleccionado?.categoria || "",
      fecha: formData.fecha,
      horaInicio: formData.horaInicio,
      horaFin: formData.horaFin || calcularHoraFin(formData.horaInicio, Number(formData.duracionHoras || 1)),
      modalidad: formData.modalidad,
      duracionHoras: Number(formData.duracionHoras || 1),
      modulo: Number(formData.modulo || 1),
      tema: formData.tema.trim(),
      observaciones: formData.observaciones.trim(),
      estado:
        modoFormulario === "editar"
          ? ESTADOS_CLASE.REPROGRAMADA
          : ESTADOS_CLASE.PROGRAMADA,
      alumnos: alumnosClase,
      updatedAt: new Date().toISOString(),
    };
  };

  const validarFormulario = () => {
  if (!formData.cursoId) {
  alert("Selecciona un curso");
  return false;
}

    if (!formData.fecha) {
      alert("Selecciona una fecha");
      return false;
    }

    if (!formData.horaInicio) {
      alert("Selecciona la hora de inicio");
      return false;
    }

    if (!formData.duracionHoras || Number(formData.duracionHoras) <= 0) {
      alert("La duración debe ser mayor a 0");
      return false;
    }

    if (formData.alumnosIds.length === 0) {
      alert("Debes seleccionar al menos un alumno");
      return false;
    }

    const seleccionados = formData.alumnosIds
      .map((id) => alumnos.find((a) => String(a.id) === String(id)))
      .filter(Boolean);

    const alumnoEnMora = seleccionados.find(
      (alumno) => getEstadoPagoAlumno(alumno, pagos) === "En mora"
    );

    if (alumnoEnMora) {
      alert(`El alumno ${alumnoEnMora.nombre} está en mora`);
      return false;
    }

    return true;
  };

  const handleGuardarClase = () => {
    if (!validarFormulario()) return;

    const payload = construirPayloadClase();

    if (modoFormulario === "editar" && claseEditandoId) {
      const actualizadas = clases.map((clase) =>
        String(clase.id) === String(claseEditandoId)
          ? {
              ...clase,
              ...payload,
              reprogramadaDesde:
                clase.fecha !== formData.fecha ||
                clase.horaInicio !== formData.horaInicio
                  ? {
                      fecha: clase.fecha,
                      horaInicio: clase.horaInicio,
                      horaFin: clase.horaFin,
                    }
                  : clase.reprogramadaDesde || null,
            }
          : clase
      );

      guardarClasesEnStorage(actualizadas);
      resetFormulario();
      return;
    }

    const nuevaClase = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      ...payload,
    };

    guardarClasesEnStorage([nuevaClase, ...clases]);
    resetFormulario();
  };

  const handleEditarClase = (clase) => {
    setModoFormulario("editar");
    setClaseEditandoId(clase.id);

     setFormData({
    curso: clase.curso || "",
    cursoId: clase.cursoId || "",
    fecha: clase.fecha || "",
    horaInicio: clase.horaInicio || "",
    horaFin: clase.horaFin || "",
    modalidad: clase.modalidad || "presencial",
    duracionHoras: Number(clase.duracionHoras || 1),
    modulo: Number(clase.modulo || 1),
    tema: clase.tema || "",
    observaciones: clase.observaciones || "",
    alumnosIds: (clase.alumnos || []).map((a) => a.id),
  });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCompletarClase = (claseId) => {
    const actualizadas = clases.map((clase) => {
      if (String(clase.id) !== String(claseId)) return clase;

      const alumnosActualizados = (clase.alumnos || []).map((alumno) => ({
        ...alumno,
        asistio: alumno.asistio ?? true,
        sumaHoras: alumno.sumaHoras ?? true,
      }));

      return {
        ...clase,
        estado: ESTADOS_CLASE.COMPLETADA,
        alumnos: alumnosActualizados,
        updatedAt: new Date().toISOString(),
      };
    });

    guardarClasesEnStorage(actualizadas);

    if (claseSeleccionada && String(claseSeleccionada.id) === String(claseId)) {
      const actualizada = actualizadas.find((c) => String(c.id) === String(claseId));
      setClaseSeleccionada(actualizada || null);
    }
  };

  const handleCancelarClase = (claseId) => {
    const motivo = window.prompt("Motivo de cancelación (opcional):", "");

    const actualizadas = clases.map((clase) =>
      String(clase.id) === String(claseId)
        ? {
            ...clase,
            estado: ESTADOS_CLASE.CANCELADA,
            motivoCancelacion: motivo?.trim() || "",
            updatedAt: new Date().toISOString(),
          }
        : clase
    );

    guardarClasesEnStorage(actualizadas);

    if (claseSeleccionada && String(claseSeleccionada.id) === String(claseId)) {
      const actualizada = actualizadas.find((c) => String(c.id) === String(claseId));
      setClaseSeleccionada(actualizada || null);
    }
  };

  const handleEliminarClase = (claseId) => {
    const confirmar = window.confirm("¿Seguro que quieres eliminar esta clase?");
    if (!confirmar) return;

    const filtradas = clases.filter((clase) => String(clase.id) !== String(claseId));
    guardarClasesEnStorage(filtradas);

    if (claseSeleccionada && String(claseSeleccionada.id) === String(claseId)) {
      setClaseSeleccionada(null);
    }

    if (String(claseEditandoId) === String(claseId)) {
      resetFormulario();
    }
  };

  const abrirModal = (clase) => {
    setClaseSeleccionada(clase);
  };

  const cerrarModal = () => {
    setClaseSeleccionada(null);
  };
const actualizarClaseDesdeModal = (claseActualizada) => {
  const actualizadas = clases.map((clase) =>
    String(clase.id) === String(claseActualizada.id) ? claseActualizada : clase
  );

  guardarClasesEnStorage(actualizadas);
  setClaseSeleccionada(null);
  alert("Cambios guardados correctamente");
};

  return (
    <div className="profesor-clases-page">
      <section className="clases-hero">
        <div>
          <h1>Gestión de clases</h1>
          <p>
            Agenda, reprograma, cancela y completa clases conectadas con alumnos
            y pagos del panel administrativo.
          </p>
        </div>

        <div className="clases-kpis">
          <div className="kpi-card">
            <span>Total</span>
            <strong>{stats.total}</strong>
          </div>
          <div className="kpi-card">
            <span>Hoy</span>
            <strong>{stats.clasesHoy}</strong>
          </div>
          <div className="kpi-card">
            <span>Programadas</span>
            <strong>{stats.programadas}</strong>
          </div>
          <div className="kpi-card">
            <span>Horas</span>
            <strong>{stats.horasTotales}</strong>
          </div>
        </div>
      </section>

      <section className="clases-grid">
        <div className="clases-form-card">
          <div className="card-header">
            <div>
              <h2>{modoFormulario === "editar" ? "Reprogramar / editar clase" : "Nueva clase"}</h2>
              <p>
                Selecciona alumnos activos del admin y agenda la clase sin romper
                la lógica actual.
              </p>
            </div>

            {modoFormulario === "editar" && (
              <button className="btn-secundario" onClick={resetFormulario} type="button">
                Cancelar edición
              </button>
            )}
          </div>

          <div className="form-grid">
            <div className="form-field">
              <label>Curso</label>
              <select
  value={formData.cursoId}
  onChange={(e) => handleChange("cursoId", e.target.value)}
>
  <option value="">Selecciona un curso</option>

  {cursosProfesor.map((curso) => (
    <option key={curso.id} value={curso.id}>
      {curso.nombre}
    </option>
  ))}
</select>
            </div>

            <div className="form-field">
              <label>Fecha</label>
              <input
                type="date"
                value={formData.fecha}
                onChange={(e) => handleChange("fecha", e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Hora inicio</label>
              <input
                type="time"
                value={formData.horaInicio}
                onChange={(e) => handleChange("horaInicio", e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Duración (horas)</label>
              <input
                type="number"
                min="1"
                step="0.5"
                value={formData.duracionHoras}
                onChange={(e) => handleChange("duracionHoras", e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Hora fin</label>
              <input
                type="time"
                value={formData.horaFin}
                onChange={(e) => handleChange("horaFin", e.target.value)}
              />
            </div>

            <div className="form-field">
              <label>Modalidad</label>
              <select
                value={formData.modalidad}
                onChange={(e) => handleChange("modalidad", e.target.value)}
              >
                <option value="presencial">Presencial</option>
                <option value="virtual">Virtual</option>
                <option value="mixta">Mixta</option>
              </select>
            </div>

            <div className="form-field">
              <label>Módulo</label>
              <input
                type="number"
                min="1"
                value={formData.modulo}
                onChange={(e) => handleChange("modulo", e.target.value)}
              />
            </div>

            <div className="form-field form-field-full">
              <label>Tema / objetivo</label>
              <input
                type="text"
                placeholder="Ej: Acordes mayores, respiración, beatmaking..."
                value={formData.tema}
                onChange={(e) => handleChange("tema", e.target.value)}
              />
            </div>

            <div className="form-field form-field-full">
              <label>Observaciones</label>
              <textarea
                rows="4"
                placeholder="Notas internas de la clase..."
                value={formData.observaciones}
                onChange={(e) => handleChange("observaciones", e.target.value)}
              />
            </div>
          </div>

          <div className="alumnos-box">
            <div className="alumnos-box-header">
              <div>
                <h3>Seleccionar alumnos</h3>
                <p>
                  Solo aparecen alumnos habilitados por curso, no congelados y
                  no morosos.
                </p>
              </div>
              <span className="pill-counter">{formData.alumnosIds.length} seleccionados</span>
            </div>

            <div className="alumnos-selector">
              {alumnosDisponibles.length === 0 && (
                <div className="empty-box">
                  No hay alumnos disponibles para este profesor.
                </div>
              )}

              {alumnosDisponibles.map((alumno) => {
                const checked = formData.alumnosIds.includes(alumno.id);
                const estadoPago = getEstadoPagoAlumno(alumno, pagos);
                const horas = calcularHorasCompletadasAlumno(alumno.id, clases, user?.id);

                return (
                  <label
                    key={alumno.id}
                    className={`alumno-option ${checked ? "selected" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleAlumno(alumno.id)}
                    />

                    <div className="alumno-option-body">
                      <strong>{alumno.nombre}</strong>
                      <span>{alumno.cursoId || alumno.curso || "Sin curso"}</span>
                    </div>

                    <div className="alumno-option-meta">
                      <span className={`badge ${estadoPago === "En mora" ? "badge-danger" : "badge-ok"}`}>
                        {estadoPago}
                      </span>
                      <small>{horas}h completadas</small>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="form-actions">
            <button className="btn-principal" type="button" onClick={handleGuardarClase}>
              {modoFormulario === "editar" ? "Guardar cambios" : "Crear clase"}
            </button>
          </div>
        </div>

        <div className="clases-list-card">
          <div className="card-header">
            <div>
              <h2>Mis clases</h2>
              <p>Consulta, filtra y administra tus clases programadas.</p>
            </div>
          </div>

          <div className="toolbar-filtros">
            <input
              type="text"
              placeholder="Buscar por curso, tema o alumno"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />

            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
            >
              <option value="todos">Todos los estados</option>
              <option value={ESTADOS_CLASE.PROGRAMADA}>Programada</option>
              <option value={ESTADOS_CLASE.REPROGRAMADA}>Reprogramada</option>
              <option value={ESTADOS_CLASE.COMPLETADA}>Completada</option>
              <option value={ESTADOS_CLASE.CANCELADA}>Cancelada</option>
            </select>

            <select
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
            >
              <option value="todos">Todas</option>
              <option value="hoy">Hoy</option>
              <option value="proximas">Próximas</option>
              <option value="pasadas">Pasadas</option>
            </select>
          </div>

          <div className="clases-list">
            {clasesFiltradas.length === 0 && (
              <div className="empty-box">
                No tienes clases que coincidan con los filtros actuales.
              </div>
            )}

            {clasesFiltradas.map((clase) => (
              <ClaseCard
                key={clase.id}
                clase={clase}
                onOpen={abrirModal}
                onEdit={handleEditarClase}
                onComplete={handleCompletarClase}
                onCancel={handleCancelarClase}
                onDelete={handleEliminarClase}
              />
            ))}
          </div>
        </div>
      </section>

      {claseSeleccionada && (
        <ModalClase
          clase={claseSeleccionada}
          onClose={cerrarModal}
          onSave={actualizarClaseDesdeModal}
          pagos={pagos}
        />
      )}
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

function calcularHoraFin(horaInicio, duracionHoras) {
  if (!horaInicio) return "";

  const [h, m] = horaInicio.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return "";

  const totalMinutos = h * 60 + m + Math.round(Number(duracionHoras || 1) * 60);
  const horas = Math.floor(totalMinutos / 60) % 24;
  const minutos = totalMinutos % 60;

  return `${String(horas).padStart(2, "0")}:${String(minutos).padStart(2, "0")}`;
}

function getEstadoPagoAlumno(alumno, pagos) {
  if (!alumno) return "Sin plan";

  let plan = pagos.find(
    (p) =>
      String(p.alumnoId) === String(alumno.alumnoId) ||
      String(p.alumnoId) === String(alumno.id) ||
      String(p.alumnoDbId) === String(alumno.id)
  );

  if (!plan) {
    plan = pagos.find((p) => normalizeText(p.alumno) === normalizeText(alumno.nombre));
  }

  return plan?.estado || "Sin plan";
}

function calcularHorasCompletadasAlumno(alumnoId, clases, profesorId) {
  return clases
    .filter(
      (clase) =>
        String(clase.profesorId) === String(profesorId) &&
        clase.estado === "completada" &&
        (clase.alumnos || []).some(
          (alumno) => String(alumno.id) === String(alumnoId) && alumno.sumaHoras
        )
    )
    .reduce((acc, clase) => acc + Number(clase.duracionHoras || 0), 0);
}

export default ProfesorClasesPage;