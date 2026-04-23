import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./AsesoresPanelPro.css";
import { getLeads } from "../services/leadsService";
import { addDoc, collection, doc, updateDoc, arrayUnion, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { query, where } from "firebase/firestore";
import { generarIdAlumnoBonito, generarIdCurso } from "../utils/idGenerator";


const LEADS_KEY = "leads";
const ALUMNOS_KEY = "alumnos";
const CURSOS_KEY = "planesCursos";
const SOLICITUDES_KEY = "solicitudesCambios";



const leerJSON = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
};

const guardarJSON = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

const formatearPesos = (valor) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
  }).format(Number(valor || 0));






const normalizarAlumnosGuardados = (data = []) => {
  const normalizados = [];

  data.forEach((alumno, index) => {
    let alumnoId = alumno.alumnoId;

    if (!alumnoId) {
      alumnoId = generarIdUnico("ALU", normalizados, "alumnoId");
    }

    normalizados.push({
      ...alumno,
      id: alumno.id ?? Date.now() + index,
      alumnoId,
      cursoId: alumno.cursoId || alumno.curso || "",
    });
  });

  return normalizados;
};

const obtenerCursosBase = () => {
  const baseCursos = [
    {
      nombre: "Producción musical",
      categoria: "produccion",
      modulos: 12,
      horasPorModulo: 16,
      horasTotales: 192,
      clasesPorModulo: 8,
      modalidades: { regular: 4, intensiva: 8, superintensiva: 16 },
      tipos: {
        personalizado: { precio: 890000, inicio: "1 semana" },
        semi: { precio: 550000, inicio: "1 mes" },
        grupal: { precio: 390000, inicio: "semestre" },
      },
    },
    {
      nombre: "DJ",
      categoria: "dj",
      modulos: 5,
      horasPorModulo: 16,
      horasTotales: 80,
      clasesPorModulo: 8,
      modalidades: { regular: 4, intensiva: 8, superintensiva: 16 },
      tipos: {
        personalizado: { precio: 890000, inicio: "1 semana" },
        semi: { precio: 550000, inicio: "1 mes" },
        grupal: { precio: 390000, inicio: "semestre" },
      },
    },
    {
      nombre: "Piano",
      categoria: "piano",
      modulos: 6,
      horasPorModulo: 16,
      horasTotales: 96,
      clasesPorModulo: 8,
      modalidades: { regular: 4, intensiva: 8, superintensiva: 16 },
      tipos: {
        personalizado: { precio: 690000, inicio: "1 semana" },
        semi: { precio: 490000, inicio: "1 mes" },
        grupal: { precio: 350000, inicio: "semestre" },
      },
    },
    {
      nombre: "Guitarra",
      categoria: "guitarra",
      modulos: 6,
      horasPorModulo: 16,
      horasTotales: 96,
      clasesPorModulo: 8,
      modalidades: { regular: 4, intensiva: 8, superintensiva: 16 },
      tipos: {
        personalizado: { precio: 690000, inicio: "1 semana" },
        semi: { precio: 490000, inicio: "1 mes" },
        grupal: { precio: 350000, inicio: "semestre" },
      },
    },
    {
      nombre: "Técnica vocal",
      categoria: "canto",
      modulos: 3,
      horasPorModulo: 16,
      horasTotales: 48,
      clasesPorModulo: 8,
      modalidades: { regular: 4, intensiva: 8, superintensiva: 16 },
      tipos: {
        personalizado: { precio: 690000, inicio: "1 semana" },
        semi: { precio: 490000, inicio: "1 mes" },
        grupal: { precio: 350000, inicio: "semestre" },
      },
    },
  ];

  const cursosConId = [];
  baseCursos.forEach((cursoItem) => {
    cursosConId.push({
      ...cursoItem,
      id: generarIdCurso(cursoItem.nombre, cursosConId),
    });
  });

  return cursosConId;
};

const obtenerCursos = () => {
  const data = localStorage.getItem(CURSOS_KEY);

  if (data) {
    try {
      const cursosGuardados = JSON.parse(data);
      const normalizados = [];
      cursosGuardados.forEach((cursoItem) => {
        if (!cursoItem.id || !cursoItem.id.startsWith("CUR-")) {
          normalizados.push({
            ...cursoItem,
            id: generarIdCurso(cursoItem.nombre, normalizados),
          });
        } else {
          normalizados.push(cursoItem);
        }
      });

      return normalizados;

    } catch {
      const base = obtenerCursosBase();
      guardarJSON(CURSOS_KEY, base);
      return base;
    }
  }

  const base = obtenerCursosBase();
  guardarJSON(CURSOS_KEY, base);
  return base;
};

const obtenerTasaComision = (tipoCliente) => {
  if (tipoCliente === "nuevo") return 10;
  if (tipoCliente === "activo") return 5;
  if (tipoCliente === "reactivado") return 7;
  return 0;
};

const estadoLabels = {
  lead: "Lead",
  seguimiento: "Seguimiento",
  visita_programada: "Visita programada",
  inscrito: "Inscrito",
  activo: "Activo",
  curso_pausado: "Curso pausado",
  falta_pago: "Falta de pago",
  pagado: "Pagado",
};

