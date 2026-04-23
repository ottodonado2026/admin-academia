import { useState, useEffect, useMemo } from "react";
import { getLeads } from "../services/leadsService";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "./AsesoresPanel.css";
import { db } from "../firebase";
import { getAuth, createUserWithEmailAndPassword } from "firebase/auth";
import { signInWithEmailAndPassword } from "firebase/auth";
import { sendPasswordResetEmail } from "firebase/auth";
import { getFunctions, httpsCallable } from "firebase/functions";
import { CURSOS_BASE } from "../data/cursosBase";

import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  setDoc,
  doc,
  deleteDoc
} from "firebase/firestore";

const auth = getAuth();
const functions = getFunctions();
const actualizarEmailAsesorFn = httpsCallable(functions, "actualizarEmailAsesor");


const formatearPesos = (valor) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(Number(valor || 0));

const normalizarTexto = (texto = "") =>
  texto
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z\s]/g, " ")
    .trim();

const obtenerIniciales = (nombre = "") => {
  const limpio = normalizarTexto(nombre);
  const partes = limpio.split(/\s+/).filter(Boolean);
  if (!partes.length) return "AS";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return `${partes[0][0] || ""}${partes[1][0] || ""}`.toUpperCase();
};

const generarIdAsesor = (nombre, asesores = []) => {
  const iniciales = obtenerIniciales(nombre);
  const usados = asesores
    .map((a) => a.asesorId || "")
    .filter((id) => id.startsWith(`ID-${iniciales}-`))
    .map((id) => Number(id.split("-").pop()))
    .filter((n) => !Number.isNaN(n));

  const siguiente = usados.length ? Math.max(...usados) + 1 : 1;
  return `ID-${iniciales}-${String(siguiente).padStart(3, "0")}`;
};




const getCommissionRate = (asesor, tipoCliente) => {
  if (tipoCliente === "nuevo") return Number(asesor?.comisionNuevo ?? 10);
  if (tipoCliente === "activo") return Number(asesor?.comisionActivo ?? 5);
  if (tipoCliente === "reactivado") return Number(asesor?.comisionReactivado ?? 7);
  return 0;
};

const getLeadCommission = (lead, asesor) => {
  if (!lead || !asesor) return 0;
  if (lead.estado !== "pagado") return 0;

  const rate = getCommissionRate(asesor, lead.tipoCliente);
  return (Number(lead.valor || 0) * rate) / 100;
};


function AsesoresAdminSection() {
 
  
  const navigate = useNavigate();
  const [selectedAsesor, setSelectedAsesor] = useState(null);

  const enviarResetPassword = async () => {
  if (!selectedAsesor?.email) {
    setAlerta({
  visible: true,
  tipo: "error",
  mensaje: "El asesor no tiene correo válido",
});
    return;
  }

  try {
    await sendPasswordResetEmail(auth, selectedAsesor.email);
   setAlerta({
  visible: true,
  tipo: "success",
  mensaje: "Correo de restablecimiento enviado",
});
  } catch (error) {
    console.error("Error enviando reset password:", error);
    setAlerta({
  visible: true,
  tipo: "error",
  mensaje: "Error al enviar el correo de restablecimiento",
});
  }
};

  const handleLogout = () => {
    localStorage.removeItem("auth");
    localStorage.removeItem("user");
    navigate("/");
  };

  const [refresh, setRefresh] = useState(0);
  const [alerta, setAlerta] = useState({
  visible: false,
  tipo: "success", // success | error | warning
  mensaje: "",
});
const [confirmacion, setConfirmacion] = useState({
  visible: false,
  mensaje: "",
  onConfirm: null,
});


  
  const [nuevoEmail, setNuevoEmail] = useState("");

  const [nuevaPassword, setNuevaPassword] = useState("");

  const [form, setForm] = useState({
    nombre: "",
    email: "",
    cedula: "",
    telefono: "",
    salarioBase: "",
    metaMensual: "",
    comisionNuevo: "10",
    comisionActivo: "5",
    comisionReactivado: "7",
    estado: "activo",
    notas: "",
  });

 const [asesores, setAsesores] = useState([]);
 const [leads, setLeads] = useState([]);

 

 // 🔥 SINCRONIZAR CURSOS EN FIREBASE (ADMIN REAL)
useEffect(() => {
  
  const sincronizarCursos = async () => {
     
      

    try {
  const snapshot = await getDocs(collection(db, "cursos"));

  const cursosFirestore = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));

  for (const curso of CURSOS_BASE) {

    const cursoId = generarIdCursoBonito(curso.nombre);

    const ref = doc(db, "cursos", cursoId);

    await setDoc(
      ref,
      {
        ...curso,
        id: cursoId,
        cursoIdBonito: cursoId,
      },
      { merge: true }
    );
  } // 👈 ESTE ES EL QUE TE FALTABA

} catch (error) {
  if (import.meta.env.DEV) {
    console.error("Error sincronizando cursos:", error);
  }
}
  };

  sincronizarCursos();
}, []);



