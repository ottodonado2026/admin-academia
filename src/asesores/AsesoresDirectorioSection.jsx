import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "./AsesoresPanel.css";
import "./AsesoresDirectorio.css";

import { useEffect, useState, useMemo } from "react";
import { db } from "../firebase";
import { collection, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { getLeads } from "../services/leadsService";import { getAuth, sendPasswordResetEmail } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
const auth = getAuth();

const formatearPesos = (valor) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(Number(valor || 0));

const functions = getFunctions();
const actualizarEmailAsesorFn = httpsCallable(functions, "actualizarEmailAsesor");


function AsesoresDirectorioSection() {
  const navigate = useNavigate();

  const [asesores, setAsesores] = useState([]);
  const [leads, setLeads] = useState([]);
  const [selectedAsesor, setSelectedAsesor] = useState(null);
  
  const [nuevoEmail, setNuevoEmail] = useState("");
const [refresh, setRefresh] = useState(0);

  const handleLogout = () => {
    localStorage.removeItem("auth");
    localStorage.removeItem("user");
    navigate("/");
  };

  // 🔹 Cargar asesores
  useEffect(() => {
  const fetchAsesores = async () => {
    const snapshot = await getDocs(collection(db, "asesores"));
    const data = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setAsesores(data);
  };
  fetchAsesores();
}, [refresh]);

  // 🔹 Cargar leads
  useEffect(() => {
    const fetchLeads = async () => {
      const data = await getLeads();
      setLeads(data || []);
    };
    fetchLeads();
  }, []);

  // 🔹 Métricas
 const getCommissionRate = (asesor, tipoCliente) => {
  if (tipoCliente === "nuevo") return Number(asesor?.comisionNuevo ?? 10);
  if (tipoCliente === "activo") return Number(asesor?.comisionActivo ?? 5);
  if (tipoCliente === "reactivado") return Number(asesor?.comisionReactivado ?? 7);
  return 0;
};

const asesoresConMetricas = useMemo(() => {
  return asesores.map((asesor) => {
    const leadsAsesor = leads.filter(
      (l) => l.asesorId === asesor.id
    );
const totalLeads = leadsAsesor.length;

const seguimiento = leadsAsesor.filter(
  (l) =>
    l.estado === "seguimiento" ||
    l.estado === "visita_programada"
).length;

const pendientes = leadsAsesor.filter(
  (l) => l.estado === "pendiente"
).length;

const activos = leadsAsesor.filter(
  (l) => l.estado === "activo"
).length;

const matriculados = leadsAsesor.filter(
  (l) =>
    l.estado === "inscrito" ||
    l.estado === "pagado"
).length;

const volumenVentas = leadsAsesor
  .filter((l) => l.estado === "pagado")
  .reduce((acc, l) => acc + Number(l.valor || 0), 0);

const comisionesGanadas = leadsAsesor.reduce((acc, l) => {
  if (l.estado !== "pagado") return acc;

  const rate = getCommissionRate(asesor, l.tipoCliente);
  return acc + (Number(l.valor || 0) * rate) / 100;
}, 0);

const progresoMeta =
  Number(asesor.metaMensual || 0) > 0
    ? (volumenVentas / Number(asesor.metaMensual || 0)) * 100
    : 0;

const conversion =
  totalLeads > 0 ? ((matriculados / totalLeads) * 100).toFixed(1) : "0.0";

return {
  ...asesor,
  totalLeads,
  seguimiento,
  pendientes,
  activos,
  matriculados,
  volumenVentas,
  comisionesGanadas,
  progresoMeta,
  conversion,
  leadsAsesor,
  linkAsesor: `${window.location.origin}/registro-asesor/${asesor.id}`,

  // compatibilidad temporal con tu UI actual
  ventas: volumenVentas,
  comision: comisionesGanadas,
};
   
  });
}, [asesores, leads]);

  // 🔹 eliminar
  const eliminarAsesor = async (id) => {
    await deleteDoc(doc(db, "asesores", id));
    setAsesores((prev) => prev.filter((a) => a.id !== id));
  };

  // 🔹 reset password
  const resetPassword = async (email) => {
    await sendPasswordResetEmail(auth, email);
    alert("Correo enviado");
  };

  const selected = useMemo(() => {
    return asesoresConMetricas.find(a => a.id === selectedAsesor);
  }, [selectedAsesor, asesoresConMetricas]);

  return (
    <div className="dashboard-layout">
      <Sidebar onLogout={handleLogout} />

      <main className="dashboard-main">

        <header className="asesores-admin-topbar">
          <div>
            <p className="asesores-admin-kicker">Gestión comercial avanzada</p>
            <h1>Asesores</h1>
          </div>
        </header>

        <section className="asesor-card-block">

          <div className="asesores-directorio-list">

            {asesoresConMetricas.map((asesor) => (
              <div key={asesor.id} className="asesor-item">

                <div className="asesor-left">
                  <div className="asesor-nombre">{asesor.nombre}</div>
                  <div className="asesor-email">{asesor.email}</div>
                </div>

              <div className="asesor-metricas">

  <div className="metrica-item">
    <span>Leads</span>
    <strong>{asesor.totalLeads}</strong>
  </div>

  <div className="metrica-item">
    <span>Ventas</span>
    <strong>{formatearPesos(asesor.ventas)}</strong>
  </div>

  <div className="metrica-item">
    <span>Comisión</span>
    <strong>{formatearPesos(asesor.comision)}</strong>
  </div>

</div>

                <div className="asesor-actions">
                  <button onClick={() => setSelectedAsesor(asesor.id)}>
                    Ver
                  </button>

                  <button
                    className="btn-delete"
                    onClick={() => eliminarAsesor(asesor.id)}
                  >
                    🗑
                  </button>
                </div>

              </div>
            ))}

          </div>

        </section>

      </main>

{/* 🔥 MODAL PRO BASE */}
{selected && (
  <div className="asesor-modal-overlay" onClick={() => setSelectedAsesor(null)}>
    <div className="asesor-modal" onClick={(e) => e.stopPropagation()}>

      <div className="asesor-modal-head">

        <div className="modal-title-block">
          <p className="asesores-admin-kicker">Ficha completa</p>
          <h3>{selected.nombre}</h3>
          <span>{selected.email}</span>
        </div>

        <div
          className={`meta-badge ${
            selected.progresoMeta < 50
              ? "meta-low"
              : selected.progresoMeta < 80
              ? "meta-mid"
              : "meta-high"
          }`}
        >
          <div className="meta-top">
            <small>Meta</small>
            <strong>{selected.progresoMeta.toFixed(1)}%</strong>
          </div>

          <div className="meta-bar">
            <div
              className="meta-bar-fill"
              style={{
                width: `${Math.min(selected.progresoMeta, 100)}%`,
              }}
            />
          </div>
        </div>

        <button
          className="modal-close-btn"
          onClick={() => setSelectedAsesor(null)}
        >
          ✕
        </button>

      </div>
<div className="modal-info-grid">

  <div className="modal-info-card">
    <small>ID asesor</small>
    <strong>{selected.asesorId || selected.id}</strong>
  </div>

  <div className="modal-info-card">
    <small>Teléfono</small>
    <strong>{selected.telefono || "No registrado"}</strong>
  </div>

  <div className="modal-info-card">
    <small>Salario base</small>
    <strong>{formatearPesos(selected.salarioBase)}</strong>
  </div>

  <div className="modal-info-card">
    <small>Meta mensual</small>
    <strong>{formatearPesos(selected.metaMensual)}</strong>
  </div>

  <div className="modal-info-card">
    <small>Leads</small>
    <strong>{selected.totalLeads}</strong>
  </div>

  <div className="modal-info-card">
    <small>Seguimiento</small>
    <strong>{selected.seguimiento}</strong>
  </div>

  <div className="modal-info-card">
    <small>Matriculados</small>
    <strong>{selected.matriculados}</strong>
  </div>

  <div className="modal-info-card">
    <small>Comisiones</small>
    <strong>{formatearPesos(selected.comisionesGanadas)}</strong>
  </div>



</div>

<div className="modal-info-grid modal-info-grid-stack-mobile">

<div className="modal-info-card">
  <small>Correo</small>
  <strong>{selected.email}</strong>
</div>
  <div className="modal-info-card">
    <small>Cambiar correo</small>

    <input
      type="email"
      value={nuevoEmail}
      onChange={(e) => setNuevoEmail(e.target.value)}
      placeholder="Nuevo correo del asesor"
    />
  </div>

  <div className="modal-info-card">
    <small>Acción de seguridad</small>

    <button
      type="button"
      onClick={() => resetPassword(selected.email)}
      style={{
        marginTop: "8px",
        width: "100%",
        padding: "10px",
        borderRadius: "10px",
        background: "#111",
        color: "#00ff88",
        border: "1px solid #00ff88",
        cursor: "pointer"
      }}
    >
      Restablecer contraseña
    </button>
  </div>
<div className="modal-info-card">
  <small>Actualizar correo</small>

  <button
    type="button"
    className="primary-neon-btn"
    style={{
      marginTop: "8px",
      width: "100%",
      minHeight: "48px",
    }}
    onClick={async () => {
      if (!nuevoEmail || !selected?.authUid) {
        alert("Datos incompletos");
        return;
      }

      try {
        await actualizarEmailAsesorFn({
          uid: selected.authUid,
          nuevoEmail: nuevoEmail,
          asesorId: selected.id,
        });

        alert("Correo actualizado correctamente");

        setRefresh((v) => v + 1);
        setSelectedAsesor(null);

      } catch (error) {
        console.error(error);
        alert("Error actualizando correo");
      }
    }}
  >
    Actualizar correo
  </button>
</div>
 
</div>
<div className="modal-two-columns">

  {/* IZQUIERDA */}
  <div className="modal-panel">
    <h4>Esquema de comisión</h4>

    <div className="scheme-list">
      <div>
        <span>Cliente nuevo</span>
        <strong>{selected.comisionNuevo ?? 10}%</strong>
      </div>

      <div>
        <span>Cliente activo</span>
        <strong>{selected.comisionActivo ?? 5}%</strong>
      </div>

      <div>
        <span>Reactivado</span>
        <strong>{selected.comisionReactivado ?? 7}%</strong>
      </div>
    </div>

  </div>

  {/* DERECHA */}
  <div className="modal-panel">
    <h4>Actividad reciente</h4>

    <button
  className="primary-neon-btn"
  style={{ marginTop: "10px" }}
  onClick={() => navigate(`/asesor-leads/${selected.id}`)}
>
  Ver todos los leads
</button>


    <div className="mini-leads-list">
      {selected.leadsAsesor.length === 0 ? (
        <p className="panel-empty-mini">
          Este asesor aún no registra leads.
        </p>
      ) : (
        selected.leadsAsesor.slice(0, 8).map((lead) => (
          <div className="mini-lead-item" key={lead.id}>
            <div>
              <strong>{lead.nombre}</strong>
              <span>
                {lead.cursoNombre || lead.programa || "Sin curso"}
              </span>
            </div>

            <div className="mini-lead-right">
              <em>{lead.estado}</em>
              <strong>{formatearPesos(lead.valor || 0)}</strong>
            </div>
          </div>
        ))
      )}
    </div>
  </div>

</div>

    </div>
  </div>
)}


    </div>
  );
}

export default AsesoresDirectorioSection;