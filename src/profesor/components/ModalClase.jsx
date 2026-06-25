import { useEffect, useMemo, useState } from "react";

export default function ModalClase({ clase, onClose, onGuardar, pagos = [] }) {
  const [localClase, setLocalClase] = useState(clase);

  useEffect(() => {
    setLocalClase(clase);
  }, [clase]);

  const alumnos = useMemo(() => localClase?.alumnos || [], [localClase]);

  const handleAlumnoChange = (alumnoId, changes) => {
    setLocalClase((prev) => ({
      ...prev,
      alumnos: (prev.alumnos || []).map((alumno) =>
        String(alumno.id) === String(alumnoId)
          ? { ...alumno, ...changes }
          : alumno
      ),
      updatedAt: new Date().toISOString(),
    }));
  };

 const handleSave = () => {
  if (!onGuardar || !localClase?.id) return;

  onGuardar(localClase);
};

  const resumen = useMemo(() => {
    const total = alumnos.length;
    const asistieron = alumnos.filter((a) => a.asistio).length;
    const sumanHoras = alumnos.filter((a) => a.sumaHoras).length;

    return { total, asistieron, sumanHoras };
  }, [alumnos]);

  const calcularModuloActual = (horasAcumuladas) => {
    if (!horasAcumuladas) return 1;
    const horas = Number(horasAcumuladas);
    if (horas < 10) return 1;
    if (horas < 20) return 2;
    if (horas < 30) return 3;
    if (horas < 40) return 4;
    return 5;
  };

  const moduloActual = calcularModuloActual(localClase.alumnos?.horas_acumuladas || 0);
  const modulosFaltantes = Math.max(0, 5 - moduloActual);

  return (
    <div className="modal-overlay-pro" onClick={onClose}>
      <div className="modal-card-pro" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-pro">
          <div>
            <h2>{localClase.curso}</h2>
            <p>
             {localClase.fecha} ·{" "}
              {localClase.horaInicio || localClase.hora_inicio || "--:--"}
              {localClase.horaFin || localClase.hora_fin
                ? ` - ${localClase.horaFin || localClase.hora_fin}`
                : ""} ·{" "}

              {localClase.alumnos?.modalidad || localClase.modalidad || "Regular"}
            </p>
          </div>

          <button type="button" className="modal-close" onClick={onClose}>
            ✕
          </button>
        </div>

       <div className="modal-grid-pro">
  <div className="modal-info-box">
    <span>Tema</span>
    <strong>{localClase.tema || localClase.observaciones || "No definido"}</strong>
  </div>

  <div className="modal-info-box">
    <span>Módulo actual</span>
   <strong>{moduloActual} ({modulosFaltantes} restantes)</strong>
  </div>

  <div className="modal-info-box">
    <span>Duración</span>
    <strong>{localClase.duracionHoras || localClase.duracion_horas || 0}h</strong>
  </div>

  <div className="modal-info-box">
    <span>Estado</span>
    <strong>{localClase.estado}</strong>
  </div>
</div>

        <div className="modal-section-pro">
          <h3>Resumen</h3>
          <div className="modal-grid-pro">
            <div className="modal-info-box">
              <span>Alumnos</span>
              <strong>{resumen.total}</strong>
            </div>
            <div className="modal-info-box">
              <span>Asistieron</span>
              <strong>{resumen.asistieron}</strong>
            </div>
            <div className="modal-info-box">
              <span>Suman horas</span>
              <strong>{resumen.sumanHoras}</strong>
            </div>
            <div className="modal-info-box">
              <span>Observaciones</span>
              <strong>{localClase.observaciones || "Sin observaciones"}</strong>
            </div>
          </div>
        </div>

        <div className="modal-section-pro">
          <h3>Control por alumno</h3>

          <div className="modal-alumnos-list">
            {alumnos.map((alumno) => {
              const estadoPago = getEstadoPago(alumno, pagos);

              return (
                <div key={alumno.id} className="modal-alumno-item">
                  <div className="modal-alumno-main">
                    <strong>{alumno.nombre}</strong>
                    <span>
                    {alumno.curso || "Sin curso"} · {estadoPago}
                    </span>
                  </div>

                  <div className="modal-alumno-controls">
                    <label>
                      <input
                        type="checkbox"
                        checked={!!alumno.asistio}
                        onChange={(e) =>
                          handleAlumnoChange(alumno.id, {
                            asistio: e.target.checked,
                            sumaHoras: e.target.checked ? alumno.sumaHoras : false,
                          })
                        }
                      />
                      Asistió
                    </label>

                    <label>
                      <input
                        type="checkbox"
                        checked={!!alumno.sumaHoras}
                        disabled={!alumno.asistio}
                        onChange={(e) =>
                          handleAlumnoChange(alumno.id, {
                            sumaHoras: e.target.checked,
                          })
                        }
                      />
                      Sumar horas
                    </label>

                    <input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Nota"
                      value={alumno.calificacion ?? ""}
                      onChange={(e) =>
                        handleAlumnoChange(alumno.id, {
                          calificacion:
                            e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                    />

                    <input
                      type="number"
                      min="0"
                      placeholder="Fallas"
                     value={alumno.fallas ?? ""}
                      onChange={(e) =>
                        handleAlumnoChange(alumno.id, {
                          fallas: e.target.value === "" ? 0 : Number(e.target.value),
                        })
                     }
                    />
                  </div>

                  <textarea
                    rows="2"
                    placeholder="Observación del alumno en esta clase"
                    value={alumno.observacion || ""}
                    onChange={(e) =>
                      handleAlumnoChange(alumno.id, {
                        observacion: e.target.value,
                      })
                    }
                  />
                </div>
              );
            })}

            {alumnos.length === 0 && (
              <div className="empty-box">Esta clase no tiene alumnos asignados.</div>
            )}
          </div>
        </div>

        <div className="modal-actions-pro">
          <button type="button" className="btn-principal-modal" onClick={handleSave}>
            Guardar cambios
          </button>

          <button type="button" className="btn-secundario-modal" onClick={onClose}>
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

function getEstadoPago(alumno, pagos) {
  let plan = pagos.find(
    (p) =>
      String(p.alumnoId) === String(alumno.alumnoId) ||
      String(p.alumnoId) === String(alumno.id) ||
      String(p.alumnoDbId) === String(alumno.id)
  );

  if (!plan) {
    plan = pagos.find(
      (p) => String(p.alumno).trim().toLowerCase() === String(alumno.nombre).trim().toLowerCase()
    );
  }

  return plan?.estado || alumno.estadoPago || "Sin plan";
}