// 🔹 cargar leads
useEffect(() => {
  const fetchLeads = async () => {
    const data = await getLeads();
    setLeads(data);
  };

  fetchLeads();
}, []);

// 🔹 cargar asesores
useEffect(() => {
  const fetchAsesores = async () => {
    try {
      const snapshot = await getDocs(collection(db, "asesores"));

      const data = snapshot.docs.map((docItem) => ({
        id: docItem.id,
        ...docItem.data(),
      }));

      setAsesores(data);
    } catch (error) {
      console.error("Error cargando asesores:", error);
      setAsesores([]);
    }
  };

  fetchAsesores();
}, [refresh]);

const asesoresConMetricas = useMemo(() => {
  return (asesores || []).map((asesor) => {
    const leadsAsesor = leads.filter((lead) => lead.asesorId === asesor.id);

    const totalLeads = leadsAsesor.length;
   const seguimiento = leadsAsesor.filter(
  (lead) =>
    lead.estado === "seguimiento" ||
    lead.estado === "visita_programada"
).length;
const pendientes = leadsAsesor.filter(
  (lead) => lead.estado === "pendiente"
).length;

const activos = leadsAsesor.filter(
  (lead) => lead.estado === "activo"
).length;

    const matriculados = leadsAsesor.filter(
  (lead) =>
    lead.estado === "inscrito" ||
    lead.estado === "pagado"
).length;

    const volumenVentas = leadsAsesor
  .filter((lead) => lead.estado === "pagado")
  .reduce((acc, lead) => acc + Number(lead.valor || 0), 0);

  const progresoMeta =
  asesor.metaMensual > 0
    ? (volumenVentas / asesor.metaMensual) * 100
    : 0;

   const comisionesGanadas = leadsAsesor.reduce(
  (acc, lead) => {
    if (lead.estado !== "pagado") return acc;

    const rate = getCommissionRate(asesor, lead.tipoCliente);
    return acc + (Number(lead.valor || 0) * rate) / 100;
  },
  0
);

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
    };
  });
}, [asesores, leads, refresh]);

  const resumenGeneral = useMemo(() => {
    const totalAsesores = asesoresConMetricas.length;
    const activos = asesoresConMetricas.filter((a) => a.estado === "activo").length;
    const inactivos = asesoresConMetricas.filter((a) => a.estado === "inactivo").length;
    const vacaciones = asesoresConMetricas.filter((a) => a.estado === "vacaciones").length;

    const totalComisiones = asesoresConMetricas.reduce(
      (acc, asesor) => acc + asesor.comisionesGanadas,
      0
    );

    const totalVentas = asesoresConMetricas.reduce(
      (acc, asesor) => acc + asesor.volumenVentas,
      0
    );

    const totalRegistros = asesoresConMetricas.reduce(
      (acc, asesor) => acc + asesor.totalLeads,
      0
    );

    const topVentas = [...asesoresConMetricas].sort(
      (a, b) => b.volumenVentas - a.volumenVentas
    )[0];

    const topRegistros = [...asesoresConMetricas].sort(
      (a, b) => b.totalLeads - a.totalLeads
    )[0];

    const topComisiones = [...asesoresConMetricas].sort(
      (a, b) => b.comisionesGanadas - a.comisionesGanadas
    )[0];

    return {
      totalAsesores,
      activos,
      inactivos,
      vacaciones,
      totalComisiones,
      totalVentas,
      totalRegistros,
      topVentas,
      topRegistros,
      topComisiones,
    };
  }, [asesoresConMetricas]);

  const rankingVentas = useMemo(
    () => [...asesoresConMetricas].sort((a, b) => b.volumenVentas - a.volumenVentas),
    [asesoresConMetricas]
  );

  const rankingRegistros = useMemo(
    () => [...asesoresConMetricas].sort((a, b) => b.totalLeads - a.totalLeads),
    [asesoresConMetricas]
  );

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const resetForm = () => {
    setForm({
      nombre: "",
      email: "",
      password: "",
      telefono: "",
      salarioBase: "",
      metaMensual: "",
      comisionNuevo: "10",
      comisionActivo: "5",
      comisionReactivado: "7",
      estado: "activo",
      notas: "",
    });
  };

