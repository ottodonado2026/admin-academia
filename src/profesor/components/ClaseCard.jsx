export default function ClaseCard({
  clase,
  onOpen,
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
            {clase.fecha} · {clase.horaInicio}
            {clase.horaFin ? ` - ${clase.horaFin}` : ""} · {clase.modalidad}
          </p>
        </div>

        <span className={`estado-chip estado-${clase.estado}`}>
          {clase.estado}
        </span>
      </div>

      <div className="clase-card-middle">
        <div className="clase-meta-item">
          <span>Módulo</span>
          <strong>{clase.modulo || "-"}</strong>
        </div>

        <div className="clase-meta-item">
          <span>Duración</span>
          <strong>{clase.duracionHoras || 0}h</strong>
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

      <div className="clase-card-actions">
        <button type="button" onClick={() => onOpen(clase)}>
          Ver
        </button>

        <button type="button" onClick={() => onEdit(clase)}>
          Editar
        </button>

        {clase.estado !== "completada" && (
          <button type="button" onClick={() => onComplete(clase.id)}>
            Completar
          </button>
        )}

        {clase.estado !== "cancelada" && (
          <button type="button" className="btn-warn" onClick={() => onCancel(clase.id)}>
            Cancelar
          </button>
        )}

        <button type="button" className="btn-danger" onClick={() => onDelete(clase.id)}>
          Eliminar
        </button>
      </div>
    </article>
  );
}