import EstadoAlumnoBadge from "./EstadoAlumnoBadge";

export default function AlumnoCard({ alumno, pagos, clases }) {
  const estadoPago = getEstadoPago(alumno, pagos);
  const horas = calcularHoras(alumno.id, clases);

  const cursos = JSON.parse(localStorage.getItem("planesCursos")) || [];

  const curso = cursos.find(
    (c) =>
      String(c.id) === String(alumno.cursoId || alumno.curso) ||
      normalizeText(c.nombre) === normalizeText(alumno.curso)
  );

  const nombreCurso = curso?.nombre || formatearNombreCurso(alumno.curso);
  const idCurso = curso?.id || alumno.cursoId || alumno.curso || "-";

  const horasTotales = Number(curso?.horasTotales || 0);
  const horasPorModulo = Number(curso?.horasPorModulo || 16);
  const modulos = Number(curso?.modulos || 1);

  const porcentaje = horasTotales > 0
    ? Math.min(100, Math.round((horas / horasTotales) * 100))
    : 0;

  const moduloActual = horasTotales > 0
    ? Math.min(modulos, Math.max(1, Math.floor(horas / horasPorModulo) + 1))
    : 1;

  return (
    <article className="alumno-card-pro">
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
        <span className={`pago ${estadoPago === "En mora" ? "danger" : "ok"}`}>
          {estadoPago}
        </span>

        <span className="estado">
          {alumno.estadoAcademico || "activo"}
        </span>
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