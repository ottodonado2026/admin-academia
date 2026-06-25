import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "./AsesoresPanel.css";
import "./AsesoresDirectorio.css";
import { supabase } from "../services/supabaseClient";

import { useEffect, useState, useMemo } from "react";

import { getLeads } from "../services/leadsService";



const formatearPesos = (valor) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(Number(valor || 0));



function AsesoresDirectorioSection() {
  const navigate = useNavigate();

  const [asesores, setAsesores] = useState([]);
  const [vistaAsesores, setVistaAsesores] = useState("activos");
  const [leads, setLeads] = useState([]);
  const [selectedAsesor, setSelectedAsesor] = useState(null);
  
  const [nuevoEmail, setNuevoEmail] = useState("");
const [refresh, setRefresh] = useState(0);

const [usuarioActual, setUsuarioActual] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem("auth");
    localStorage.removeItem("user");
    navigate("/");
  };

  useEffect(() => {
  const fetchUsuarioActual = async () => {
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.error("Error obteniendo usuario Auth:", authError);
        return;
      }

      const authUser = authData?.user;

      if (!authUser) return;

      const { data, error } = await supabase
        .from("usuarios")
        .select("*")
        .eq("auth_uid", authUser.id)
        .maybeSingle();

      if (error) {
        console.error("Error cargando usuario actual:", error);
        return;
      }

      setUsuarioActual(data);
    } catch (error) {
      console.error("Error inesperado cargando usuario actual:", error);
    }
  };

  fetchUsuarioActual();
}, []);

  // 🔹 Cargar asesores
  useEffect(() => {
  const fetchAsesores = async () => {

        if (!usuarioActual) return;

let asesoresQuery = supabase
  .from("asesores")
  .select("*");

if (vistaAsesores === "eliminados") {
  asesoresQuery = asesoresQuery.in("estado", ["eliminado", "inactivo"]);
} else {
  asesoresQuery = asesoresQuery.neq("estado", "eliminado");
}

/* 🔐 Permisos:
   - admin / owner / contador / coordinador principal ven todos
   - coordinador secundario solo ve los que creó
*/
const esAdministrador =
  usuarioActual?.role === "admin" ||
  usuarioActual?.role === "owner" ||
  usuarioActual?.role === "contador";

const esCoordinadorPrincipal =
  usuarioActual?.role === "coordinador_academico" &&
  (
    usuarioActual?.puede_registrar_coordinadores === true ||
    usuarioActual?.coordinador_nivel === "principal"
  );

const puedeVerTodos =
  usuarioActual?.puede_ver_todos_leads === true;

if (!esAdministrador && !esCoordinadorPrincipal && !puedeVerTodos) {
  asesoresQuery = asesoresQuery.eq("creado_por", usuarioActual?.id);
}

const { data, error } = await asesoresQuery.order("created_at", {
  ascending: false,
});

if (error) {
  console.error(error);
  setAsesores([]);
  return;
}

const adaptados = data.map(a => ({
  ...a,
  asesorId: a.asesor_id, // 🔥 MAPEO CLAVE
  salarioBase: a.salario_base,
  metaMensual: a.meta_mensual,
  comisionNuevo: a.comision_nuevo,
  comisionActivo: a.comision_activo,
  comisionReactivado: a.comision_reactivado
}));

setAsesores(adaptados);


  
  };
  fetchAsesores();
}, [refresh, vistaAsesores, usuarioActual]);

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
    const estaActivo = asesor.estado === "activo";
   const leadsAsesor = estaActivo
  ? leads.filter(
      (l) =>
        l.asesorId === asesor.id || 
        l.asesorId === asesor.asesorId
    )
  : [];
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
const eliminarAsesor = async (asesor) => {
  if (!asesor?.id) {
    alert("No se encontró el asesor seleccionado.");
    return;
  }

  const confirmar = window.confirm(
    `¿Seguro que deseas desvincular a ${asesor?.nombre || "este asesor"}?\n\nNo se borrará su historial. Solo quedará oculto como eliminado.`
  );

  if (!confirmar) return;

  const { error } = await supabase
    .from("asesores")
    .update({
      estado: "eliminado",
      eliminado_at: new Date().toISOString(),
      eliminado_por: usuarioActual?.id ? String(usuarioActual.id) : null,
      eliminado_por_nombre:
        usuarioActual?.nombre ||
        usuarioActual?.nombre_completo ||
        usuarioActual?.email ||
        "Usuario",
      actualizado_at: new Date().toISOString(),
    })
    .eq("id", asesor.id);

  if (error) {
    console.error("Error desvinculando asesor:", error);
    alert(error.message || "No se pudo desvincular el asesor.");
    return;
  }

  setAsesores((prev) =>
    prev.filter((item) => String(item.id) !== String(asesor.id))
  );

  setSelectedAsesor(null);
  setRefresh((prev) => prev + 1);
};

 const updateEstadoAsesor = async (id, nuevoEstado) => {
  const { error } = await supabase
    .from("asesores")
    .update({
      estado: nuevoEstado,
      actualizado_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Error actualizando estado:", error);
    alert("No se pudo actualizar el estado del asesor");
    return;
  }

  setAsesores((prev) =>
    prev.map((asesor) =>
      String(asesor.id) === String(id)
        ? { ...asesor, estado: nuevoEstado }
        : asesor
    )
  );
};

const restaurarAsesor = async (asesor) => {
  if (!asesor?.id) {
    alert("No se encontró el asesor seleccionado.");
    return;
  }

  const confirmar = window.confirm(
    `¿Seguro que deseas restaurar a ${asesor?.nombre || "este asesor"}?`
  );

  if (!confirmar) return;

  const { error } = await supabase
    .from("asesores")
    .update({
      estado: "activo",
      eliminado_at: null,
      eliminado_por: null,
      eliminado_por_nombre: null,
      actualizado_at: new Date().toISOString(),
    })
    .eq("id", asesor.id);

  if (error) {
    console.error("Error restaurando asesor:", error);

   alert(error.message || "No se pudo restaurar el asesor.");
    return;
  }

 alert("Asesor restaurado correctamente.");
  setRefresh((prev) => prev + 1);
};

const activarAsesor = async (asesor) => {
  if (!asesor?.id) {
    alert("No se encontró el asesor seleccionado.");
    return;
  }

  const { error } = await supabase
    .from("asesores")
    .update({
      estado: "activo",
      actualizado_at: new Date().toISOString(),
    })
    .eq("id", asesor.id);

  if (error) {
    console.error("Error activando asesor:", error);

    alert(error.message || "No se pudo activar el asesor.");

    return;
  }

 alert("Asesor activado correctamente.");

  setRefresh((prev) => prev + 1);
};

  // 🔹 reset password
 const resetPassword = async (email) => {
  const { error } = await supabase.auth.resetPasswordForEmail(email);

  if (error) {
    console.error(error);
    alert("Error enviando correo");
  } else {
    alert("Correo de recuperación enviado");
  }
};
  const selected = useMemo(() => {
    return asesoresConMetricas.find(a => a.id === selectedAsesor);
  }, [selectedAsesor, asesoresConMetricas]);

  return (
    <div className="dashboard-layout">
      <Sidebar onLogout={handleLogout} />

      <main className="dashboard-main">

<header className="asesores-admin-topbar asesores-directorio-topbar">
  <div>
    <p className="asesores-admin-kicker">Gestión comercial avanzada</p>
    <h1>
      {vistaAsesores === "eliminados"
        ? "Asesores eliminados e inactivos"
        : "Asesores"}
    </h1>
    <span>
      {vistaAsesores === "eliminados"
        ? "Consulta asesores eliminados o inactivos y restáuralos cuando corresponda."
        : "Administra asesores comerciales, estados, métricas y desempeño."}
    </span>
  </div>

  <button
    type="button"
    className={
      vistaAsesores === "eliminados"
        ? "asesores-toggle-deleted active"
        : "asesores-toggle-deleted"
    }
    onClick={() =>
      setVistaAsesores((prev) =>
        prev === "eliminados" ? "activos" : "eliminados"
      )
    }
  >
    {vistaAsesores === "eliminados"
      ? "Volver a asesores"
      : "Asesores eliminados"}
  </button>
</header>

        <section className="asesor-card-block">

          <div className="asesores-directorio-list">

          {asesoresConMetricas.length === 0 ? (
  <div className="asesores-empty-state">
    <div className="asesores-empty-icon">👥</div>

  <h2>
  {vistaAsesores === "eliminados"
    ? "No hay asesores eliminados o inactivos"
    : "No hay asesores registrados"}
</h2>

   <p>
  {vistaAsesores === "eliminados"
    ? "Cuando elimines o desactives asesores, aparecerán aquí para poder restaurarlos o activarlos nuevamente."
    : "Cuando registres asesores comerciales, aparecerán aquí con sus métricas, estado, ventas, comisiones y acciones rápidas."}
</p>

    {vistaAsesores !== "eliminados" && (
  <div className="asesores-empty-actions">
    <button
      type="button"
      className="btn-ver"
      onClick={() => navigate("/asesores-admin")}
    >
      Registrar primer asesor
    </button>
  </div>
)}


  </div>
) : (
  asesoresConMetricas.map((asesor) => (
    <div key={asesor.id} className="asesor-item">

      <div className="asesor-left">
        <div className="asesor-nombre">{asesor.nombre}</div>
        <div className="asesor-id">{asesor.asesorId}</div>
      </div>

      <div className="asesor-metricas">

        <div className="metrica-item">
          <span>Leads</span>

          <strong>
            {asesor.estado !== "activo" ? "—" : asesor.totalLeads}
          </strong>
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

  {vistaAsesores !== "eliminados" && (
    <>
      <select
        className={`status-select status-${asesor.estado || "activo"}`}
        value={asesor.estado || "activo"}
        onChange={(e) =>
          updateEstadoAsesor(asesor.id, e.target.value)
        }
      >
        <option value="activo">Activo</option>
        <option value="inactivo">Inactivo</option>
        <option value="vacaciones">Vacaciones</option>
      </select>

      <button
        className="btn-ver"
        onClick={() => setSelectedAsesor(asesor.id)}
      >
        Ver
      </button>

      <button
        className="btn-delete"
        onClick={() => eliminarAsesor(asesor)}
        title="Desvincular asesor"
      >
        🗑
      </button>
    </>
  )}

  {vistaAsesores === "eliminados" && asesor.estado === "eliminado" && (
    <button
      type="button"
      className="table-btn restore-btn"
      onClick={() => restaurarAsesor(asesor)}
    >
      Restaurar asesor
    </button>
  )}

  {vistaAsesores === "eliminados" && asesor.estado === "inactivo" && (
    <button
      type="button"
      className="table-btn activate-btn"
      onClick={() => activarAsesor(asesor)}
    >
      Activar asesor
    </button>
  )}

</div>

    </div>
  ))
)}

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
        
        alert("Actualizar email pendiente de migrar a Supabase");
     

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