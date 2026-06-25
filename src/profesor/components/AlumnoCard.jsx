import EstadoAlumnoBadge from "./EstadoAlumnoBadge";
import { CURSOS_BASE } from "../../data/cursosBase";

export default function AlumnoCard({ alumno, pagos, clases, onSelect }) {
  const estadoPago = getEstadoPago(alumno, pagos);
  
  // Usar horas de la base de datos (prioridad) o calcular localmente si no existen
  let horas = Number(alumno.horas_acumuladas || 0);
  if (horas === 0) {
    horas = calcularHoras(alumno.id, clases);
  }

  const curso = CURSOS_BASE.find(
    (c) =>
      String(c.id) === String(alumno.cursoId || alumno.curso) ||
      normalizeText(c.nombre) === normalizeText(alumno.curso)
  );

  const nombreCurso = curso?.nombre || formatearNombreCurso(alumno.curso);
  const idCurso = curso?.id || alumno.cursoId || alumno.curso || "-";

  let horasTotales = Number(curso?.horasTotales || 24);
  const horasPorModulo = Number(curso?.horasPorModulo || 16);
  const modulos = Number(curso?.modulos || 1);

  if (alumno?.duracion && !isNaN(Number(alumno.duracion))) {
    const meses = Number(alumno.duracion);
    const modalidad = (alumno.modalidad || "regular").toLowerCase();
    const clasesPorMes = curso?.modalidades?.[modalidad] || 4;
    const horasPorClase = (curso?.horasPorModulo / curso?.clasesPorModulo) || 2;
    const horasCalculadas = meses * clasesPorMes * horasPorClase;
    if (horasCalculadas > 0) {
      horasTotales = horasCalculadas;
    }
  }

  const porcentaje = horasTotales > 0
    ? Math.min(100, Math.round((horas / horasTotales) * 100))
    : 0;

  const moduloActual = horasTotales > 0
    ? Math.min(modulos, Math.max(1, Math.floor(horas / horasPorModulo) + 1))
    : 1;

  const abrirWhatsApp = (e) => {
    e.stopPropagation();
    if (!alumno.telefono) {
      alert("Este alumno no tiene teléfono registrado.");
      return;
    }
    const msg = `Hola ${alumno.nombre}, te saluda tu profesor de ${nombreCurso}. Te escribo para `;
    const link = `https://wa.me/${alumno.telefono.replace(/\+/g, "")}?text=${encodeURIComponent(msg)}`;
    window.open(link, "_blank");
  };

  return (
    <article className="alumno-card-pro" onClick={() => onSelect && onSelect(alumno)}>
      <div className="alumno-card-header">
        <div className="alumno-card-title-wrap">
          <h3>{alumno.nombre}</h3>
          <p className="alumno-card-curso">{nombreCurso}</p>
          <small className="alumno-card-curso-id">{idCurso}</small>
        </div>

        <EstadoAlumnoBadge porcentaje={porcentaje} />
      </div>

      <div className="alumno-card-kpis">
        <div className="alumno-kpi-item">
          <span>Horas</span>
          <strong>{horas}h</strong>
        </div>

        <div className="alumno-kpi-item">
          <span>Total</span>
          <strong>{horasTotales}h</strong>
        </div>

        <div className="alumno-kpi-item">
          <span>Progreso</span>
          <strong>{porcentaje}%</strong>
        </div>

        <div className="alumno-kpi-item">
          <span>Módulo</span>
          <strong>{moduloActual}/{modulos}</strong>
        </div>
      </div>

      <div className="progress-block">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${porcentaje}%` }}
          />
        </div>
      </div>

      <div className="alumno-card-footer">
        <div className="badges-footer">
          <span className={`pago ${estadoPago === "En mora" ? "danger" : "ok"}`}>
            {estadoPago}
          </span>
          <span className="estado">
            {alumno.estadoAcademico || alumno.estado || "activo"}
          </span>
        </div>
        
        <button className="btn-wa-icon" onClick={abrirWhatsApp} title="Enviar WhatsApp">
          <svg viewBox="0 0 24 24" fill="currentColor">
             <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.099.824zm-3.423-14.416c-6.627 0-12 5.373-12 12s5.373 12 12 12 12-5.373 12-12-5.373-12-12-12zm.029 18.88c-1.161 0-2.305-.292-3.318-.844l-3.677.964.984-3.595c-.607-1.052-.927-2.246-.926-3.468.001-3.825 3.113-6.937 6.937-6.937 3.825 0 6.937 3.112 6.937 6.937 0 3.825-3.113 6.937-6.937 6.937z"/>
          </svg>
        </button>
      </div>
    </article>
  );
}

function getEstadoPago(alumno, pagos) {
  let plan = pagos.find(
    (p) =>
      String(p.alumnoId) === String(alumno.id) ||
      String(p.alumnoId) === String(alumno.alumnoId) ||
      String(p.alumnoDbId) === String(alumno.id) ||
      normalizeText(p.alumno) === normalizeText(alumno.nombre)
  );

  return plan?.estado || "Sin plan";
}

function calcularHoras(alumnoId, clases) {
  return clases
    .filter((c) => c.estado === "completada")
    .filter((c) =>
      (c.alumnos || []).some((a) => String(a.id) === String(alumnoId))
    )
    .reduce((acc, c) => acc + Number(c.duracionHoras || 1), 0);
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function formatearNombreCurso(value) {
  const raw = String(value || "").trim();
  if (!raw) return "Sin curso";

  if (raw.startsWith("CUR-")) {
    const limpio = raw.replace("CUR-", "").replace(/-/g, " ");
    return limpio
      .toLowerCase()
      .replace(/\b\w/g, (l) => l.toUpperCase());
  }

  return raw;
}