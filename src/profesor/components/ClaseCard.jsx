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

export default function ClaseCard({
  clase,
  onOpen,
  onStart,
  onFinish,
  onEdit,
  onComplete,
  onCancel,
  onDelete,
}) {
  const alumnos = clase.alumnos || [];
  const totalAlumnos = alumnos.length;

  return (
    <article className="clase-card-pro">
      <div className="clase-card-top">
        <div>
          <h3>{clase.curso}</h3>
          <p>
            {clase.fecha} · {formatAMPM(clase.horaInicio || clase.hora_inicio || clase.hora)}
            {clase.horaFin || clase.hora_fin ? ` - ${formatAMPM(clase.horaFin || clase.hora_fin)}` : ""} · {clase.modalidad}
          </p>
        </div>

        <span className={`estado-chip estado-${clase.estado?.replace(" ", "-")}`}>
          {clase.estado}
        </span>
      </div>

      <div className="clase-card-middle">
        <div className="clase-meta-item">
          <span>Módulo</span>
          <strong>{clase.modulo || "No definido"}</strong>
        </div>

        <div className="clase-meta-item">
          <span>Duración</span>
          <strong>{clase.duracionHoras || clase.duracion_horas || 0}h</strong>
        </div>

        <div className="clase-meta-item">
          <span>Alumnos</span>
          <strong>{totalAlumnos}</strong>
        </div>
      </div>

      <div className="clase-card-body">
        <p className="clase-tema">
          <strong>Tema:</strong> {clase.tema || "Sin tema registrado"}
        </p>

        <div className="clase-alumnos-preview">
          {alumnos.slice(0, 3).map((alumno) => (
            <span key={alumno.id} className="mini-chip">
              {alumno.nombre}
            </span>
          ))}

          {alumnos.length > 3 && (
            <span className="mini-chip">+{alumnos.length - 3} más</span>
          )}
        </div>
      </div>

      <div className="clase-card-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button type="button" onClick={() => onOpen(clase)}>
          Ver clase
        </button>
        {clase.estado === "programada" && onStart && (
          <button type="button" className="btn-success" onClick={() => onStart(clase.id)}>
            Iniciar clase
          </button>
        )}
        {clase.estado === "en progreso" && onFinish && (
          <button type="button" className="btn-warning" onClick={() => onFinish(clase.id)}>
            Finalizar clase
          </button>
        )}
      </div>
    </article>
  );
}