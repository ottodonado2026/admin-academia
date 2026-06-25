import { useEffect, useState } from "react";
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
  const [tabActiva, setTabActiva] = useState("clientes"); // "clientes" | "claves"

  // Estado para edición de clientes (Legacy - LocalStorage)
  const [solicitudesClientes, setSolicitudesClientes] = useState([]);
  const [solicitudClienteActiva, setSolicitudClienteActiva] = useState(null);

  // Estado para cambio de claves (Supabase)
  const [solicitudesClaves, setSolicitudesClaves] = useState([]);
  const [solicitudClaveActiva, setSolicitudClaveActiva] = useState(null);
  const [loadingBackend, setLoadingBackend] = useState(false);

  useEffect(() => {
    // Cargar locales
    setSolicitudesClientes(leerJSON(SOLICITUDES_KEY));

    // Cargar de Supabase
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

  // ==========================================
  // LÓGICA DE EDICIÓN DE CLIENTES (Línea actual)
  // ==========================================
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

  // ==========================================
  // LÓGICA DE CAMBIO DE CLAVES (Backend API)
  // ==========================================
  const procesarSolicitudClave = async (id, accion) => {
    setLoadingBackend(true);
    try {
      // Como estamos en Vite/React, la ruta de la API Serverless en Vercel es /api/...
      const res = await fetch('/api/cambiarPassword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solicitudId: id,
          accion: accion, // 'aprobar' o 'rechazar'
          adminAuthUid: user?.authUid || user?.id // Enviar id del admin que aprueba
        })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Error en el servidor');
      }

      alert(data.message);
      cargarSolicitudesClaves(); // Recargar datos
      setSolicitudClaveActiva(null);
    } catch (err) {
      console.error(err);
      alert(err.message);
    } finally {
      setLoadingBackend(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main solicitudes-page">
        <h1>Centro de Solicitudes</h1>

        <div className="tabs-container">
          <button 
            className={`tab-btn ${tabActiva === 'clientes' ? 'active' : ''}`}
            onClick={() => setTabActiva('clientes')}
          >
            📋 Edición de Clientes
          </button>
          <button 
            className={`tab-btn ${tabActiva === 'claves' ? 'active' : ''}`}
            onClick={() => setTabActiva('claves')}
          >
            🔑 Cambio de Contraseñas
          </button>
        </div>

        {tabActiva === "clientes" && (
          <div className="tab-content">
            <div className="solicitudes-grid">
              {solicitudesClientes.map((s) => (
                <div key={s.id} className="solicitud-card-pro">
                  <div className="card-top">
                    <div>
                      <h3>{s.asesorNombre}</h3>
                      <p>Edición de cliente</p>
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
                    onClick={() => setSolicitudClienteActiva(s)}
                  >
                    Ver detalle
                  </button>
                </div>
              ))}
              {solicitudesClientes.length === 0 && (
                <p style={{ color: '#888' }}>No hay solicitudes de clientes.</p>
              )}
            </div>
          </div>
        )}

        {tabActiva === "claves" && (
          <div className="tab-content">
            <div className="solicitudes-grid">
              {solicitudesClaves.map((s) => (
                <div key={s.id} className="solicitud-card-pro">
                  <div className="card-top">
                    <div>
                      <h3>{s.solicitante_nombre}</h3>
                      <p style={{textTransform:'capitalize'}}>{s.solicitante_tipo}</p>
                    </div>
                    <span className={`estado ${s.estado}`}>
                      {s.estado}
                    </span>
                  </div>

                  <div className="card-info">
                    <div className="card-info-block" style={{ width: '100%' }}>
                      <small>Solicita</small>
                      <strong>Cambio de contraseña</strong>
                    </div>
                  </div>

                  <button
                    className="btn-ver"
                    onClick={() => setSolicitudClaveActiva(s)}
                  >
                    Ver detalle
                  </button>
                </div>
              ))}
              {solicitudesClaves.length === 0 && (
                <p style={{ color: '#888' }}>No hay solicitudes de contraseñas.</p>
              )}
            </div>
          </div>
        )}

        {/* MODAL EDICIÓN DE CLIENTES */}
        {solicitudClienteActiva && (
          <div className="modal-overlay" onClick={() => setSolicitudClienteActiva(null)}>
            <div className="modal-card pro" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-pro">
                <div>
                  <h2>{solicitudClienteActiva.alumnoNombre}</h2>
                  <p className="modal-sub">
                    {solicitudClienteActiva.asesorNombre} • {solicitudClienteActiva.alumnoId}
                  </p>
                </div>
                <span className={`estado-pill ${solicitudClienteActiva.estado}`}>
                  {solicitudClienteActiva.estado}
                </span>
              </div>

              <div className="motivo-box-pro">
                <span>Motivo de la edición</span>
                <p>{solicitudClienteActiva.motivo}</p>
              </div>

              <div className="modal-grid-pro">
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
                  <span>Nuevo valor</span>
                  <strong>${solicitudClienteActiva.cambios?.valor}</strong>
                </div>
              </div>

              {solicitudClienteActiva.estado === "pendiente" && (
                <div className="modal-actions-pro">
                  <button className="btn-aprobar" onClick={() => { aprobarSolicitudCliente(solicitudClienteActiva); setSolicitudClienteActiva(null); }}>Aprobar</button>
                  <button className="btn-rechazar" onClick={() => { rechazarSolicitudCliente(solicitudClienteActiva.id); setSolicitudClienteActiva(null); }}>Rechazar</button>
                </div>
              )}

              <button className="btn-close-pro" onClick={() => setSolicitudClienteActiva(null)}>Cerrar</button>
            </div>
          </div>
        )}

        {/* MODAL CAMBIO DE CLAVES */}
        {solicitudClaveActiva && (
          <div className="modal-overlay" onClick={() => setSolicitudClaveActiva(null)}>
            <div className="modal-card pro" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header-pro">
                <div>
                  <h2>{solicitudClaveActiva.solicitante_nombre}</h2>
                  <p className="modal-sub" style={{textTransform:'capitalize'}}>
                    {solicitudClaveActiva.solicitante_tipo} • ID: {solicitudClaveActiva.solicitante_id}
                  </p>
                </div>
                <span className={`estado-pill ${solicitudClaveActiva.estado}`}>
                  {solicitudClaveActiva.estado}
                </span>
              </div>

              <div className="motivo-box-pro">
                <span>Nueva contraseña solicitada</span>
                <p style={{ letterSpacing: '2px', fontFamily: 'monospace', fontWeight: 'bold' }}>
                  {solicitudClaveActiva.nueva_clave}
                </p>
              </div>

              <p style={{ margin: '15px 0', fontSize: '0.9rem', color: '#666' }}>
                Si apruebas esta solicitud, la contraseña del {solicitudClaveActiva.solicitante_tipo} se actualizará automáticamente en el sistema y podrá iniciar sesión con ella.
              </p>

              {solicitudClaveActiva.estado === "pendiente" && (
                <div className="modal-actions-pro">
                  <button 
                    className="btn-aprobar" 
                    disabled={loadingBackend}
                    onClick={() => procesarSolicitudClave(solicitudClaveActiva.id, 'aprobar')}
                  >
                    {loadingBackend ? "Procesando..." : "Aprobar y Cambiar Clave"}
                  </button>
                  <button 
                    className="btn-rechazar" 
                    disabled={loadingBackend}
                    onClick={() => procesarSolicitudClave(solicitudClaveActiva.id, 'rechazar')}
                  >
                    Rechazar
                  </button>
                </div>
              )}

              <button className="btn-close-pro" onClick={() => setSolicitudClaveActiva(null)}>Cerrar</button>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}

export default Solicitudes;