const handleSubmit = async (e) => {
  e.preventDefault();

  const existe = asesores.some(
    (item) => item.email.trim().toLowerCase() === form.email.trim().toLowerCase()
  );
const cedulaExiste = asesores.some(
  (item) => item.cedula?.trim() === form.cedula.trim()
);

if (cedulaExiste) {
  setAlerta({
    visible: true,
    tipo: "warning",
    mensaje: "Ya existe un asesor con esa cédula",
  });
  return;
}


  if (existe) {
    setAlerta({
  visible: true,
  tipo: "warning",
  mensaje: "Ya existe un asesor con ese correo",
});
    return;
  }

  const nuevoAsesorId = generarIdAsesor(form.nombre, asesores);

  const nuevo = {
    nombre: form.nombre.trim(),
    iniciales: obtenerIniciales(form.nombre),
    email: form.email.trim(),
    cedula: form.cedula.replace(/\s+/g, "").trim(),
    telefono: form.telefono.trim(),
    salarioBase: Number(form.salarioBase || 0),
    metaMensual: Number(form.metaMensual || 0),
    comisionNuevo: Number(form.comisionNuevo || 10),
    comisionActivo: Number(form.comisionActivo || 5),
    comisionReactivado: Number(form.comisionReactivado || 7),
    estado: form.estado,
    notas: form.notas.trim(),
    asesorId: nuevoAsesorId, // ID bonito tipo ASE-JM-001
    createdAt: new Date().toISOString(),
  };

  try {
    
    // 🔐 Crear usuario en Firebase Auth

try {
  const passwordTemporal = Math.random().toString(36).slice(-10);

const userCredential = await createUserWithEmailAndPassword(
  auth,
  form.email,
  passwordTemporal
);

  // Guardamos el UID del usuario Auth
  nuevo.authUid = userCredential.user.uid;

} catch (error) {
  console.error("Error creando usuario en Auth:", error);
  setAlerta({
  visible: true,
  tipo: "error",
  mensaje: "Error creando usuario en sistema seguro (Auth)",
});
  return;
}


    const docRef = await addDoc(collection(db, "asesores"), nuevo);

    await updateDoc(doc(db, "asesores", docRef.id), {
      id: docRef.id, // ID real del documento Firebase
      linkAsesor: `${window.location.origin}/registro-asesor/${docRef.id}`,
    });

    // 🔐 Enviar email para que el asesor cree su contraseña

    await sendPasswordResetEmail(auth, form.email);

    resetForm();
    setRefresh((v) => v + 1);
    
setAlerta({
  visible: true,
  tipo: "success",
  mensaje: "Asesor creado correctamente",
});

  } catch (error) {
    console.error("Error creando asesor:", error);
    alert("No se pudo crear el asesor.");
  }
};

