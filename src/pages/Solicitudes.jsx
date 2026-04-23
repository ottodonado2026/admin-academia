import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import "./Solicitudes.css";

const SOLICITUDES_KEY = "solicitudesCambios";
const LEADS_KEY = "leads";

const leerJSON = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
};

const guardarJSON = (key, data) => {
  localStorage.setItem(key, JSON.stringify(data));
};

function Solicitudes() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [solicitudActiva, setSolicitudActiva] = useState(null);

  useEffect(() => {
    setSolicitudes(leerJSON(SOLICITUDES_KEY));
  }, []);

  const aprobarSolicitud = (solicitud) => {
    const leads = leerJSON(LEADS_KEY);

    const updated = leads.map((l) =>
      l.id === solicitud.leadId
        ? {
            ...l,
            ...solicitud.cambios,
           aprobadoPorAdmin: true,
requiereAprobacion: false,
bloqueado: false, // 🔥 CLAVE
          }
        : l
    );

    guardarJSON(LEADS_KEY, updated);
    actualizarEstado(solicitud.id, "aprobado");
  };

  const rechazarSolicitud = (id) => {
    actualizarEstado(id, "rechazado");
  };

  const actualizarEstado = (id, estado) => {
    const nuevas = solicitudes.map((s) =>
      s.id === id ? { ...s, estado } : s
    );
    guardarJSON(SOLICITUDES_KEY, nuevas);
    setSolicitudes(nuevas);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main solicitudes-page">
        <h1>Solicitudes de edición</h1>

        {/* GRID PRO 4 COLUMNAS */}
        <div className="solicitudes-grid">
          {solicitudes.map((s) => (
            <div key={s.id} className="solicitud-card-pro">

              <div className="card-top">
                <div>
                  <h3>{s.asesorNombre}</h3>
                  <p>Solicitud de edición</p>
                </div>

                <span className={`estado ${s.estado}`}>
                  {s.estado}
                </span>
              </div>

          <div className="card-info">
  <div className="card-info-block">
    <small>Alumno</small>
    <strong>{s.alumnoNombre || "Sin nombre"}</strong>
  </div>

  <div className="card-info-block">
    <small>ID</small>
    <strong>{s.alumnoId || "-"}</strong>
  </div>
</div>

              <button
                className="btn-ver"
                onClick={() => setSolicitudActiva(s)}
              >
                Ver detalle
              </button>

            </div>
          ))}
        </div>

        {/* MODAL PRO REAL */}
{solicitudActiva && (
  <div
    className="modal-overlay"
    onClick={() => setSolicitudActiva(null)}
  >
    <div
      className="modal-card pro"
      onClick={(e) => e.stopPropagation()}
    >

      {/* HEADER */}
      <div className="modal-header-pro">
        <div>
          <h2>{solicitudActiva.alumnoNombre}</h2>
          <p className="modal-sub">
            {solicitudActiva.asesorNombre} • {solicitudActiva.alumnoId}
          </p>
        </div>

        <span className={`estado-pill ${solicitudActiva.estado}`}>
          {solicitudActiva.estado}
        </span>
      </div>

      {/* MOTIVO */}
      <div className="motivo-box-pro">
        <span>Motivo de la edición</span>
        <p>{solicitudActiva.motivo}</p>
      </div>

      {/* GRID DATOS */}
      <div className="modal-grid-pro">

        <div className="modal-item">
          <span>Curso</span>
          <strong>{solicitudActiva.cambios?.cursoNombre}</strong>
        </div>

        <div className="modal-item">
          <span>Tipo</span>
          <strong>{solicitudActiva.cambios?.tipoPrograma}</strong>
        </div>

        <div className="modal-item">
          <span>Duración</span>
          <strong>{solicitudActiva.cambios?.duracion} <span>meses</span></strong>
        </div>

        <div className="modal-item">
          <span>Descuento</span>
          <strong>{solicitudActiva.cambios?.descuento}%</strong>
        </div>

        <div className="modal-item full">
          <span>Nuevo valor</span>
          <strong>${solicitudActiva.cambios?.valor}</strong>
        </div>

      </div>

      {/* ACCIONES */}
      {solicitudActiva.estado === "pendiente" && (
        <div className="modal-actions-pro">

          <button
            className="btn-aprobar"
            onClick={() => {
              aprobarSolicitud(solicitudActiva);
              setSolicitudActiva(null);
            }}
          >
            Aprobar
          </button>

          <button
            className="btn-rechazar"
            onClick={() => {
              rechazarSolicitud(solicitudActiva.id);
              setSolicitudActiva(null);
            }}
          >
            Rechazar
          </button>

        </div>
      )}

      {/* CERRAR */}
      <button
        className="btn-close-pro"
        onClick={() => setSolicitudActiva(null)}
      >
        Cerrar
      </button>

    </div>
  </div>
)}
      </main>
    </div>
  );
}

export default Solicitudes;