import { useState } from "react";

export default function ModalSeguimiento({
  alumno,
  onClose,
  onSave,
}) {
  const [nota, setNota] = useState("");

  const guardar = () => {
    onSave({
      alumnoId: alumno.id,
      texto: nota,
      fecha: new Date().toISOString(),
    });
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>{alumno.nombre}</h2>
        <p>{alumno.curso}</p>

        <textarea
          placeholder="Escribe seguimiento académico..."
          value={nota}
          onChange={(e) => setNota(e.target.value)}
        />

        <div className="modal-actions">
          <button onClick={guardar}>Guardar</button>
          <button onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}