const updateEstado = async (id, estado) => {
  try {
    const asesorRef = doc(db, "asesores", id);

    await updateDoc(asesorRef, { estado });

    setRefresh((v) => v + 1);

    if (selectedAsesor?.id === id) {
      setSelectedAsesor((prev) =>
        prev ? { ...prev, estado } : null
      );
    }
  } catch (error) {
    console.error("Error actualizando estado del asesor:", error);
    alert("No se pudo actualizar el estado.");
  }
};




  const selectedMetrics = useMemo(() => {
    if (!selectedAsesor) return null;
    return asesoresConMetricas.find((a) => a.id === selectedAsesor.id) || null;
  }, [selectedAsesor, asesoresConMetricas]);




  return (
    <div className="dashboard-layout">
      <Sidebar onLogout={handleLogout} />

      <main className="dashboard-main">
        <header className="asesores-admin-topbar">
          <div>
            <p className="asesores-admin-kicker">Gestión comercial avanzada</p>
            <h1>Equipo de asesores</h1>
            <span>
              Crea asesores con ID único, controla comisiones, revisa embudo comercial,
              link de registro, ventas pagadas y productividad por asesor.
            </span>
          </div>
        </header>

        <section className="asesores-kpi-grid">
          <div className="asesor-kpi-card">
            <small>Total asesores</small>
            <strong>{resumenGeneral.totalAsesores}</strong>
          </div>

          <div className="asesor-kpi-card">
            <small>Activos</small>
            <strong>{resumenGeneral.activos}</strong>
          </div>

          <div className="asesor-kpi-card">
            <small>Vacaciones</small>
            <strong>{resumenGeneral.vacaciones}</strong>
          </div>

          <div className="asesor-kpi-card">
            <small>Leads totales</small>
            <strong>{resumenGeneral.totalRegistros}</strong>
          </div>

          <div className="asesor-kpi-card">
            <small>Ventas pagadas</small>
            <strong>{formatearPesos(resumenGeneral.totalVentas)}</strong>
          </div>

          <div className="asesor-kpi-card kpi-highlight">
            <small>Comisiones generadas</small>
            <strong>{formatearPesos(resumenGeneral.totalComisiones)}</strong>
          </div>
        </section>

        <section className="asesores-admin-grid">
          <div className="asesor-card-block">
            <div className="asesor-card-head">
              <div>
                <h2>Crear asesor</h2>
                <p>
                  El sistema genera automáticamente un ID único con iniciales del nombre,
                  por ejemplo: ASE-JM-001.
                </p>
              </div>
            </div>

            <form className="asesor-admin-form" onSubmit={handleSubmit}>
              <div className="asesor-field">
                <label>Nombre completo</label>
                <input
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  placeholder="Nombre del asesor"
                  required
                />
              </div>

              <div className="asesor-field">
                <label>Correo</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="asesor@academia.com"
                  required
                />
              </div>
              <div className="asesor-field">
              <label>Cédula</label>
              <input
               name="cedula"
                value={form.cedula}
                onChange={handleChange}
                placeholder="Número de identificación"
                required
             />
            </div>


              <div className="asesor-field">
                <label>Teléfono</label>
                <input
                  name="telefono"
                  value={form.telefono}
                  onChange={handleChange}
                  placeholder="+57 300 000 0000"
                />
              </div>

              <div className="asesor-field">
                <label>Salario base</label>
                <input
                  name="salarioBase"
                  type="number"
                  value={form.salarioBase}
                  onChange={handleChange}
                  placeholder="0"
                  required
                />
              </div>

              <div className="asesor-field">
                <label>Meta mensual</label>
                <input
                  name="metaMensual"
                  type="number"
                  value={form.metaMensual}
                  onChange={handleChange}
                  placeholder="0"
                />
              </div>

              <div className="asesor-field">
                <label>Comisión cliente nuevo (%)</label>
                <input
                  name="comisionNuevo"
                  type="number"
                  value={form.comisionNuevo}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="asesor-field">
                <label>Comisión cliente activo (%)</label>
                <input
                  name="comisionActivo"
                  type="number"
                  value={form.comisionActivo}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="asesor-field">
                <label>Comisión reactivado (%)</label>
                <input
                  name="comisionReactivado"
                  type="number"
                  value={form.comisionReactivado}
                  onChange={handleChange}
                  required
                />
              </div>

              <div className="asesor-field">
                <label>Estado</label>
                <select name="estado" value={form.estado} onChange={handleChange}>
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="vacaciones">Vacaciones</option>
                </select>
              </div>

              <div className="asesor-field asesor-field-full">
                <label>Notas</label>
                <textarea
                  name="notas"
                  value={form.notas}
                  onChange={handleChange}
                  rows="4"
                  placeholder="Observaciones internas del asesor..."
                />
              </div>

              <div className="asesor-field asesor-field-full form-actions">
                <button type="button" className="ghost-btn" onClick={resetForm}>
                  Limpiar
                </button>
                <button type="submit" className="primary-neon-btn">
                  Crear asesor
                </button>
              </div>
            </form>
          </div>


{false && (
          <div className="asesor-card-block">
            <div className="asesor-card-head">
              <div>
                <h2>Ranking comercial</h2>
                <p>Top por ventas pagadas y por total de leads registrados.</p>
              </div>
            </div>

            <div className="ranking-columns">
              <div className="ranking-card">
                <div className="ranking-head">
                  <h3>Top ventas</h3>
                  <span>Pagadas</span>
                </div>

                <div className="ranking-list">
                  {rankingVentas.slice(0, 5).map((asesor, index) => (
                    <div className="ranking-item" key={asesor.id}>
                      <div className="ranking-position">#{index + 1}</div>
                      <div className="ranking-content">
                        <strong>{asesor.nombre}</strong>
                        <span>{asesor.matriculados} matriculados</span>
                      </div>
                      <div className="ranking-value">
                        {formatearPesos(asesor.volumenVentas)}
                      </div>
                    </div>
                  ))}

                  {rankingVentas.length === 0 && (
                    <p className="panel-empty-mini">No hay datos de ventas aún.</p>
                  )}
                </div>
              </div>

              <div className="ranking-card">
                <div className="ranking-head">
                  <h3>Top registros</h3>
                  <span>Embudo</span>
                </div>

                <div className="ranking-list">
                  {rankingRegistros.slice(0, 5).map((asesor, index) => (
                    <div className="ranking-item" key={asesor.id}>
                      <div className="ranking-position alt">#{index + 1}</div>
                      <div className="ranking-content">
                        <strong>{asesor.nombre}</strong>
                        <span>{asesor.conversion}% conversión</span>
                      </div>
                      <div className="ranking-value">{asesor.totalLeads}</div>
                    </div>
                  ))}

                  {rankingRegistros.length === 0 && (
                    <p className="panel-empty-mini">No hay registros aún.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="quick-summary-grid">
              <div className="summary-mini-card">
                <small>Top comisiones</small>
                <strong>{resumenGeneral.topComisiones?.nombre || "—"}</strong>
                <span>
                  {resumenGeneral.topComisiones
                    ? formatearPesos(resumenGeneral.topComisiones.comisionesGanadas)
                    : "Sin datos"}
                </span>
              </div>

              <div className="summary-mini-card">
                <small>Top ventas</small>
                <strong>{resumenGeneral.topVentas?.nombre || "—"}</strong>
                <span>
                  {resumenGeneral.topVentas
                    ? formatearPesos(resumenGeneral.topVentas.volumenVentas)
                    : "Sin datos"}
                </span>
              </div>

              <div className="summary-mini-card">
                <small>Top leads</small>
                <strong>{resumenGeneral.topRegistros?.nombre || "—"}</strong>
                <span>
                  {resumenGeneral.topRegistros
                    ? `${resumenGeneral.topRegistros.totalLeads} leads`
                    : "Sin datos"}
                </span>
              </div>
            </div>
          </div>
          )}
        </section>
    


      </main>
      


                 {alerta.visible && (
        <div className="alerta-overlay">
          <div className="alerta-box">
            <p>{alerta.mensaje}</p>

            <button
              onClick={() =>
                setAlerta({ visible: false, mensaje: "", tipo: "success" })
              }
            >
              Aceptar
            </button>
          </div>
        </div>
      )}

        {confirmacion.visible && (
  <div className="alerta-overlay">
    <div className="alerta-box">
      <p>{confirmacion.mensaje}</p>

      <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
        <button
          onClick={() => {
            confirmacion.onConfirm && confirmacion.onConfirm();
          }}
          style={{
            flex: 1,
            background: "#22c55e",
            border: "none",
            padding: "10px",
            borderRadius: "8px",
            color: "#000",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Confirmar
        </button>

        <button
          onClick={() =>
            setConfirmacion({ visible: false, mensaje: "", onConfirm: null })
          }
          style={{
            flex: 1,
            background: "#222",
            border: "1px solid #555",
            padding: "10px",
            borderRadius: "8px",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  </div>
)}


      {selectedMetrics && (
        <div className="asesor-modal-overlay" onClick={() => setSelectedAsesor(null)}>
          <div className="asesor-modal" onClick={(e) => e.stopPropagation()}>
          
<div className="asesor-modal-head">

  <div className="modal-title-block">
    <p className="asesores-admin-kicker">Ficha completa</p>
    <h3>{selectedMetrics.nombre}</h3>
    <span>{selectedMetrics.email}</span>
  </div>

  {/* 👇 NUEVO BLOQUE ARRIBA DERECHA */}
  <div
    className={`meta-badge ${
      selectedMetrics.progresoMeta < 50
        ? "meta-low"
        : selectedMetrics.progresoMeta < 80
        ? "meta-mid"
        : "meta-high"
    }`}
  >
    <div className="meta-top">
  <small>Meta</small>
  <strong>{selectedMetrics.progresoMeta.toFixed(1)}%</strong>
</div>

    <div className="meta-bar">
      <div
        className="meta-bar-fill"
        style={{
          width: `${Math.min(selectedMetrics.progresoMeta, 100)}%`,
        }}
      />
    </div>
  </div>

  <button className="modal-close-btn" onClick={() => setSelectedAsesor(null)}>
    ✕
  </button>

</div>

            <div className="modal-info-grid">
              <div className="modal-info-card">
                <small>ID asesor</small>
                <strong>{selectedMetrics.asesorId || selectedMetrics.id}</strong>
              </div>



              <div className="modal-info-card">
                <small>Teléfono</small>
                <strong>{selectedMetrics.telefono || "No registrado"}</strong>
              </div>

              <div className="modal-info-card">
                <small>Salario base</small>
                <strong>{formatearPesos(selectedMetrics.salarioBase)}</strong>
              </div>

              <div className="modal-info-card">
                <small>Meta mensual</small>
                <strong>{formatearPesos(selectedMetrics.metaMensual)}</strong>
              </div>

              <div className="modal-info-card">
                <small>Leads</small>
                <strong>{selectedMetrics.totalLeads}</strong>
              </div>

              <div className="modal-info-card">
                <small>Seguimiento</small>
                <strong>{selectedMetrics.seguimiento}</strong>
              </div>

              <div className="modal-info-card">
                <small>Matriculados</small>
                <strong>{selectedMetrics.matriculados}</strong>
              </div>

              <div className="modal-info-card">
                <small>Comisiones</small>
                <strong>{formatearPesos(selectedMetrics.comisionesGanadas)}</strong>
              </div>

          <div className="modal-info-card">
              <small>Correo</small>
              <strong>{selectedMetrics.email}</strong>
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
  onClick={enviarResetPassword}
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

   <button
  className="primary-neon-btn"
  onClick={async () => {
    if (!nuevoEmail || !selectedAsesor?.authUid) {
      setAlerta({
  visible: true,
  tipo: "warning",
  mensaje: "Datos incompletos",
});
      return;
    }

    try {
      await actualizarEmailAsesorFn({
        uid: selectedAsesor.authUid,
        nuevoEmail: nuevoEmail,
        asesorId: selectedAsesor.id,
      });

    setAlerta({
  visible: true,
  tipo: "success",
  mensaje: "Correo actualizado correctamente",
});

      // 🔄 refrescar UI
      setRefresh((v) => v + 1);
      setSelectedAsesor(null);

    } catch (error) {
      console.error(error);
      setAlerta({
  visible: true,
  tipo: "error",
  mensaje: "Error actualizando correo",
});
    }
  }}
>
  Actualizar correo
</button>


            </div>
            
              

            <div className="modal-two-columns">
              <div className="modal-panel">
                <h4>Esquema de comisión</h4>
                <div className="scheme-list">
                  <div>
                    <span>Cliente nuevo</span>
                    <strong>{selectedMetrics.comisionNuevo ?? 10}%</strong>
                  </div>
                  <div>
                    <span>Cliente activo</span>
                    <strong>{selectedMetrics.comisionActivo ?? 5}%</strong>
                  </div>
                  <div>
                    <span>Reactivado</span>
                    <strong>{selectedMetrics.comisionReactivado ?? 7}%</strong>
                  </div>
                </div>

                <h4 className="notes-title">Notas</h4>
                <p className="notes-box">
                  {selectedMetrics.notas || "Sin notas registradas."}
                </p>
              </div>

              <div className="modal-panel">
                <h4>Actividad reciente</h4>

                <div className="mini-leads-list">
                  {selectedMetrics.leadsAsesor.length === 0 ? (
                    <p className="panel-empty-mini">Este asesor aún no registra leads.</p>
                  ) : (
                    selectedMetrics.leadsAsesor.slice(0, 8).map((lead) => (
                      <div className="mini-lead-item" key={lead.id}>
                        <div>
                          <strong>{lead.nombre}</strong>
                          <span>{lead.cursoNombre || lead.programa || "Sin curso"}</span>
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

export default AsesoresAdminSection;