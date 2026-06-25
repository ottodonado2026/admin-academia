import { useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { useProfesorData } from "./hooks/useProfesorData";
import "./ProfesorClasesPage.css";
import ClaseCard from "./components/ClaseCard";
import ModalClase from "./components/ModalClase";

const STORAGE_KEYS = {
  user: "user",
  pagos: "pagos",
  clases: "clases",
};

// --- LOGICA DE MODULOS Y HORAS ---
const calcularModuloActual = (horasAcumuladas) => {
  if (!horasAcumuladas) return 1;
  const horas = Number(horasAcumuladas);
  if (horas < 10) return 1;
  if (horas < 20) return 2;
  if (horas < 30) return 3;
  if (horas < 40) return 4;
  return 5;
};

const ESTADOS_CLASE = {
  PROGRAMADA: "programada",
  COMPLETADA: "completada",
  CANCELADA: "cancelada",
  REPROGRAMADA: "reprogramada",
};

function ProfesorClasesPage() {
  const { clases, pagos, loading } = useProfesorData();
  
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroFecha, setFiltroFecha] = useState("todos");
  const [claseSeleccionada, setClaseSeleccionada] = useState(null);
  



const misClases = useMemo(() => {
  return [...clases].sort((a, b) => {
    const horaA = a.horaInicio || a.hora_inicio || "00:00";
    const horaB = b.horaInicio || b.hora_inicio || "00:00";

    const aDate = new Date(`${a.fecha}T${horaA}`).getTime();
    const bDate = new Date(`${b.fecha}T${horaB}`).getTime();

    return bDate - aDate;
  });
}, [clases]);

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


  const stats = useMemo(() => {
    const hoy = new Date().toISOString().split("T")[0];

   const horasTotales = misClases.reduce(
  (acc, item) => acc + Number(item.duracionHoras || item.duracion_horas || 0),
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

 




  const abrirModal = (clase) => {
    setClaseSeleccionada(clase);
  };

  const handleGuardarClase = async (claseActualizada) => {
    try {
      const { error } = await supabase
        .from("clases")
        .update({
          alumnos: claseActualizada.alumnos,
          observaciones: claseActualizada.observaciones || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", claseActualizada.id);

      if (error) {
        console.error("Error actualizando clase:", error);
        return;
      }
      setClaseSeleccionada(null);
      alert("Clase actualizada correctamente");
    } catch (err) {
      console.error("Error guardando clase:", err);
    }
  };

  const handleIniciarClase = async (claseId) => {
    try {
      const { error } = await supabase
        .from("clases")
        .update({ estado: "en progreso", updated_at: new Date().toISOString() })
        .eq("id", claseId);
      if (error) throw error;
    } catch (err) {
      console.error(err);
      alert("Error al iniciar la clase");
    }
  };

  const handleFinalizarClase = async (claseId) => {
    try {
      const { error } = await supabase
        .from("clases")
        .update({ estado: "completada", updated_at: new Date().toISOString() })
        .eq("id", claseId);
      if (error) throw error;
    } catch (err) {
      console.error(err);
      alert("Error al finalizar la clase");
    }
  };

  const cerrarModal = () => {
    setClaseSeleccionada(null);
  };



  return (
    <div className="profesor-clases-page">
      <section className="clases-hero">
        <div>
          <h1>Mis clases programadas</h1>
          <p>
        Consulta las clases asignadas por coordinación, revisa alumnos,
          registra asistencia, notas y seguimiento académico.
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
                onStart={handleIniciarClase}
                onFinish={handleFinalizarClase}
              />
            ))}
          </div>
        </div>
      </section>

      {claseSeleccionada && (
       <ModalClase
  clase={claseSeleccionada}
  onClose={cerrarModal}
  onGuardar={handleGuardarClase}
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