function AsesoresPanel() {
  const navigate = useNavigate();
 

  const [alerta, setAlerta] = useState({
  visible: false,
  mensaje: "",
});
useEffect(() => {
  if (alerta.visible) {
    const timer = setTimeout(() => {
      setAlerta({ visible: false, mensaje: "" });
    }, 2500);

    return () => clearTimeout(timer);
  }
}, [alerta]);



const auth = JSON.parse(localStorage.getItem("asesorAuth") || "null");

if (!auth) {
  return (
    <div style={{ padding: "40px", color: "white" }}>
      No hay sesión activa — redirigiendo...
    </div>
  );
}

  const [refresh, setRefresh] = useState(0);
  const [vista, setVista] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState("todos");
  const [leadActivo, setLeadActivo] = useState(null);
  const [notaTexto, setNotaTexto] = useState("");
  const [descuentoModal, setDescuentoModal] = useState("");
const [aplicarDescuentoAutorizado, setAplicarDescuentoAutorizado] = useState(false);
const [duracionModal, setDuracionModal] = useState("");
const [cursoModal, setCursoModal] = useState("");
const [tipoModal, setTipoModal] = useState("");
const [motivoEdicion, setMotivoEdicion] = useState("");

const [cursos, setCursos] = useState([]);  
const cursoModalSeleccionado = cursos.find(
  (c) => c.id === cursoModal
);

const precioBaseModal =
  cursoModalSeleccionado?.tipos?.[tipoModal]?.precio || 0;

const descuentoNumero = aplicarDescuentoAutorizado
  ? Number(descuentoModal) || 0
  : 0;

const precioFinalModal = Math.round(
  precioBaseModal * (1 - descuentoNumero / 100)
);
useEffect(() => {
  if (!leadActivo) return;

  setLeadActivo((prev) => ({
    ...prev,
    cursoId: cursoModal,
    cursoNombre: obtenerNombreCurso(cursoModal),
    tipoPrograma: tipoModal,
    valorBase: precioBaseModal,
    descuento: descuentoNumero,
    valor: precioFinalModal,
    duracion: duracionModal,
  }));
}, [
 
  cursoModal,
  tipoModal,
  duracionModal,
  precioBaseModal,
  descuentoNumero,
  precioFinalModal,
]);

const [form, setForm] = useState({
  nombre: "",
  telefono: "",
  email: "",
  tipoDocumento: "",
  numeroDocumento: "",
  cursoId: "",
  duracion: "",
  modalidad: "",
  tipoPrograma: "",
  tipoCliente: "nuevo",
  estado: "lead",
  valor: "",
   valorEditadoManual: false,
  agendarVisita: false,
  fechaVisita: "",
  claseGratis: false,
  notas: "",
  descuento: "",
descuentoAutorizado: false,
esMayorEdad: "",
edad: "",
nombreAcudiente: "",
telefonoAcudiente: "",
aceptaTerminos: false,
});

  useEffect(() => {
    if (!auth) navigate("/asesores/login");
  }, [auth, navigate]);

useEffect(() => {
  const fetchCursos = async () => {
    try {
      const snapshot = await getDocs(collection(db, "cursos"));

     let data = snapshot.docs.map(doc => ({
  ...doc.data(),
  id: doc.id,
}));

// 🔥 eliminar duplicados por nombre
const cursosUnicos = data.filter(
  (curso, index, self) =>
    index === self.findIndex((c) => c.nombre === curso.nombre)
);

setCursos(cursosUnicos);

    } catch (error) {
      setCursos(obtenerCursosBase());
    }
  };

  fetchCursos();
}, []);

  useEffect(() => {
  setLeadActivo(null);
}, [vista]);
  const [leads, setLeads] = useState([]);

useEffect(() => {
const fetchLeads = async () => {
  try {
    const data = await getLeads();
   

    setLeads(Array.isArray(data) ? data : []);
  } catch (error) {
  
    setLeads([]);
  }
};

  fetchLeads();
},[refresh]);



const misLeads = useMemo(() => {
  return leads.filter((l) => l.asesorId === auth?.id);
}, [leads, auth, refresh]);

  const cursoSeleccionado = useMemo(() => {
    return cursos.find((c) => c.id === form.cursoId) || null;
  }, [form.cursoId, cursos]);

  const precioBaseCurso = cursoSeleccionado?.tipos?.[form.tipoPrograma]?.precio || 0;
  const inicioCurso = cursoSeleccionado?.tipos?.[form.tipoPrograma]?.inicio || "";

const descuentoAplicado = form.descuentoAutorizado
  ? Math.min(Math.max(Number(form.descuento) || 0, 0), 100)
  : 0;
  const valorCalculado = precioBaseCurso
  ? Math.round(precioBaseCurso * (1 - descuentoAplicado / 100))
  : 0;

  useEffect(() => {
    if (!form.cursoId || !form.tipoPrograma) {
      if (!form.valorEditadoManual) {
        setForm((prev) => ({ ...prev, valor: "" }));
      }
      return;
    }

    if (!form.valorEditadoManual) {
      setForm((prev) => ({
        ...prev,
        valor: String(valorCalculado),
      }));
    }
  }, [
    form.cursoId,
    form.tipoPrograma,
    form.descuento,
    valorCalculado,
    form.valorEditadoManual,
  ]);

  const leadsFiltrados = useMemo(() => {
    return misLeads.filter((lead) => {
      const cumpleEstado =
        estadoFiltro === "todos" ? true : lead.estado === estadoFiltro;

      const q = search.trim().toLowerCase();
      const cumpleTexto = !q
        ? true
        : [
            lead.nombre,
            lead.telefono,
            lead.email,
            lead.cursoNombre,
            lead.alumnoId,
          ]
            .join(" ")
            .toLowerCase()
            .includes(q);

      return cumpleEstado && cumpleTexto;
    });
  }, [misLeads, estadoFiltro, search]);

  const resumen = useMemo(() => {
    const total = misLeads.length;
    const seguimiento = misLeads.filter((l) => l.estado === "seguimiento").length;
    const visitas = misLeads.filter((l) => l.estado === "visita_programada").length;
    const inscritos = misLeads.filter(
      (l) => l.estado === "inscrito" || l.estado === "pagado"
    ).length;
    const activos = misLeads.filter((l) => l.estado === "activo").length;
    const pausados = misLeads.filter((l) => l.estado === "curso_pausado").length;
    const faltaPago = misLeads.filter((l) => l.estado === "falta_pago").length;
    const pagados = misLeads.filter((l) => l.estado === "pagado").length;

    const totalVentas = misLeads
      .filter((l) => l.estado === "pagado")
      .reduce((acc, l) => acc + Number(l.valor || 0), 0);

    const totalComision = misLeads.reduce((acc, l) => {
      if (l.estado !== "pagado") return acc;
      const tasa = obtenerTasaComision(l.tipoCliente);
      return acc + (Number(l.valor || 0) * tasa) / 100;
    }, 0);

    return {
      total,
      seguimiento,
      visitas,
      inscritos,
      activos,
      pausados,
      faltaPago,
      pagados,
      totalVentas,
      totalComision,
    };
  }, [misLeads]);

const linkAsesor = `${window.location.origin}/registro-asesor/${auth?.asesorId || auth?.id}`;
  const copiarLink = async () => {
  try {
    await navigator.clipboard.writeText(linkAsesor);
    setAlerta({
      visible: true,
      mensaje: "Link del asesor copiado correctamente",
    });
  } catch {
    setAlerta({
      visible: true,
      mensaje: "No se pudo copiar el link",
    });
  }
};

  const resetForm = () => {
  setForm({
    nombre: "",
    telefono: "",
    email: "",
    tipoDocumento: "",
    numeroDocumento: "",
    cursoId: "",
    duracion: "",
    modalidad: "",
    tipoPrograma: "",
    tipoCliente: "nuevo",
    estado: "lead",
    valor: "",
    descuento: "",
    descuentoAutorizado: false, // 👈 AQUÍ
    valorEditadoManual: false,
    agendarVisita: false,
    fechaVisita: "",
    claseGratis: false,
    notas: "",
  });
};

  const obtenerNombreCurso = (cursoId) => {
    return cursos.find((c) => c.id === cursoId)?.nombre || cursoId || "-";
  };



const handleSubmit = async (e) => {
  e.preventDefault();

  if (!form.nombre || !form.telefono || !form.cursoId || !form.tipoPrograma || !form.duracion) {
    alert("Completa nombre, teléfono, curso, tipo y duración.");
    return;
  }
  if (Number(form.descuento) > 0 && !form.descuentoAutorizado) {
  setAlerta({
    visible: true,
    mensaje: "Debes marcar 'Descuento autorizado' para aplicar descuento",
  });
  return;
}
const leadsRef = collection(db, "leads");
const documentoLimpio = form.numeroDocumento
  .replace(/\D/g, "") // elimina todo lo que no sea número
  .trim();
const qMismoCurso = query(
  leadsRef,
  where("numeroDocumento", "==", documentoLimpio),
  where("cursoId", "==", form.cursoId)
);
const snapshotDuplicado = await getDocs(qMismoCurso);

if (!snapshotDuplicado.empty) {
  setAlerta({
    visible: true,
    mensaje: "Este usuario ya está registrado en este curso",
  });
  return;
}
const telefonoLimpio = form.telefono
  .replace(/\D/g, "")
  .trim();

const qTelefono = query(
  leadsRef,
  where("telefono", "==", telefonoLimpio),
  where("cursoId", "==", form.cursoId)
);

const snapshotTelefono = await getDocs(qTelefono);

if (!snapshotTelefono.empty) {
  setAlerta({
    visible: true,
    mensaje: "Este número ya está registrado en este curso",
  });
  return;
}
const emailLimpio = form.email.trim().toLowerCase();

if (emailLimpio) {
  const qEmail = query(
    leadsRef,
    where("email", "==", emailLimpio),
    where("cursoId", "==", form.cursoId)
  );

  const snapshotEmail = await getDocs(qEmail);

  if (!snapshotEmail.empty) {
    setAlerta({
      visible: true,
      mensaje: "Este correo ya está registrado en este curso",
    });
    return;
  }
}


  const valorFinal = Number(form.valor || 0);

  const payload = {
    
    asesorId: auth.id,
    asesorNombre: auth.nombre,
    asesorLink: linkAsesor,
    nombre: form.nombre.trim(),
    telefono: telefonoLimpio,
    email: emailLimpio,
    tipoDocumento: form.tipoDocumento,
    numeroDocumento: documentoLimpio,
      // 🔥 DATOS MENOR DE EDAD
  edad: form.edad || "",
  nombreAcudiente: form.nombreAcudiente || "",
  telefonoAcudiente: form.telefonoAcudiente || "",
    cursoId: form.cursoId,
    cursoNombre: obtenerNombreCurso(form.cursoId),
    duracion: form.duracion,
    modalidad: form.modalidad,
    tipoPrograma: form.tipoPrograma,
    tipoCliente: form.tipoCliente,
    estado: form.estado,
    valor: valorFinal,
    valorBase: Number(precioBaseCurso || 0),
    descuento: form.descuentoAutorizado
  ? Number(form.descuento || 0)
  : 0,
    valorEditadoManual: Boolean(form.valorEditadoManual),
    claseGratis: Boolean(form.claseGratis),
    visitaProgramada: Boolean(form.agendarVisita),
    fechaVisita: form.fechaVisita || "",
    notas: form.notas
      ? [
          {
          
            texto: form.notas.trim(),
            fecha: new Date().toISOString(),
            autor: auth.nombre,
          },
        ]
      : [],
    alumnoId: null,
    bloqueado: form.estado === "pagado",
    requiereAprobacion: false,
    aprobadoPorAdmin: false,
    createdAt: new Date().toISOString(),
  };

  if (payload.estado === "pagado") {
   payload.alumnoId = await crearAlumnoDesdeLead(payload);
  }

  try {
    await addDoc(collection(db, "leads"), payload);

    resetForm();
    
    setRefresh((v) => v + 1);

    alert("Lead guardado en Firebase ✅");
  } catch (error) {
  if (import.meta.env.DEV) {
    console.error("ERROR LEADS:", error);
  }
  setLeads([]);
}
};



const crearAlumnoDesdeLead = async (lead) => {
  try {
    const alumnoIdBonito = await generarIdAlumnoBonito(lead.nombre);

    const cursoIdBonito = lead.cursoId;

    const nuevoAlumno = {
      alumnoId: alumnoIdBonito,
      nombre: lead.nombre,
      telefono: lead.telefono || "",
      tipoDocumento: lead.tipoDocumento || "",
      numeroDocumento: lead.numeroDocumento || "",

      edad: lead.edad || "",
      nombreAcudiente: lead.nombreAcudiente || "",
      telefonoAcudiente: lead.telefonoAcudiente || "",

      cursoId: cursoIdBonito, // 🔥 YA CORRECTO
      cursoNombre: lead.cursoNombre,

      valor: Number(lead.valor || 0),
      valorBase: Number(lead.valorBase || 0),
      descuento: Number(lead.descuento || 0),

      modalidad: lead.modalidad || "",
      tipoPrograma: lead.tipoPrograma || "",
      duracion: lead.duracion || "",

      estado: "activo",

      asesorId: lead.asesorId,
      asesorNombre: lead.asesorNombre,
      leadId: lead.id,

      createdAt: new Date().toISOString(),
    };
// 🔥 GUARDAR TAMBIÉN EN SESIÓN ALUMNOS (localStorage)

   const docRef = await addDoc(collection(db, "alumnos"), nuevoAlumno);

// 🔥 guardar también el id de firebase dentro del documento
await updateDoc(docRef, {
  id: docRef.id
});

return alumnoIdBonito;

  } catch (error) {
    console.error("Error creando alumno:", error);
    return null;
  }
};


const guardarCambiosLead = async () => {
  if (!leadActivo) return;

  // 🔒 VALIDACIÓN
  if (!leadActivo?.duracion) {
    setAlerta({
      visible: true,
      mensaje: "Debe seleccionar la duración del curso",
    });
    return;
  }

  try {
    const leadRef = doc(db, "leads", leadActivo.id);

    await updateDoc(leadRef, {
      cursoId: leadActivo.cursoId,
      tipoPrograma: leadActivo.tipoPrograma,
      duracion: leadActivo.duracion,
      descuento: leadActivo.descuento,
      valor: leadActivo.valor,
      valorBase: leadActivo.valorBase,
      estado: leadActivo.estado || "lead",
    });

    setAlerta({
      visible: true,
      mensaje: "Cambios guardados correctamente",
    });

    setRefresh((v) => v + 1);

  } catch (error) {
    console.error(error);

    setAlerta({
      visible: true,
      mensaje: "Error guardando cambios",
    });
  }
};

const agregarNotaLead = async (leadId) => {
  if (!notaTexto.trim()) return;

  try {
    const leadRef = doc(db, "leads", leadId);

    await updateDoc(leadRef, {
      notas: arrayUnion({
        id: crypto.randomUUID(),
        texto: notaTexto.trim(),
        fecha: new Date().toISOString(),
        autor: auth?.nombre || "Asesor",
      }),
    });

    setNotaTexto("");
    setRefresh((v) => v + 1);
  } catch (error) {
    console.error(error);
    alert("Error guardando nota");
  }
};

const actualizarEstadoLead = async (id, nuevoEstado, lead) => {
  try {

    // 🔒 VALIDACIÓN
    if (
      nuevoEstado === "pagado" &&
      (!lead?.duracion || Number(lead.duracion) <= 0)
    ) {
      setAlerta({
        visible: true,
        mensaje: "Debe seleccionar la duración antes de marcar como pagado",
      });
      return;
    }

    const leadRef = doc(db, "leads", id);

    let alumnoId = lead.alumnoId || null;

    // 🔥 CREAR ALUMNO AUTOMÁTICO
   if (nuevoEstado === "pagado" && !lead.alumnoId) {

  const leadActualizado = {
    ...lead,
    duracion: leadActivo?.duracion || lead.duracion,
    cursoId: leadActivo?.cursoId || lead.cursoId,
    tipoPrograma: leadActivo?.tipoPrograma || lead.tipoPrograma,
    valor: leadActivo?.valor || lead.valor,
    valorBase: leadActivo?.valorBase || lead.valorBase,
    descuento: leadActivo?.descuento || lead.descuento,
    numeroDocumento: leadActivo?.numeroDocumento || lead.numeroDocumento,
  tipoDocumento: leadActivo?.tipoDocumento || lead.tipoDocumento,
  edad: leadActivo?.edad || lead.edad || "",
nombreAcudiente: leadActivo?.nombreAcudiente || lead.nombreAcudiente || "",
telefonoAcudiente: leadActivo?.telefonoAcudiente || lead.telefonoAcudiente || "",
  };

  alumnoId = await crearAlumnoDesdeLead(leadActualizado);
}

    await updateDoc(leadRef, {
      estado: nuevoEstado,
      bloqueado: nuevoEstado === "pagado",
      alumnoId: alumnoId, // 🔥 IMPORTANTE
    });

    setLeads((prev) =>
      prev.map((l) =>
        l.id === id
          ? {
              ...l,
              estado: nuevoEstado,
              bloqueado: nuevoEstado === "pagado",
              alumnoId,
            }
          : l
      )
    );

  } catch (error) {
    console.error("Error actualizando estado:", error);
  }
};

const solicitarAutorizacionCambio = (lead, cambios) => {
  const solicitudes = leerJSON(SOLICITUDES_KEY);

  const motivoPartes = [];

  if (String(lead.cursoId || "") !== String(cambios.cursoId || "")) {
    motivoPartes.push(
      `Cambio de curso: ${lead.cursoNombre || "-"} → ${cambios.cursoNombre || "-"}`
    );
  }

  if (String(lead.tipoPrograma || "") !== String(cambios.tipoPrograma || "")) {
    motivoPartes.push(
      `Cambio de tipo: ${lead.tipoPrograma || "-"} → ${cambios.tipoPrograma || "-"}`
    );
  }

  if (String(lead.duracion || "") !== String(cambios.duracion || "")) {
    motivoPartes.push(
      `Cambio de duración: ${lead.duracion || "-"} → ${cambios.duracion || "-"} meses`
    );
  }

  if (Number(lead.descuento || 0) !== Number(cambios.descuento || 0)) {
    motivoPartes.push(
      `Cambio de descuento: ${Number(lead.descuento || 0)}% → ${Number(cambios.descuento || 0)}%`
    );
  }

  if (Number(lead.valor || 0) !== Number(cambios.valor || 0)) {
    motivoPartes.push(
      `Cambio de valor: ${Number(lead.valor || 0)} → ${Number(cambios.valor || 0)}`
    );
  }

  const motivoFinal =
    cambios.motivoManual ||
    (motivoPartes.length > 0
      ? motivoPartes.join(" | ")
      : "Solicitud de ajuste manual sobre alumno pagado.");

  const existenteIndex = solicitudes.findIndex(
    (s) => String(s.leadId) === String(lead.id)
  );

  if (existenteIndex !== -1) {
    const actualizadas = [...solicitudes];

    actualizadas[existenteIndex] = {
      ...actualizadas[existenteIndex],
      alumnoId: lead.alumnoId || "",
      alumnoNombre: lead.nombre || "",
      asesorId: auth?.id || "",
      asesorNombre: auth?.nombre || "Asesor",
      estado: "pendiente",
      motivo: motivoFinal,
      cambios,
      createdAt: new Date().toISOString(),
    };

    guardarJSON(SOLICITUDES_KEY, actualizadas);
    return;
  }

  const nuevaSolicitud = {
    id: Date.now().toString(),
    leadId: lead.id,
    alumnoId: lead.alumnoId || "",
    alumnoNombre: lead.nombre || "",
    asesorId: auth?.id || "",
    asesorNombre: auth?.nombre || "Asesor",
    estado: "pendiente",
    motivo: motivoFinal,
    cambios,
    createdAt: new Date().toISOString(),
  };

  guardarJSON(SOLICITUDES_KEY, [nuevaSolicitud, ...solicitudes]);
};


const cargarFormularioModal = (lead) => {
  if (!lead) return;

  setLeadActivo(lead);
  setCursoModal(lead.cursoId || "");
  setTipoModal(lead.tipoPrograma || "");
  setDuracionModal(String(lead.duracion || ""));
  setDescuentoModal(String(lead.descuento || 0));
  setAplicarDescuentoAutorizado(false);
};

const aplicarDescuentoLead = async () => {
  if (!leadActivo) return;


  // ✅ VALIDACIÓN AQUÍ
  if (Number(descuentoModal) > 0 && !aplicarDescuentoAutorizado) {
    setAlerta({
      visible: true,
      mensaje: "Debes autorizar el descuento",
    });
    return;
  }

  const descuentoNum = Math.min(Math.max(Number(descuentoModal) || 0, 0), 100);

  try {

    console.log("leadActivo completo:", leadActivo);
console.log("ID usado para update:", leadActivo?.id);

    const leadRef = doc(db, "leads", leadActivo.id);

    await updateDoc(leadRef, {
      cursoId: cursoModal,
      cursoNombre: obtenerNombreCurso(cursoModal),
      tipoPrograma: tipoModal,
      valorBase: precioBaseModal,
      descuento: descuentoNum,
      valor: precioFinalModal,
      duracion: duracionModal,
      aprobadoPorAdmin: false,
      bloqueado: leadActivo.estado === "pagado",
    });

   setLeadActivo({
  ...leadActivo,
  cursoId: cursoModal,
  cursoNombre: obtenerNombreCurso(cursoModal),
  tipoPrograma: tipoModal,
  valorBase: precioBaseModal,
  descuento: descuentoNum,
  valor: precioFinalModal,
  duracion: duracionModal,
});
    setRefresh((v) => v + 1);

 setAlerta({
  visible: true,
  mensaje: "Datos actualizados correctamente",
});
  } catch (error) {
    console.error(error);
   setAlerta({
  visible: true,
  mensaje: "Error actualizando datos",
});
  }
};

const guardarCambiosBasicos = async () => {
  try {
    const leadRef = doc(db, "leads", leadActivo.id);

    await updateDoc(leadRef, {
      cursoId: leadActivo.cursoId,
      tipoPrograma: leadActivo.tipoPrograma,
      duracion: leadActivo.duracion,
      descuento: leadActivo.descuento,
      valor: leadActivo.valor,
      valorBase: leadActivo.valorBase,
    });

    setAlerta({
      visible: true,
      mensaje: "Cambios guardados",
    });

  } catch (error) {
    console.error(error);
  }
};

  const logout = () => {
  localStorage.removeItem("asesorAuth");
  navigate("/asesores/login");
};

const estaBloqueado = leadActivo?.bloqueado === true;
const puedeEditar = !leadActivo?.bloqueado || leadActivo?.aprobadoPorAdmin;

return (
  <>
    <div className="asesor-pro-page">
      <header className="asesor-pro-hero">
        <div>
          <span className="hero-kicker">Caribbean Studio Academy</span>
          <h1>Panel comercial PRO</h1>
          <p>
            Bienvenido, <strong>{auth?.nombre}</strong>. Gestiona leads, registra alumnos,
            aplica descuentos, programa visitas, envía tu link personalizado y controla
            tus comisiones 2026.
          </p>

          <div className="hero-commission-box">
            <div>
              <small>Cliente nuevo</small>
              <strong>10%</strong>
            </div>
            <div>
              <small>Cliente activo</small>
              <strong>5%</strong>
            </div>
            <div>
              <small>Reactivado</small>
              <strong>7%</strong>
            </div>
          </div>
        </div>

        <div className="hero-side">
          <div className="advisor-card">
            <span className="advisor-avatar">
              {(auth?.nombre || "A")
                .split(" ")
                .slice(0, 2)
                .map((x) => x[0])
                .join("")
                .toUpperCase()}
            </span>
            <div>
              <strong>{auth?.nombre}</strong>
            <p>ID asesor: {auth?.asesorId || auth?.id}</p>      
            </div>
          </div>

          <div className="hero-actions">
            <button className="ghost-btn-pro" onClick={copiarLink}>
              Copiar link personalizado
            </button>
            <button className="danger-btn-pro" onClick={logout}>
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>


      <div className="tabs-pro">
  <button
    className={vista === "dashboard" ? "tab active" : "tab"}
    onClick={() => setVista("dashboard")}
  >
    Dashboard
  </button>

  <button
    className={vista === "leads" ? "tab active" : "tab"}
    onClick={() => setVista("leads")}
  >
    Leads
  </button>
</div>


      
{vista === "dashboard" && (
  <>



      <section className="kpi-grid">
        <div className="kpi-card">
          <small>Total leads</small>
          <strong>{resumen.total}</strong>
        </div>
        <div className="kpi-card">
          <small>Seguimiento</small>
          <strong>{resumen.seguimiento}</strong>
        </div>
        <div className="kpi-card">
          <small>Visitas</small>
          <strong>{resumen.visitas}</strong>
        </div>
        <div className="kpi-card">
          <small>Inscritos</small>
          <strong>{resumen.inscritos}</strong>
        </div>
        <div className="kpi-card">
          <small>Pagados</small>
          <strong>{resumen.pagados}</strong>
        </div>
        <div className="kpi-card highlight">
          <small>Comisión ganada</small>
          <strong>{formatearPesos(resumen.totalComision)}</strong>
        </div>
      </section>

      <section className="kpi-grid secondary">
        <div className="mini-stat-card">
          <small>Activos</small>
          <strong>{resumen.activos}</strong>
        </div>
        <div className="mini-stat-card">
          <small>Curso pausado</small>
          <strong>{resumen.pausados}</strong>
        </div>
        <div className="mini-stat-card">
          <small>Falta de pago</small>
          <strong>{resumen.faltaPago}</strong>
        </div>
        <div className="mini-stat-card">
          <small>Ventas cerradas</small>
          <strong>{formatearPesos(resumen.totalVentas)}</strong>
        </div>
      </section>

      <section className="panel-grid-pro">
        <div className="panel-card-pro">
          <div className="panel-head-pro">
            <div>
              <h2>Registrar lead / alumno</h2>
              <p>
                Usa la misma lógica de cursos, duración y descuento que ya utiliza la sesión
                de alumnos. Si marcas pagado, se crea automáticamente en alumnos.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="lead-form-pro">
            <div className="field-group">
              <label>Nombre del alumno</label>
              <input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Nombre completo"
                required
              />
            </div>

            <div className="field-group">
              <label>Teléfono</label>
              <input
                value={form.telefono}
                onChange={(e) => setForm({ ...form, telefono: e.target.value })}
                placeholder="300 000 0000"
                required
              />
            </div>

            <div className="field-group">
              <label>Email</label>
              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="correo@cliente.com"
              />
            </div>
           

            <div className="field-group">
              <label>Tipo de cliente</label>
              <select
                value={form.tipoCliente}
                onChange={(e) => setForm({ ...form, tipoCliente: e.target.value })}
              >
                <option value="nuevo">Cliente nuevo — 10%</option>
                <option value="activo">Cliente activo — 5%</option>
                <option value="reactivado">Reactivado — 7%</option>
              </select>
            </div>

            <div className="field-group">
              <label>Tipo documento</label>
              <select
  value={form.tipoDocumento}
  onChange={(e) =>
    setForm({ ...form, tipoDocumento: e.target.value })
  }
>
           <option value="cc">Cédula</option>
          <option value="ti">Tarjeta de identidad</option>
          <option value="nit">NIT</option>
          <option value="pasaporte">Pasaporte</option>
              </select>
            </div>

            <div className="field-group">
              <label>Número documento</label>
              <input
                value={form.numeroDocumento}
                onChange={(e) => setForm({ ...form, numeroDocumento: e.target.value })}
                placeholder="Documento"
              />
              
            </div>




            <div className="field-group">
              <label>Curso</label>
              <select
                value={form.cursoId}
                onChange={(e) => setForm({ ...form, cursoId: e.target.value })}
              >
                <option value="">Seleccionar curso</option>
                {cursos.map((curso) => (
                  <option key={curso.id} value={curso.id}>
                    {curso.nombre}
                  </option>
                ))}
              </select>
            </div>

<div className="field-group">
  <label>Duración</label>
  <select
  value={form.duracion}
onChange={(e) =>
  setForm({ ...form, duracion: e.target.value })
}
  >
    <option value="">Seleccionar duración</option>
    {[...Array(12)].map((_, i) => (
      <option key={i} value={i + 1}>
        {i + 1} mes{i + 1 > 1 ? "es" : ""}
      </option>
    ))}
  </select>
</div>
{form.claseGratis !== true && (
  <div className="field-group">
    <label>Modalidad</label>
    <select
      value={form.modalidad}
      onChange={(e) => setForm({ ...form, modalidad: e.target.value })}
    >
      <option value="">Seleccionar</option>
      <option value="presencial">Presencial</option>
      <option value="virtual">Virtual</option>
    </select>
  </div>
)}

            <div className="field-group">
              <label>Tipo de clase</label>
              <select
                value={form.tipoPrograma}
                onChange={(e) =>
                  setForm({
                    ...form,
                    tipoPrograma: e.target.value,
                    valorEditadoManual: false,
                  })
                }
              >
                <option value="">Seleccionar</option>
                <option value="personalizado">Personalizado</option>
                <option value="semi">Semi-personalizado</option>
                <option value="grupal">Grupal</option>
              </select>
            </div>

            <div className="field-group">
              <label>Estado lead</label>
              <select
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value })}
              >
                <option value="lead">Lead</option>
                <option value="seguimiento">Seguimiento</option>
                <option value="visita_programada">Visita programada</option>
                <option value="inscrito">Inscrito</option>
                <option value="activo">Activo</option>
                <option value="curso_pausado">Curso pausado</option>
                <option value="falta_pago">Falta de pago</option>
              </select>
            </div>

            <div className="field-group">
              <label>Precio base</label>
              <input value={precioBaseCurso || ""} readOnly placeholder="Automático" />
            </div>

            <div className="field-group">
              <label>Descuento (%)</label>
              <input
                type="number"
                value={form.descuento}
                onChange={(e) =>
                  setForm({
                    ...form,
                    descuento: e.target.value,
                    valorEditadoManual: false,
                  })
                }
                placeholder="0"
              />
            </div>
            <label className="checkbox-row">
  <input
  
  type="checkbox"
  checked={form.descuentoAutorizado}
  onChange={(e) =>
    setForm({
      ...form,
      descuentoAutorizado: e.target.checked,
    })
  }
/>
  Descuento autorizado
</label>

            <div className="field-group">
              <label>Valor final</label>
              <input
                type="number"
                value={form.valor}
                onChange={(e) =>
                  setForm({
                    ...form,
                    valor: e.target.value,
                    valorEditadoManual: true,
                  })
                }
                placeholder="Automático"
              />
            </div>

            <div className="field-group field-group-full">
              <div className="course-meta-bar">
                <span>
                  ID curso: <strong>{cursoSeleccionado?.id || "-"}</strong>
                </span>
                <span>
                  Inicio estimado: <strong>{inicioCurso || "-"}</strong>
                </span>
                <span>
                  Precio real: <strong>{formatearPesos(precioBaseCurso)}</strong>
                </span>
                <span>
                  Precio final: <strong>{formatearPesos(form.valor || 0)}</strong>
                </span>
              </div>
            </div>


            <div className="field-group field-group-half checkbox-wrap">
              <label className="checkbox-row">
                <input
                  onChange={(e) =>
  setForm((prev) => ({
    ...prev,
    claseGratis: e.target.checked,
    modalidad: e.target.checked ? "" : prev.modalidad,
  }))
}
                />
                Asignar clase gratis
              </label>
            </div>

            <div className="field-group field-group-full">
              <label>Notas / seguimiento</label>
              <textarea
                rows="4"
                value={form.notas}
                onChange={(e) => setForm({ ...form, notas: e.target.value })}
                placeholder="Escribe observaciones, objeciones, interés, seguimiento, etc."
              />
            </div>

            <div className="field-group field-group-full action-row">
              <button type="button" className="ghost-btn-pro" onClick={resetForm}>
                Limpiar
              </button>
              <button type="submit" className="primary-btn-pro">
                Guardar lead
              </button>
            </div>
          </form>
        </div>

        <div className="panel-card-pro right-summary">
          <div className="panel-head-pro">
            <div>
              <h2>Embudo comercial</h2>
              <p>Seguimiento completo de tus leads y alumnos.</p>
            </div>
          </div>

          <div className="status-stack">
            <div className="status-row lead"><span>Lead</span><strong>{misLeads.filter(l => l.estado === "lead").length}</strong></div>
            <div className="status-row seguimiento"><span>Seguimiento</span><strong>{resumen.seguimiento}</strong></div>
            <div className="status-row visita"><span>Visita programada</span><strong>{resumen.visitas}</strong></div>
            <div className="status-row inscrito"><span>Inscrito</span><strong>{resumen.inscritos}</strong></div>
            <div className="status-row activo"><span>Activo</span><strong>{resumen.activos}</strong></div>
            <div className="status-row pausado"><span>Curso pausado</span><strong>{resumen.pausados}</strong></div>
            <div className="status-row falta-pago"><span>Falta de pago</span><strong>{resumen.faltaPago}</strong></div>
            <div className="status-row pagado"><span>Pagado</span><strong>{resumen.pagados}</strong></div>
          </div>

          <div className="advisor-note-card">
            <small>Política de comisiones 2026</small>
            <p>
              El panel calcula automáticamente 10% cliente nuevo, 5% cliente activo
              y 7% cliente reactivado sobre el valor final pagado.
            </p>
          </div>
        </div>
      </section>

  </>
)}


