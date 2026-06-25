import { useEffect, useState, useMemo } from "react";
import Sidebar from "../components/Sidebar";
import { supabase } from "../services/supabaseClient";
import { useAuth } from "../context/AuthContext";
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
  const { user } = useAuth();
  const [tabActiva, setTabActiva] = useState("clientes");

  // Estado para edición de clientes (Legacy - LocalStorage)
  const [solicitudesClientes, setSolicitudesClientes] = useState([]);
  const [solicitudClienteActiva, setSolicitudClienteActiva] = useState(null);

  // Estado para cambio de claves (Supabase)
  const [solicitudesClaves, setSolicitudesClaves] = useState([]);
  const [solicitudClaveActiva, setSolicitudClaveActiva] = useState(null);
  const [loadingBackend, setLoadingBackend] = useState(false);

  useEffect(() => {
    setSolicitudesClientes(leerJSON(SOLICITUDES_KEY));
    cargarSolicitudesClaves();
  }, []);

  const cargarSolicitudesClaves = async () => {
    try {
      const { data, error } = await supabase
        .from('solicitudes')
        .select('*')
        .eq('tipo', 'cambio_clave')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSolicitudesClaves(data || []);
    } catch (err) {
      console.error("Error cargando solicitudes de clave:", err);
    }
  };

  const aprobarSolicitudCliente = (solicitud) => {
    const leads = leerJSON(LEADS_KEY);

    const updated = leads.map((l) =>
      l.id === solicitud.leadId
        ? {
            ...l,
            ...solicitud.cambios,
            aprobadoPorAdmin: true,
            requiereAprobacion: false,
            bloqueado: false,
          }
        : l
    );

    guardarJSON(LEADS_KEY, updated);
    actualizarEstadoCliente(solicitud.id, "aprobado");
  };

  const rechazarSolicitudCliente = (id) => {
    actualizarEstadoCliente(id, "rechazado");
  };

  const actualizarEstadoCliente = (id, estado) => {
    const nuevas = solicitudesClientes.map((s) =>
      s.id === id ? { ...s, estado } : s
    );
    guardarJSON(SOLICITUDES_KEY, nuevas);
    setSolicitudesClientes(nuevas);
  };

  const procesarSolicitudClave = async (id, accion) => {
    setLoadingBackend(true);
    try {
      const res = await fetch('/api/cambiarPassword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solicitudId: id,
          accion: accion,
          adminAuthUid: user?.authUid || user?.id
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Error en el servidor');
      }

      alert(data.message);
      cargarSolicitudesClaves();
      setSolicitudClaveActiva(null);
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setLoadingBackend(false);
    }
  };

  // KPIs
  const pendientesClientes = useMemo(() => solicitudesClientes.filter(s => s.estado === 'pendiente').length, [solicitudesClientes]);
  const pendientesClaves = useMemo(() => solicitudesClaves.filter(s => s.estado === 'pendiente').length, [solicitudesClaves]);
  const totalAprobadas = useMemo(() => 
    solicitudesClientes.filter(s => s.estado === 'aprobado').length + 
    solicitudesClaves.filter(s => s.estado === 'aprobado').length, 
  [solicitudesClientes, solicitudesClaves]);

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main solicitudes-page">
        <div className="page-header-pro">
          <div>
            <h1>Centro de Solicitudes</h1>
            <p>Gestiona y aprueba requerimientos de tus asesores y profesores.</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="kpis-row">
          <div className="kpi-card-pro">
            <div className="kpi-icon warning">⏳</div>
            <div className="kpi-info">
              <span>Pendientes Totales</span>
              <strong>{pendientesClientes + pendientesClaves}</strong>
            </div>
          </div>
          <div className="kpi-card-pro">
            <div className="kpi-icon success">✅</div>
            <div className="kpi-info">
              <span>Aprobadas Histórico</span>
              <strong>{totalAprobadas}</strong>
            </div>
          </div>
          <div className="kpi-card-pro">
            <div className="kpi-icon info">👥</div>
            <div className="kpi-info">
              <span>Edición de Clientes</span>
              <strong>{pendientesClientes} <small>pendientes</small></strong>
            </div>
          </div>
          <div className="kpi-card-pro">
            <div className="kpi-icon danger">🔑</div>
            <div className="kpi-info">
              <span>Contraseñas</span>
              <strong>{pendientesClaves} <small>pendientes</small></strong>
            </div>
          </div>
        </div>

        <div className="tabs-container-pro">
          <button 
            className={`tab-btn-pro ${tabActiva === 'clientes' ? 'active' : ''}`}
            onClick={() => setTabActiva('clientes')}
          >
            📋 Edición de Clientes
            {pendientesClientes > 0 && <span className="tab-badge">{pendientesClientes}</span>}
          </button>
          <button 
            className={`tab-btn-pro ${tabActiva === 'claves' ? 'active' : ''}`}
            onClick={() => setTabActiva('claves')}
          >
            🔑 Cambio de Contraseñas
            {pendientesClaves > 0 && <span className="tab-badge">{pendientesClaves}</span>}
          </button>
        </div>

        {tabActiva === "clientes" && (
          <div className="tab-content-pro">
            {solicitudesClientes.length === 0 ? (
              <div className="empty-state-pro">
                <div className="empty-icon">✨</div>
                <h3>Todo al día</h3>
                <p>No tienes solicitudes de edición de clientes pendientes o registradas en este momento.</p>
              </div>
            ) : (
              <div className="solicitudes-grid-pro">
                {solicitudesClientes.map((s) => (
                  <div key={s.id} className="solicitud-card-premium">
                    <div className="card-top-premium">
                      <div className="card-header-main">
                        <div className="avatar-pro">
                          {s.asesorNombre?.substring(0, 2).toUpperCase() || "AS"}
                        </div>
                        <div className="card-top-info">
                          <h3>{s.asesorNombre}</h3>
                          <p>Asesor</p>
                        </div>
                      </div>
                      <span className={`estado-badge-pro ${s.estado}`}>
                        {s.estado}
                      </span>
                    </div>

                    <div className="card-body-premium">
                      <div className="info-line">
                        <span>Alumno:</span>
                        <strong>{s.alumnoNombre || "Sin nombre"}</strong>
                      </div>
                      <div className="info-line">
                        <span>ID Alumno:</span>
                        <strong>{s.alumnoId || "-"}</strong>
                      </div>
                    </div>

                    <button className="btn-ver-premium" onClick={() => setSolicitudClienteActiva(s)}>
                      Revisar solicitud
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tabActiva === "claves" && (
          <div className="tab-content-pro">
            {solicitudesClaves.length === 0 ? (
              <div className="empty-state-pro">
                <div className="empty-icon">🛡️</div>
                <h3>Todo seguro</h3>
                <p>Nadie ha solicitado un cambio de contraseña recientemente.</p>
              </div>
            ) : (
              <div className="solicitudes-grid-pro">
                {solicitudesClaves.map((s) => (
                  <div key={s.id} className="solicitud-card-premium">
                    <div className="card-top-premium">
                      <div className="card-header-main">
                        <div className="avatar-pro alt">
                          {s.solicitante_nombre?.substring(0, 2).toUpperCase() || "XX"}
                        </div>
                        <div className="card-top-info">
                          <h3>{s.solicitante_nombre}</h3>
                          <p style={{textTransform:'capitalize'}}>{s.solicitante_tipo}</p>
                        </div>
                      </div>
                      <span className={`estado-badge-pro ${s.estado}`}>
                        {s.estado}
                      </span>
                    </div>

                    <div className="card-body-premium">
                      <div className="info-line">
                        <span>Solicita:</span>
                        <strong>Cambio de clave</strong>
                      </div>
                      <div className="info-line">
                        <span>Motivo:</span>
                        <strong style={{ opacity: 0.7 }}>Olvido / Reset</strong>
                      </div>
                    </div>

                    <button className="btn-ver-premium alt-btn" onClick={() => setSolicitudClaveActiva(s)}>
                      Revisar solicitud
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* MODAL EDICIÓN DE CLIENTES */}
        {solicitudClienteActiva && (
          <div className="modal-overlay" onClick={() => setSolicitudClienteActiva(null)}>
            <div className="modal-card-premium" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-premium">
                <div>
                  <h2>{solicitudClienteActiva.alumnoNombre}</h2>
                  <p className="modal-sub">
                    Enviado por {solicitudClienteActiva.asesorNombre} • {solicitudClienteActiva.alumnoId}
                  </p>
                </div>
                <span className={`estado-pill-premium ${solicitudClienteActiva.estado}`}>
                  {solicitudClienteActiva.estado}
                </span>
              </div>

              <div className="motivo-box-premium">
                <div className="motivo-icon">📝</div>
                <div>
                  <span>Motivo de la edición</span>
                  <p>{solicitudClienteActiva.motivo}</p>
                </div>
              </div>

              <div className="modal-grid-premium">
                <div className="modal-item">
                  <span>Curso</span>
                  <strong>{solicitudClienteActiva.cambios?.cursoNombre}</strong>
                </div>
                <div className="modal-item">
                  <span>Tipo</span>
                  <strong>{solicitudClienteActiva.cambios?.tipoPrograma}</strong>
                </div>
                <div className="modal-item">
                  <span>Duración</span>
                  <strong>{solicitudClienteActiva.cambios?.duracion} <span>meses</span></strong>
                </div>
                <div className="modal-item">
                  <span>Descuento</span>
                  <strong>{solicitudClienteActiva.cambios?.descuento}%</strong>
                </div>
                <div className="modal-item full">
                  <span>Nuevo valor a pagar</span>
                  <strong>${solicitudClienteActiva.cambios?.valor}</strong>
                </div>
              </div>

              {solicitudClienteActiva.estado === "pendiente" && (
                <div className="modal-actions-premium">
                  <button className="btn-aprobar-premium" onClick={() => { aprobarSolicitudCliente(solicitudClienteActiva); setSolicitudClienteActiva(null); }}>
                    ✓ Aprobar Edición
                  </button>
                  <button className="btn-rechazar-premium" onClick={() => { rechazarSolicitudCliente(solicitudClienteActiva.id); setSolicitudClienteActiva(null); }}>
                    ✕ Rechazar
                  </button>
                </div>
              )}

              <button className="btn-close-premium" onClick={() => setSolicitudClienteActiva(null)}>Cerrar panel</button>
            </div>
          </div>
        )}

        {/* MODAL CAMBIO DE CLAVES */}
        {solicitudClaveActiva && (
          <div className="modal-overlay" onClick={() => setSolicitudClaveActiva(null)}>
            <div className="modal-card-premium" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-premium">
                <div>
                  <h2>{solicitudClaveActiva.solicitante_nombre}</h2>
                  <p className="modal-sub" style={{textTransform:'capitalize'}}>
                    {solicitudClaveActiva.solicitante_tipo} • ID: {solicitudClaveActiva.solicitante_id}
                  </p>
                </div>
                <span className={`estado-pill-premium ${solicitudClaveActiva.estado}`}>
                  {solicitudClaveActiva.estado}
                </span>
              </div>

              <div className="motivo-box-premium alert">
                <div className="motivo-icon">🔑</div>
                <div>
                  <span>Nueva contraseña solicitada</span>
                  <p className="password-display">
                    {solicitudClaveActiva.nueva_clave}
                  </p>
                </div>
              </div>

              <p className="modal-disclaimer">
                Si apruebas esta solicitud, la contraseña de acceso del {solicitudClaveActiva.solicitante_tipo} se actualizará automáticamente en el sistema y perderá acceso con su clave anterior.
              </p>

              {solicitudClaveActiva.estado === "pendiente" && (
                <div className="modal-actions-premium">
                  <button 
                    className="btn-aprobar-premium" 
                    disabled={loadingBackend}
                    onClick={() => procesarSolicitudClave(solicitudClaveActiva.id, 'aprobar')}
                  >
                    {loadingBackend ? "Procesando..." : "✓ Aprobar y Cambiar Clave"}
                  </button>
                  <button 
                    className="btn-rechazar-premium" 
                    disabled={loadingBackend}
                    onClick={() => procesarSolicitudClave(solicitudClaveActiva.id, 'rechazar')}
                  >
                    ✕ Rechazar
                  </button>
                </div>
              )}

              <button className="btn-close-premium" onClick={() => setSolicitudClaveActiva(null)}>Cerrar panel</button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default Solicitudes;