{vista === "leads" && (
      <section className="panel-card-pro table-panel">
        <div className="panel-head-pro">
          <div>
            <h2>Mis leads y alumnos registrados</h2>
            <p>
              Aquí ves seguimiento, estado actual, curso, duración, descuento, venta y comisión.
            </p>
          </div>

          <div className="toolbar-filters">
            <input
              className="search-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por alumno, curso o teléfono"
            />

            <select
              value={estadoFiltro}
              onChange={(e) => setEstadoFiltro(e.target.value)}
            >
              <option value="todos">Todos los estados</option>
              <option value="lead">Lead</option>
              <option value="seguimiento">Seguimiento</option>
              <option value="visita_programada">Visita programada</option>
              <option value="inscrito">Inscrito</option>
              <option value="activo">Activo</option>
              <option value="curso_pausado">Curso pausado</option>
              <option value="falta_pago">Falta de pago</option>
              <option value="pagado">Pagado</option>
            </select>
          </div>
        </div>

        <div className="table-wrap-pro">
          <table className="lead-table-pro">
            <thead>
              <tr>
                <th>Alumno</th>
                <th>Curso</th>
                <th>Duración</th>
                <th>Estado</th>
                <th>Tipo cliente</th>
                <th>Precio final</th>
                <th>Comisión</th>
                <th>ID alumno</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {leadsFiltrados.length === 0 ? (
                <tr>
                  <td colSpan="9" className="empty-cell">
                    No hay registros con esos filtros.
                  </td>
                </tr>
              ) : (
                leadsFiltrados.map((lead) => {
                  const tasa = obtenerTasaComision(lead.tipoCliente);
                  const comision =
                    lead.estado === "pagado"
                      ? (Number(lead.valor || 0) * tasa) / 100
                      : 0;

                  return (
                    <tr key={lead.id}>
                      <td>
                        <div className="lead-user-block">
                          <div className="lead-avatar">
                            {(lead.nombre || "A").slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <strong>{lead.nombre}</strong>
                            <span>{lead.telefono || "Sin teléfono"}</span>
                          </div>
                        </div>
                      </td>
                      <td>{lead.cursoNombre || "-"}</td>
                      <td>{lead.duracion ? `${lead.duracion} meses` : "-"}</td>
                      <td>
                      <select
  className={`estado-select estado-${lead.estado}`}
  value={lead.estado}
  onChange={(e) =>
    actualizarEstadoLead(lead.id, e.target.value, lead)
  }
  disabled={lead.estado === "pagado"}
>
                          {Object.keys(estadoLabels).map((key) => (
                            <option key={key} value={key}>
                              {estadoLabels[key]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <span className={`cliente-badge ${lead.tipoCliente}`}>
                          {lead.tipoCliente}
                        </span>
                      </td>
                      <td>{formatearPesos(lead.valor || 0)}</td>
                      <td className="commission-value">
                        {formatearPesos(comision)}
                      </td>
                      <td>{lead.alumnoId || "-"}</td>
                      <td>
                        <div className="row-actions-pro">
                         <button
                          className="icon-btn"
                          onClick={() => cargarFormularioModal(lead)}
                        >
                          Ver
                        </button>
                          {lead.estado !== "pagado" && (
                            <button
  className="pay-btn"
  onClick={() => actualizarEstadoLead(lead.id, "pagado", lead)}
  disabled={!lead.duracion || Number(lead.duracion) <= 0}
>
  Marcar pagado
</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
)}

      {leadActivo && (
        <div className="lead-modal-overlay" onClick={() => setLeadActivo(null)}>
          <div className="lead-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="lead-modal-head">
              <div>
                <span className="hero-kicker">Detalle del lead</span>
                <h3>{leadActivo.nombre}</h3>
                <p>
                  {leadActivo.cursoNombre} · {leadActivo.duracion || "-"} meses
                </p>
              </div>
              <button className="modal-close" onClick={() => setLeadActivo(null)}>
                ✕
              </button>
            </div>

            <div className="lead-modal-grid">
              <div className="modal-data-card">
                <small>Estado</small>
                <strong>{estadoLabels[leadActivo.estado] || leadActivo.estado}</strong>
              </div>
              <div className="modal-data-card">
                <small>Tipo cliente</small>
                <strong>{leadActivo.tipoCliente}</strong>
              </div>
              <div className="modal-data-card">
                <small>Modalidad</small>
                <strong>{leadActivo.modalidad || "-"}</strong>
              </div>
              <div className="modal-data-card">
                <small>Tipo clase</small>
                <strong>{leadActivo.tipoPrograma || "-"}</strong>
              </div>
              <div className="modal-data-card">
              <small>Clase gratis</small>
              <strong>{leadActivo.claseGratis ? "Sí aplica" : "No"}</strong>
            </div>
              <div className="modal-data-card">
                <small>Precio base</small>
                <strong>{formatearPesos(leadActivo.valorBase || 0)}</strong>
              </div>
              <div className="modal-data-card">
                <small>Descuento</small>
                <strong>{Number(leadActivo.descuento || 0)}%</strong>
              </div>
              <div className="modal-data-card">
                <small>Precio final</small>
                <strong>{formatearPesos(leadActivo.valor || 0)}</strong>
              </div>
              <div className="modal-data-card">
                <small>ID alumno</small>
                <strong>{leadActivo.alumnoId || "-"}</strong>
              </div>
            </div>
            
            

          <div className="panel-card-pro" style={{ marginBottom: "18px", padding: "18px" }}>

  {estaBloqueado && !leadActivo?.aprobadoPorAdmin && (
    <div
      style={{
        background: "rgba(255,77,79,0.1)",
        border: "1px solid rgba(255,77,79,0.3)",
        padding: "10px",
        borderRadius: "10px",
        marginBottom: "10px",
        color: "#ffb1b2",
        fontSize: "13px"
      }}
    >
      Este alumno ya está marcado como pagado.
      <br />
      No puedes modificar datos. Debes solicitar aprobación a contabilidad.
    </div>
  )}

  <div className="panel-head-pro compact">
    
    <div>
      <h4>Descuento autorizado</h4>
      <p>Solo aplícalo si ya fue aprobado.</p>
    </div>
  </div>
<div className="field-group field-group-full">
 {estaBloqueado && !leadActivo?.aprobadoPorAdmin && (
  <div className="field-group field-group-full">
    <label>Motivo de la edición</label>
    <textarea
      rows="3"
      value={motivoEdicion}
      onChange={(e) => setMotivoEdicion(e.target.value)}
      placeholder="Explica por qué necesitas modificar este alumno..."
    />
  </div>
)}
  

{estaBloqueado && (
  <small style={{ color: "#aaa" }}>
    Este campo es obligatorio para solicitar cambios
  </small>
)}
</div>

 <div className="descuento-grid">

  <div className="field-group">
  <select
  value={duracionModal}
  onChange={(e) => setDuracionModal(e.target.value)}
  disabled={!puedeEditar}
>
      <option value="">Seleccionar duración</option>
      {[...Array(12)].map((_, i) => (
        <option key={i} value={i + 1}>
          {i + 1} mes{i + 1 > 1 ? "es" : ""}
        </option>
      ))}
    </select>
  </div>

  <div className="field-group">
    <label>Curso</label>
  <select
  value={cursoModal}
  onChange={(e) => setCursoModal(e.target.value)}
  disabled={!puedeEditar}
>
      {cursos.map((c) => (
        <option key={c.id} value={c.id}>{c.nombre}</option>
      ))}
    </select>
  </div>

  <div className="field-group">
    <label>Tipo de clase</label>
    <select
  value={tipoModal}
  onChange={(e) => setTipoModal(e.target.value)}
 disabled={!puedeEditar}
>
      <option value="">Seleccionar tipo</option>
      <option value="personalizado">Personalizado</option>
      <option value="semi">Semi</option>
      <option value="grupal">Grupal</option>
    </select>
  </div>

  <div className="field-group">
    <label>Descuento (%)</label>
    <input
  type="number"
  value={descuentoModal}
  onChange={(e) => setDescuentoModal(e.target.value)}
 disabled={!puedeEditar}
/>
  </div>
  <div className="field-group">
  <label>Precio final calculado</label>
  <input
    type="number"
    value={precioFinalModal}
    readOnly
  />
</div>

  <div className="field-group field-group-full checkbox-wrap">
    <label className="checkbox-row">
      <input
  type="checkbox"
  checked={aplicarDescuentoAutorizado}
  onChange={(e) => setAplicarDescuentoAutorizado(e.target.checked)}
 disabled={!puedeEditar}
/>
      Descuento autorizado
    </label>
  </div>

<div className="field-group field-group-full action-row">
  <button
    type="button"
    className="ghost-btn-pro"
    onClick={() => cargarFormularioModal(leadActivo)}
  >
    Usar datos actuales
  </button>

  <button
  className="primary-btn-pro"
  onClick={aplicarDescuentoLead}
>
  {puedeEditar ? "Guardar cambios" : "Solicitar edición"}
</button>
</div>


  </div>
</div>

            <div className="modal-notes-section">
              <div className="panel-head-pro compact">
                <div>
                  <h4>Seguimiento y notas</h4>
                  <p>Agrega novedades del lead.</p>
                </div>
              </div>

              <div className="note-editor">
                <textarea
                  rows="3"
                  value={notaTexto}
                  onChange={(e) => setNotaTexto(e.target.value)}
                  placeholder="Escribe una nueva novedad..."
                />
                <button
                  className="primary-btn-pro"
                  onClick={() => agregarNotaLead(leadActivo.id)}
                >
                  Guardar nota
                </button>
              </div>

              <div className="notes-list">
                {(leadActivo.notas || []).length === 0 ? (
                  <p className="empty-note">Sin notas registradas.</p>
                ) : (
                  (leadActivo.notas || []).map((nota) => (
                    <div key={nota.id} className="note-item">
                      <strong>{nota.autor || "Asesor"}</strong>
                      <span>{new Date(nota.fecha).toLocaleString()}</span>
                      <p>{nota.texto}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
 {alerta.visible && (
  <div className="toast-alert">
    {alerta.mensaje}
  </div>
)}
  

  </>
  
);

}
export default AsesoresPanel;