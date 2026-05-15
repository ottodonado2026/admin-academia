import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { supabase } from "../services/supabaseClient";
import { generarIdAlumnoBonito, generarIdCurso } from "../utils/idGenerator";

import "../asesores/AsesoresPanel.css";
import "./LeadsAdminSection.css";

const ESTADOS_LEAD = [
  { value: "lead", label: "Lead" },
  { value: "seguimiento", label: "Seguimiento" },
  { value: "visita_programada", label: "Visita programada" },
  { value: "inscrito", label: "Inscrito" },
  { value: "activo", label: "Activo" },
  { value: "curso_pausado", label: "Curso pausado" },
  { value: "falta_pago", label: "Falta de pago" },
  { value: "pagado", label: "Pagado" },
];

const TIPOS_CLIENTE = [
  { value: "nuevo", label: "Cliente nuevo" },
  { value: "activo", label: "Cliente activo" },
  { value: "reactivado", label: "Reactivado" },
];

const TIPOS_PROGRAMA = [
  { value: "personalizado", label: "Personalizado" },
  { value: "semi", label: "Semi-personalizado" },
  { value: "grupal", label: "Grupal" },
];

const MODALIDADES = [
  { value: "regular", label: "Regular" },
  { value: "intensiva", label: "Intensiva" },
  { value: "superintensiva", label: "Superintensiva" },
];

const FORMATOS_CLASE = [
  { value: "presencial", label: "Presencial" },
  { value: "virtual", label: "Virtual" },
];

const DURACIONES = [
  { value: "1", label: "1 mes" },
  { value: "2", label: "2 meses" },
  { value: "3", label: "3 meses" },
  { value: "6", label: "6 meses" },
  { value: "12", label: "12 meses" },
];

const CURSOS_SEMILLA = [
  {
    nombre: "Producción musical",
    categoria: "produccion",
    tipos: {
      personalizado: { precio: 890000 },
      semi: { precio: 550000 },
      grupal: { precio: 390000 },
    },
  },
  {
    nombre: "DJ",
    categoria: "dj",
    tipos: {
      personalizado: { precio: 890000 },
      semi: { precio: 550000 },
      grupal: { precio: 390000 },
    },
  },
  {
    nombre: "Piano",
    categoria: "piano",
    tipos: {
      personalizado: { precio: 690000 },
      semi: { precio: 490000 },
      grupal: { precio: 350000 },
    },
  },
  {
    nombre: "Guitarra",
    categoria: "guitarra",
    tipos: {
      personalizado: { precio: 690000 },
      semi: { precio: 490000 },
      grupal: { precio: 350000 },
    },
  },
  {
    nombre: "Técnica vocal",
    categoria: "canto",
    tipos: {
      personalizado: { precio: 690000 },
      semi: { precio: 490000 },
      grupal: { precio: 350000 },
    },
  },
];

const construirCursos = () => {
  const cursos = [];

  CURSOS_SEMILLA.forEach((curso) => {
    cursos.push({
      ...curso,
      id: generarIdCurso(curso.nombre, cursos),
    });
  });

  return cursos;
};

const formInicial = {
  asesorId: "",
  nombre: "",
  telefono: "",
  email: "",
  tipoDocumento: "",
  numeroDocumento: "",
  edad: "",
  nombreAcudiente: "",
  telefonoAcudiente: "",
  cursoId: "",
  duracion: "",
  modalidad: "regular",
  formatoClase: "",
  tipoPrograma: "personalizado",
  tipoCliente: "nuevo",
  estado: "lead",
  descuento: "",
};

const formatearPesos = (valor) => {
  const numero = Number(valor || 0);

  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(numero);
};

const formatearFecha = (fecha) => {
  if (!fecha) return "-";

  try {
    return new Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(fecha));
  } catch {
    return "-";
  }
};

const limpiarTelefono = (telefono = "") =>
  String(telefono).replace(/\D/g, "").trim();

const sanitizarTexto = (texto = "") =>
  String(texto || "").trim().replace(/\s+/g, " ");

const normalizarEmail = (email = "") =>
  String(email || "").trim().toLowerCase();

const validarEmail = (email = "") => {
  const limpio = normalizarEmail(email);

  if (!limpio) return true;

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio);
};

const normalizarDocumento = (documento = "") =>
  String(documento || "").replace(/\D/g, "").trim();

const crearIdSeguro = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const esMenorDeEdad = (edad = "") => {
  if (edad === "" || edad === null || edad === undefined) return false;

  const numero = Number(edad);

  if (Number.isNaN(numero)) return false;

  return numero < 18;
};

const normalizarTipoDocumento = (tipoDocumento = "") =>
  sanitizarTexto(tipoDocumento).toLowerCase();


const requiereAcudiente = (tipoDocumento = "", edad = "") => {
  const tipo = normalizarTipoDocumento(tipoDocumento);

  return (
    tipo === "ti" ||
    tipo === "tarjeta de identidad" ||
    tipo === "tarjeta_identidad" ||
    esMenorDeEdad(edad)
  );
};

const normalizarModalidadAcademica = (modalidad = "") => {
  const valor = sanitizarTexto(modalidad).toLowerCase();

  if (["regular", "intensiva", "superintensiva"].includes(valor)) {
    return valor;
  }

  /*
    Compatibilidad con leads antiguos:
    Si antes se guardó modalidad = presencial/virtual,
    eso ahora pertenece a formato_clase, no a modalidad.
  */
  return "regular";
};

const normalizarFormatoClase = (formatoClase = "", modalidadLegacy = "") => {
  const valor = sanitizarTexto(formatoClase).toLowerCase();

  if (["presencial", "virtual"].includes(valor)) {
    return valor;
  }

  const legacy = sanitizarTexto(modalidadLegacy).toLowerCase();

  if (["presencial", "virtual"].includes(legacy)) {
    return legacy;
  }

  return "";
};

const existeEnCatalogo = (catalogo = [], value = "") =>
  catalogo.some((item) => item.value === value);

const getCatalogoLabel = (catalogo = [], value = "") =>
  catalogo.find((item) => item.value === value)?.label || value || "-";

const obtenerDatoLead = (lead = {}, camelKey, snakeKey, fallback = "") =>
  lead?.[camelKey] ?? lead?.[snakeKey] ?? fallback;

const normalizarTelefonoWhatsApp = (telefono = "") => {
  const digitos = limpiarTelefono(telefono);

  if (!digitos) return "";

  if (digitos.startsWith("57")) return digitos;

  if (digitos.length === 10) {
    return `57${digitos}`;
  }

  return digitos;
};



const getEstadoLabel = (estado) =>
  ESTADOS_LEAD.find((item) => item.value === estado)?.label || estado || "-";

const adaptarAsesor = (asesor) => ({
  ...asesor,
  asesorId: asesor.asesor_id,
  salarioBase: asesor.salario_base,
  metaMensual: asesor.meta_mensual,
  comisionNuevo: asesor.comision_nuevo,
  comisionActivo: asesor.comision_activo,
  comisionReactivado: asesor.comision_reactivado,
  createdAt: asesor.created_at,
});

const adaptarLead = (lead) => ({
  ...lead,
  cursoId: lead.curso_id,
  cursoNombre: lead.curso_nombre,
  asesorId: lead.asesor_id,
  createdAt: lead.created_at,
  tipoCliente: lead.tipo_cliente,
  tipoPrograma: lead.tipo_programa,
  tipoDocumento: lead.tipo_documento,
  numeroDocumento: lead.numero_documento,
  valorBase: lead.valor_base,
  nombreAcudiente: lead.nombre_acudiente,
  telefonoAcudiente: lead.telefono_acudiente,

  modalidad: normalizarModalidadAcademica(lead.modalidad),
  formatoClase: normalizarFormatoClase(lead.formato_clase, lead.modalidad),
});

function LeadsAdminSection() {
  const navigate = useNavigate();

  const [asesores, setAsesores] = useState([]);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);

  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [leadActualizandoId, setLeadActualizandoId] = useState(null);

  const [alerta, setAlerta] = useState({
    visible: false,
    tipo: "success",
    mensaje: "",
  });

  const [filtros, setFiltros] = useState({
    search: "",
    asesorId: "todos",
    estado: "todos",
  });

  const [form, setForm] = useState(formInicial);

  const cursos = useMemo(() => construirCursos(), []);

  useEffect(() => {
    if (!alerta.visible) return;

    const timer = setTimeout(() => {
      setAlerta({
        visible: false,
        tipo: "success",
        mensaje: "",
      });
    }, 3200);

    return () => clearTimeout(timer);
  }, [alerta]);

  const handleLogout = () => {
    localStorage.removeItem("auth");
    localStorage.removeItem("user");
    navigate("/");
  };

  const [usuarioActual, setUsuarioActual] = useState(null);

useEffect(() => {
  let activo = true;

  const cargarDatos = async () => {
    setLoading(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user || null;

      if (!authUser) {
        navigate("/");
        return;
      }

      const { data: usuarioData, error: usuarioError } = await supabase
        .from("usuarios")
        .select("*")
        .eq("auth_uid", authUser.id)
        .maybeSingle();

      if (usuarioError) {
        console.error("Error cargando usuario actual:", usuarioError);
      }

      const usuario = usuarioData || null;

      setUsuarioActual(usuario);

      const esAdmin =
        usuario?.role === "admin" ||
        usuario?.role === "owner" ||
        usuario?.role === "contador";

      const esCoordinadorPrincipal =
        usuario?.role === "coordinador_academico" &&
        (
          usuario?.puede_registrar_coordinadores === true ||
          usuario?.coordinador_nivel === "principal"
        );

      const puedeVerTodos =
        usuario?.puede_ver_todos_leads === true;

      let asesoresQuery = supabase
        .from("asesores")
        .select("*");

      let leadsQuery = supabase
        .from("leads")
        .select("*");

      if (!esAdmin && !esCoordinadorPrincipal && !puedeVerTodos) {
        asesoresQuery = asesoresQuery.eq("creado_por", usuario?.id);

        leadsQuery = leadsQuery.eq("coordinador_id", usuario?.id);
      }

      const [asesoresResponse, leadsResponse] = await Promise.all([
        asesoresQuery.order("created_at", { ascending: false }),
        leadsQuery.order("created_at", { ascending: false }),
      ]);

        if (!activo) return;

        if (asesoresResponse.error) {
          console.error("Error cargando asesores:", asesoresResponse.error);
          setAsesores([]);
        } else {
          setAsesores((asesoresResponse.data || []).map(adaptarAsesor));
        }

        if (leadsResponse.error) {
          console.error("Error cargando leads:", leadsResponse.error);
          setLeads([]);
        } else {
          setLeads((leadsResponse.data || []).map(adaptarLead));
        }
      } catch (error) {
        console.error("Error general cargando sección Leads:", error);

        if (activo) {
          setAsesores([]);
          setLeads([]);
          setAlerta({
            visible: true,
            tipo: "error",
            mensaje: "No se pudieron cargar los leads.",
          });
        }
      } finally {
        if (activo) setLoading(false);
      }
    };

    cargarDatos();

    return () => {
      activo = false;
    };
  }, [refresh]);

  const asesoresPorId = useMemo(() => {
    const map = new Map();

    asesores.forEach((asesor) => {
      if (asesor.id) map.set(String(asesor.id), asesor);
      if (asesor.asesorId) map.set(String(asesor.asesorId), asesor);
      if (asesor.asesor_id) map.set(String(asesor.asesor_id), asesor);
    });

    return map;
  }, [asesores]);

  const obtenerAsesorLead = (lead) => {
    if (lead?.asesor) return lead.asesor;

    const asesorId = lead?.asesorId || lead?.asesor_id;

    if (!asesorId) return null;

    return asesoresPorId.get(String(asesorId)) || null;
  };

  const perteneceAlAsesor = (lead, asesorIdSeleccionado) => {
    if (asesorIdSeleccionado === "todos") return true;

    const asesor = asesoresPorId.get(String(asesorIdSeleccionado));

    if (!asesor) return false;

    const idLead = String(lead.asesorId || lead.asesor_id || "");

    return (
      idLead === String(asesor.id) ||
      idLead === String(asesor.asesorId) ||
      idLead === String(asesor.asesor_id)
    );
  };

  const leadsConAsesor = useMemo(() => {
    return leads.map((lead) => ({
      ...lead,
      asesor: obtenerAsesorLead(lead),
    }));
  }, [leads, asesoresPorId]);

  const leadsFiltrados = useMemo(() => {
    const q = filtros.search.trim().toLowerCase();

    return leadsConAsesor.filter((lead) => {
      const cumpleAsesor = perteneceAlAsesor(lead, filtros.asesorId);

      const cumpleEstado =
        filtros.estado === "todos" ? true : lead.estado === filtros.estado;

      const texto = [
  lead.nombre,
  lead.telefono,
  lead.email,
  lead.cursoNombre,
  lead.curso_nombre,
  lead.estado,
  lead.modalidad,
  lead.formatoClase,
  lead.formato_clase,
  lead.asesor?.nombre,
  lead.asesor?.asesorId,
]
  .join(" ")
  .toLowerCase();

      const cumpleBusqueda = !q ? true : texto.includes(q);

      return cumpleAsesor && cumpleEstado && cumpleBusqueda;
    });
  }, [leadsConAsesor, filtros, asesoresPorId]);

  const resumen = useMemo(() => {
    const total = leads.length;

    const seguimiento = leads.filter((lead) =>
      ["seguimiento", "visita_programada"].includes(lead.estado)
    ).length;

    const inscritos = leads.filter((lead) =>
      ["inscrito", "activo", "pagado"].includes(lead.estado)
    ).length;

    const visitas = leads.filter(
      (lead) => lead.estado === "visita_programada"
    ).length;

    const sinAsesor = leadsConAsesor.filter((lead) => !lead.asesor).length;

    const valorPotencial = leads.reduce(
      (acc, lead) => acc + Number(lead.valor || 0),
      0
    );

    return {
      total,
      seguimiento,
      inscritos,
      visitas,
      sinAsesor,
      valorPotencial,
    };
  }, [leads, leadsConAsesor]);

  const resumenPorAsesor = useMemo(() => {
    return asesores.map((asesor) => {
      const leadsAsesor = leads.filter((lead) => {
        const idLead = String(lead.asesorId || lead.asesor_id || "");

        return (
          idLead === String(asesor.id) ||
          idLead === String(asesor.asesorId) ||
          idLead === String(asesor.asesor_id)
        );
      });

      const inscritos = leadsAsesor.filter((lead) =>
        ["inscrito", "activo", "pagado"].includes(lead.estado)
      ).length;

      const seguimiento = leadsAsesor.filter((lead) =>
        ["seguimiento", "visita_programada"].includes(lead.estado)
      ).length;

      return {
        asesor,
        total: leadsAsesor.length,
        inscritos,
        seguimiento,
      };
    });
  }, [asesores, leads]);

  const cursoSeleccionado = useMemo(() => {
    return cursos.find((curso) => String(curso.id) === String(form.cursoId));
  }, [cursos, form.cursoId]);

  const precioBase = useMemo(() => {
    if (!cursoSeleccionado || !form.tipoPrograma) return 0;

    return Number(cursoSeleccionado.tipos?.[form.tipoPrograma]?.precio || 0);
  }, [cursoSeleccionado, form.tipoPrograma]);

  const descuentoAplicado = useMemo(() => {
    const numero = Number(form.descuento || 0);

    if (Number.isNaN(numero)) return 0;

    return Math.min(Math.max(numero, 0), 100);
  }, [form.descuento]);

  const valorFinal = useMemo(() => {
    if (!precioBase) return 0;

    return Math.round(precioBase * (1 - descuentoAplicado / 100));
  }, [precioBase, descuentoAplicado]);

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;

    setFiltros((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const resetForm = () => {
    setForm(formInicial);
  };

 const crearLeadManual = async (e) => {
  e.preventDefault();

  const asesorSeleccionado = asesores.find(
    (asesor) => String(asesor.id) === String(form.asesorId)
  );

  const nombreLimpio = sanitizarTexto(form.nombre);
  const telefonoLimpio = limpiarTelefono(form.telefono);
  const emailLimpio = normalizarEmail(form.email);

  const tipoDocumentoLimpio = sanitizarTexto(form.tipoDocumento);
  const documentoLimpio = normalizarDocumento(form.numeroDocumento);

  const edadLimpia = sanitizarTexto(form.edad);
  const nombreAcudienteLimpio = sanitizarTexto(form.nombreAcudiente);
  const telefonoAcudienteLimpio = limpiarTelefono(form.telefonoAcudiente);

  const duracionLimpia = sanitizarTexto(form.duracion);
const modalidadLimpia = normalizarModalidadAcademica(
  form.modalidad || "regular"
);
const formatoClaseLimpio = normalizarFormatoClase(form.formatoClase);
const tipoProgramaLimpio = sanitizarTexto(
  form.tipoPrograma || "personalizado"
);


  const tipoClienteLimpio = sanitizarTexto(form.tipoCliente || "nuevo");
 
  const estadoLimpio = sanitizarTexto(form.estado || "lead");

  const esLeadCoordinador = !form.asesorId;

const debeRegistrarAcudiente = requiereAcudiente(
  tipoDocumentoLimpio,
  edadLimpia
);

const descuentoBruto = Number(form.descuento || 0);

  const descuentoFinal = Number.isNaN(descuentoBruto)
    ? 0
    : Math.min(Math.max(descuentoBruto, 0), 100);

 

  if (!existeEnCatalogo(MODALIDADES, modalidadLimpia)) {
  setAlerta({
    visible: true,
    tipo: "warning",
    mensaje: "Selecciona una modalidad académica válida.",
  });
  return;
}

if (!existeEnCatalogo(FORMATOS_CLASE, formatoClaseLimpio)) {
  setAlerta({
    visible: true,
    tipo: "warning",
    mensaje: "Selecciona un formato de clase válido.",
  });
  return;
}

  if (
  !nombreLimpio ||
  !telefonoLimpio ||
  !form.cursoId ||
  !duracionLimpia ||
  !formatoClaseLimpio
) {
  setAlerta({
    visible: true,
    tipo: "warning",
    mensaje:
      "Completa asesor, nombre, teléfono, curso, duración y formato de clase antes de guardar.",
  });
  return;
}

  if (telefonoLimpio.length < 7 || telefonoLimpio.length > 15) {
    setAlerta({
      visible: true,
      tipo: "warning",
      mensaje: "El teléfono debe tener entre 7 y 15 dígitos.",
    });
    return;
  }

  if (!validarEmail(emailLimpio)) {
    setAlerta({
      visible: true,
      tipo: "warning",
      mensaje: "El correo del lead no tiene un formato válido.",
    });
    return;
  }

  if (!cursoSeleccionado) {
    setAlerta({
      visible: true,
      tipo: "error",
      mensaje: "Selecciona un curso válido.",
    });
    return;
  }

  if (!tipoProgramaLimpio || !existeEnCatalogo(TIPOS_PROGRAMA, tipoProgramaLimpio)) {
    setAlerta({
      visible: true,
      tipo: "warning",
      mensaje: "Selecciona un tipo de programa válido.",
    });
    return;
  }

  if (!existeEnCatalogo(TIPOS_CLIENTE, tipoClienteLimpio)) {
    setAlerta({
      visible: true,
      tipo: "warning",
      mensaje: "Selecciona un tipo de cliente válido.",
    });
    return;
  }

  if (!existeEnCatalogo(ESTADOS_LEAD, estadoLimpio)) {
    setAlerta({
      visible: true,
      tipo: "warning",
      mensaje: "Selecciona un estado válido para el lead.",
    });
    return;
  }

  if (!Number(precioBase) || Number(precioBase) <= 0) {
    setAlerta({
      visible: true,
      tipo: "warning",
      mensaje:
        "El curso y el tipo de programa seleccionados no tienen precio base válido.",
    });
    return;
  }

if (debeRegistrarAcudiente) {
  if (!nombreAcudienteLimpio || !telefonoAcudienteLimpio) {
    setAlerta({
      visible: true,
      tipo: "warning",
      mensaje:
        "Cuando el documento es Tarjeta de identidad o el alumno es menor de edad, debes registrar nombre y teléfono del acudiente.",
    });
    return;
  }

  if (telefonoAcudienteLimpio.length < 7) {
    setAlerta({
      visible: true,
      tipo: "warning",
      mensaje: "El teléfono del acudiente no parece válido.",
    });
    return;
  }
}

  setGuardando(true);

  try {
    const { data: duplicado, error: errorDuplicado } = await supabase
      .from("leads")
      .select("id, nombre, telefono, curso_id, asesor_id, estado")
      .eq("asesor_id", asesorSeleccionado.id)
      .eq("telefono", telefonoLimpio)
      .eq("curso_id", form.cursoId)
      .in("estado", [
        "lead",
        "seguimiento",
        "visita_programada",
        "inscrito",
        "activo",
        "curso_pausado",
        "falta_pago",
      ])
      .limit(1)
      .maybeSingle();

    if (errorDuplicado) {
      console.error("Error validando duplicado:", errorDuplicado);

      setAlerta({
        visible: true,
        tipo: "error",
        mensaje: "No se pudo validar si el lead ya existe.",
      });

      return;
    }

    if (duplicado) {
      setAlerta({
        visible: true,
        tipo: "warning",
        mensaje:
          "Este asesor ya tiene un lead abierto con el mismo teléfono y curso.",
      });

      return;
    }

    const payload = {
      id: crearIdSeguro(),

      nombre: nombreLimpio,
      telefono: telefonoLimpio,
      email: emailLimpio || null,

      curso_id: form.cursoId,
      curso_nombre: cursoSeleccionado.nombre,

      estado: estadoLimpio,
      valor: Number(valorFinal || 0),
      valor_base: Number(precioBase || 0),

    asesor_id: asesorSeleccionado?.id || null,

origen_lead: esLeadCoordinador
  ? "coordinador"
  : "asesor",

coordinador_id: esLeadCoordinador
  ? "coordinador-admin"
  : null,

coordinador_nombre: esLeadCoordinador
  ? "Coordinador"
  : null,

     duracion: duracionLimpia,
modalidad: modalidadLimpia,
formato_clase: formatoClaseLimpio,
tipo_programa: tipoProgramaLimpio,
tipo_cliente: tipoClienteLimpio,
descuento: descuentoFinal,

      tipo_documento: tipoDocumentoLimpio || null,
      numero_documento: documentoLimpio || null,

    edad: edadLimpia || "",
nombre_acudiente: debeRegistrarAcudiente ? nombreAcudienteLimpio : "",
telefono_acudiente: debeRegistrarAcudiente ? telefonoAcudienteLimpio : "",

      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("leads")
      .insert([payload])
      .select("*")
      .single();

    if (error) {
      console.error("Error creando lead manual:", error);

      setAlerta({
        visible: true,
        tipo: "error",
        mensaje: error.message || "No se pudo crear el lead manual.",
      });

      return;
    }

    setLeads((prev) => [adaptarLead(data), ...prev]);

    resetForm();
    setMostrarFormulario(false);

    setAlerta({
      visible: true,
      tipo: "success",
      mensaje: "Lead manual creado y asignado correctamente.",
    });
  } catch (error) {
    console.error("Error inesperado creando lead:", error);

    setAlerta({
      visible: true,
      tipo: "error",
      mensaje: "Error inesperado creando el lead.",
    });
  } finally {
    setGuardando(false);
  }
};

const crearAlumnoDesdeLeadAdmin = async (lead) => {
  const nombre = sanitizarTexto(lead?.nombre);
  const telefono = limpiarTelefono(lead?.telefono);
  const email = normalizarEmail(lead?.email);

  const cursoId = sanitizarTexto(
    obtenerDatoLead(lead, "cursoId", "curso_id", "")
  );

  const cursoNombre = sanitizarTexto(
    obtenerDatoLead(lead, "cursoNombre", "curso_nombre", "")
  );

  const asesorId = sanitizarTexto(
    obtenerDatoLead(lead, "asesorId", "asesor_id", "")
  );

  const tipoDocumento = sanitizarTexto(
    obtenerDatoLead(lead, "tipoDocumento", "tipo_documento", "")
  );

  const numeroDocumento = normalizarDocumento(
    obtenerDatoLead(lead, "numeroDocumento", "numero_documento", "")
  );

  const edad = sanitizarTexto(lead?.edad);

  const nombreAcudiente = sanitizarTexto(
    obtenerDatoLead(lead, "nombreAcudiente", "nombre_acudiente", "")
  );


  const telefonoAcudiente = limpiarTelefono(
  obtenerDatoLead(lead, "telefonoAcudiente", "telefono_acudiente", "")
);

const debeRegistrarAcudiente = requiereAcudiente(tipoDocumento, edad);

const modalidad = normalizarModalidadAcademica(
  obtenerDatoLead(lead, "modalidad", "modalidad", "regular")
);

const formatoClase = normalizarFormatoClase(
  obtenerDatoLead(lead, "formatoClase", "formato_clase", ""),
  obtenerDatoLead(lead, "modalidad", "modalidad", "")
);

  const tipoPrograma = sanitizarTexto(
    obtenerDatoLead(lead, "tipoPrograma", "tipo_programa", "")
  );

  const duracion = sanitizarTexto(lead?.duracion);

  const valor = Number(lead?.valor || 0);

  const valorBase = Number(
    obtenerDatoLead(lead, "valorBase", "valor_base", 0) || 0
  );

  const descuento = Number(lead?.descuento || 0);

  if (!nombre || !telefono || !cursoId) {
    throw new Error(
      "El lead necesita nombre, teléfono y curso antes de pasar a inscrito."
    );
  }

  if (debeRegistrarAcudiente && (!nombreAcudiente || !telefonoAcudiente)) {
  throw new Error(
    "Este lead usa Tarjeta de identidad o es menor de edad. Debe tener nombre y teléfono del acudiente antes de pasar a inscrito."
  );
}

  /*
    Evita duplicar alumnos:
    - Si tiene documento, valida por documento + curso.
    - Si no tiene documento, valida por teléfono + curso.
  */
  let queryAlumnoExistente = supabase
    .from("alumnos")
    .select("id, alumno_id, nombre, telefono, curso_id")
    .eq("curso_id", cursoId)
    .limit(1);

  if (numeroDocumento) {
    queryAlumnoExistente = queryAlumnoExistente.eq(
      "numero_documento",
      numeroDocumento
    );
  } else {
    queryAlumnoExistente = queryAlumnoExistente.eq("telefono", telefono);
  }

  const { data: alumnoExistente, error: errorAlumnoExistente } =
    await queryAlumnoExistente.maybeSingle();

  if (errorAlumnoExistente) {
    console.error("Error validando alumno existente:", errorAlumnoExistente);
    throw new Error("No se pudo validar si el alumno ya existe.");
  }

  if (alumnoExistente) {
    return {
      creado: false,
      alumno: alumnoExistente,
    };
  }

  const alumnoIdBonito = await generarIdAlumnoBonito(nombre);

  const emailFinal =
    email || `sin-email-${crearIdSeguro().replace(/[^a-zA-Z0-9-]/g, "")}@temp.com`;

  const payloadAlumno = {
    id: crearIdSeguro(),

    alumno_id: alumnoIdBonito,

    nombre,
    telefono,
    email: emailFinal,

    curso_id: cursoId,
    curso_nombre: cursoNombre,

    estado: "activo",

    valor,
    valor_base: valorBase,
    descuento,

    asesor_id: asesorId || null,

    tipo_documento: tipoDocumento || "",
numero_documento: numeroDocumento || "",

edad: edad || "",
nombre_acudiente: debeRegistrarAcudiente ? nombreAcudiente : "",
telefono_acudiente: debeRegistrarAcudiente ? telefonoAcudiente : "",

modalidad: modalidad || "regular",
formato_clase: formatoClase || "",
tipo_programa: tipoPrograma || "",
duracion: duracion || "",

    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("alumnos")
    .insert([payloadAlumno])
    .select("id, alumno_id, nombre, telefono, curso_id")
    .single();

  if (error) {
    console.error("Error creando alumno desde Leads Admin:", error);
    throw new Error(error.message || "No se pudo crear el alumno.");
  }

  return {
    creado: true,
    alumno: data,
  };
};

 const actualizarEstadoLead = async (lead, nuevoEstado) => {
  if (!lead?.id) return;

  const estadoAnterior = lead.estado || "lead";

  if (estadoAnterior === nuevoEstado) return;

  if (!existeEnCatalogo(ESTADOS_LEAD, nuevoEstado)) {
    setAlerta({
      visible: true,
      tipo: "warning",
      mensaje: "Selecciona un estado válido.",
    });

    return;
  }
   // 🔥 NUEVO BLOQUE
 if (lead.estado === "pagado") {
  setAlerta({
    visible: true,
    tipo: "warning",
    mensaje: "Un lead pagado no se puede modificar manualmente.",
  });

  return;
}

if (lead.origen_lead !== "coordinador") {
  setAlerta({
    visible: true,
    tipo: "warning",
    mensaje:
      "Este lead pertenece a un asesor. El estado solo puede cambiarlo el asesor.",
  });

  return;
}

  setLeadActualizandoId(lead.id);

  try {

   

    let resultadoAlumno = null;

    /*
      Regla comercial:
      Cuando un lead pasa a INSCRITO, se crea automáticamente
      el alumno en Supabase.

      No eliminamos alumnos si luego el lead cambia de estado.
      Eso evita pérdida accidental de datos académicos.
    */
   
      if (nuevoEstado === "inscrito") {
  resultadoAlumno = await crearAlumnoDesdeLeadAdmin(lead);
}

   const payloadUpdate = {
  estado: nuevoEstado,
  updated_at: new Date().toISOString(),
};

if (resultadoAlumno?.alumno) {
  payloadUpdate.alumno_id =
    resultadoAlumno.alumno.alumno_id || null;

  payloadUpdate.alumno_db_id =
    resultadoAlumno.alumno.id || null;
}

const { data, error } = await supabase
  .from("leads")
  .update(payloadUpdate)


      .eq("id", lead.id)
      .select("*")
      .single();

    if (error) {
      console.error("Error actualizando estado:", error);

      setAlerta({
        visible: true,
        tipo: "error",
        mensaje:
          "El alumno pudo haberse creado, pero no se pudo actualizar el estado del lead. Intenta de nuevo.",
      });

      return;
    }

    setLeads((prev) =>
      prev.map((item) =>
        String(item.id) === String(lead.id) ? adaptarLead(data) : item
      )
    );

    if (nuevoEstado === "inscrito") {
      setAlerta({
        visible: true,
        tipo: "success",
        mensaje: resultadoAlumno?.creado
          ? "Lead marcado como inscrito y alumno creado correctamente."
          : "Lead marcado como inscrito. El alumno ya existía y no se duplicó.",
      });

      return;
    }

    setAlerta({
      visible: true,
      tipo: "success",
      mensaje: `Lead actualizado a ${getEstadoLabel(nuevoEstado)}.`,
    });
  } catch (error) {
    console.error("Error inesperado actualizando estado:", error);

    setAlerta({
      visible: true,
      tipo: "error",
      mensaje:
        error.message || "Error inesperado actualizando el estado del lead.",
    });
  } finally {
    setLeadActualizandoId(null);
  }
};

  const notificarAsesor = async (lead) => {
    const asesor = obtenerAsesorLead(lead);

    if (!asesor) {
      setAlerta({
        visible: true,
        tipo: "warning",
        mensaje: "Este lead no tiene asesor asignado.",
      });
      return;
    }

    const mensaje = [
      `Hola ${asesor.nombre || "asesor"}, tienes un lead para seguimiento:`,
      ``,
      `Lead: ${lead.nombre || "-"}`,
      `Teléfono: ${lead.telefono || "-"}`,
      `Correo: ${lead.email || "-"}`,
     `Curso: ${lead.cursoNombre || lead.curso_nombre || "-"}`,
`Modalidad académica: ${getCatalogoLabel(MODALIDADES, lead.modalidad)}`,
`Formato de clase: ${getCatalogoLabel(FORMATOS_CLASE, lead.formatoClase || lead.formato_clase)}`,
`Estado actual: ${getEstadoLabel(lead.estado)}`,
`Valor: ${formatearPesos(lead.valor || 0)}`,
      ``,
      `Por favor realiza seguimiento y actualiza el estado en tu panel.`,
    ].join("\n");

    try {
      await navigator.clipboard.writeText(mensaje);
    } catch {
      /*
        No detenemos la notificación si el navegador no permite copiar.
      */
    }

    const telefonoWhatsApp = normalizarTelefonoWhatsApp(asesor.telefono);

    if (!telefonoWhatsApp) {
      setAlerta({
        visible: true,
        tipo: "warning",
        mensaje:
          "El asesor no tiene teléfono válido. El mensaje fue preparado para copiar.",
      });
      return;
    }

    window.open(
      `https://wa.me/${telefonoWhatsApp}?text=${encodeURIComponent(mensaje)}`,
      "_blank",
      "noopener,noreferrer"
    );

    setAlerta({
      visible: true,
      tipo: "success",
      mensaje: "Notificación preparada por WhatsApp.",
    });
  };

  return (
    <div className="dashboard-layout">
      <Sidebar onLogout={handleLogout} />

      <main className="dashboard-main leads-admin-page">
        <header className="asesores-admin-topbar leads-admin-topbar">
          <div>
            <p className="asesores-admin-kicker">Gestión comercial</p>
            <h1>Leads</h1>
            <span>
              Administra todos los leads registrados por asesores, crea leads
              manuales, filtra por asesor, cambia estados y notifica seguimiento.
            </span>
          </div>

          <button
            type="button"
            className="primary-neon-btn"
            onClick={() => setMostrarFormulario((prev) => !prev)}
          >
            {mostrarFormulario ? "Cerrar formulario" : "+ Crear lead manual"}
          </button>
        </header>

        {alerta.visible && (
          <div className={`leads-alert leads-alert-${alerta.tipo}`}>
            {alerta.mensaje}
          </div>
        )}

        <section className="leads-kpi-grid">
          <div className="asesor-kpi-card">
            <small>Total leads</small>
            <strong>{resumen.total}</strong>
          </div>

          <div className="asesor-kpi-card">
            <small>Seguimiento</small>
            <strong>{resumen.seguimiento}</strong>
          </div>

          <div className="asesor-kpi-card">
            <small>Visitas programadas</small>
            <strong>{resumen.visitas}</strong>
          </div>

          <div className="asesor-kpi-card">
            <small>Inscritos / activos</small>
            <strong>{resumen.inscritos}</strong>
          </div>

          <div className="asesor-kpi-card">
            <small>Sin asesor detectado</small>
            <strong>{resumen.sinAsesor}</strong>
          </div>

          <div className="asesor-kpi-card kpi-highlight">
            <small>Valor potencial</small>
            <strong>{formatearPesos(resumen.valorPotencial)}</strong>
          </div>
        </section>

        {mostrarFormulario && (
          <section className="asesor-card-block leads-form-card">
            <div className="asesor-card-head">
              <div>
                <h2>Crear lead manual</h2>
                <p>
                  Usa este formulario cuando el asesor no pueda registrar el lead
                  desde su link. El lead queda asignado y separado por asesor.
                </p>
              </div>
            </div>

            <form className="asesor-admin-form" onSubmit={crearLeadManual}>
              <div className="asesor-field asesor-field-full">

                <label>Asesor responsable</label>

             <select
  name="asesorId"
  value={form.asesorId}
  onChange={handleFormChange}
>
  <option value="">Lead propio del coordinador</option>

                  {asesores.map((asesor) => (
                    <option key={asesor.id} value={asesor.id}>
                      {asesor.nombre} — {asesor.asesorId || asesor.asesor_id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="asesor-field">
                <label>Nombre del lead</label>
                <input
                  name="nombre"
                  value={form.nombre}
                  onChange={handleFormChange}
                  placeholder="Nombre completo"
                  required
                />
              </div>

              <div className="asesor-field">
                <label>Teléfono</label>
                <input
                  name="telefono"
                  value={form.telefono}
                  onChange={handleFormChange}
                  placeholder="3000000000"
                  required
                />
              </div>

              <div className="asesor-field">
                <label>Correo</label>
                <input
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleFormChange}
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div className="asesor-field">
                <label>Tipo documento</label>
                <select
                  name="tipoDocumento"
                  value={form.tipoDocumento}
                  onChange={handleFormChange}
                >
                  <option value="">Seleccionar</option>
                  <option value="cc">Cédula</option>
                  <option value="ti">Tarjeta de identidad</option>
                  <option value="ce">Cédula extranjería</option>
                  <option value="pasaporte">Pasaporte</option>
                </select>
              </div>

              <div className="asesor-field">
                <label>Número documento</label>
                <input
                  name="numeroDocumento"
                  value={form.numeroDocumento}
                  onChange={handleFormChange}
                  placeholder="Documento"
                />
              </div>

              <div className="asesor-field">
                <label>Edad</label>
                <input
                  name="edad"
                  type="number"
                  min="0"
                  value={form.edad}
                  onChange={handleFormChange}
                  placeholder="Edad"
                />
              </div>

              <div className="asesor-field">
                <label>Nombre acudiente</label>
                <input
                  name="nombreAcudiente"
                  value={form.nombreAcudiente}
                  onChange={handleFormChange}
                  placeholder="Solo si es menor de edad"
                />
              </div>

              <div className="asesor-field">
                <label>Teléfono acudiente</label>
                <input
                  name="telefonoAcudiente"
                  value={form.telefonoAcudiente}
                  onChange={handleFormChange}
                  placeholder="Teléfono acudiente"
                />
              </div>

              <div className="asesor-field">
                <label>Curso interesado</label>
                <select
                  name="cursoId"
                  value={form.cursoId}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">Seleccionar curso</option>
                  {cursos.map((curso) => (
                    <option key={curso.id} value={curso.id}>
                      {curso.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="asesor-field">
                <label>Tipo de programa</label>
                <select
                  name="tipoPrograma"
                  value={form.tipoPrograma}
                  onChange={handleFormChange}
                  required
                >
                  {TIPOS_PROGRAMA.map((tipo) => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </option>
                  ))}
                </select>
              </div>

             <div className="asesor-field">
  <label>Modalidad académica</label>
  <select
    name="modalidad"
    value={form.modalidad}
    onChange={handleFormChange}
  >
    {MODALIDADES.map((modalidad) => (
      <option key={modalidad.value} value={modalidad.value}>
        {modalidad.label}
      </option>
    ))}
  </select>
</div>

<div className="asesor-field">
  <label>Formato de clase</label>
  <select
    name="formatoClase"
    value={form.formatoClase}
    onChange={handleFormChange}
    required
  >
    <option value="">Seleccionar formato</option>
    {FORMATOS_CLASE.map((formato) => (
      <option key={formato.value} value={formato.value}>
        {formato.label}
      </option>
    ))}
  </select>
</div>

              <div className="asesor-field">
                <label>Duración</label>
                <select
                  name="duracion"
                  value={form.duracion}
                  onChange={handleFormChange}
                  required
                >
                  <option value="">Seleccionar duración</option>
                  {DURACIONES.map((duracion) => (
                    <option key={duracion.value} value={duracion.value}>
                      {duracion.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="asesor-field">
                <label>Tipo de cliente</label>
                <select
                  name="tipoCliente"
                  value={form.tipoCliente}
                  onChange={handleFormChange}
                >
                  {TIPOS_CLIENTE.map((tipo) => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="asesor-field">
                <label>Estado inicial</label>
                <select
                  name="estado"
                  value={form.estado}
                  onChange={handleFormChange}
                >
                  {ESTADOS_LEAD.map((estado) => (
                    <option key={estado.value} value={estado.value}>
                      {estado.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="asesor-field">
                <label>Descuento (%)</label>
                <input
                  name="descuento"
                  type="number"
                  min="0"
                  max="100"
                  value={form.descuento}
                  onChange={handleFormChange}
                  placeholder="0"
                />
              </div>

              <div className="asesor-field">
                <label>Valor calculado</label>
                <input
                  value={formatearPesos(valorFinal)}
                  readOnly
                  aria-label="Valor calculado"
                />
              </div>

              <div className="asesor-field asesor-field-full form-actions">
                <button
                  type="button"
                  className="ghost-btn"
                  onClick={resetForm}
                  disabled={guardando}
                >
                  Limpiar
                </button>

                <button
                  type="submit"
                  className="primary-neon-btn"
                  disabled={guardando}
                >
                  {guardando ? "Guardando..." : "Guardar lead"}
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="leads-main-grid">
         

          <section className="asesor-card-block leads-table-panel">
            <div className="leads-toolbar">
              <div>
                <h2>Listado de leads</h2>
                <p>
                  {loading
                    ? "Cargando registros..."
                    : `${leadsFiltrados.length} resultado(s) encontrados`}
                </p>
              </div>

              <div className="leads-toolbar-filters">

                 <select
  name="asesorId"
  value={filtros.asesorId}
  onChange={handleFiltroChange}
>
  <option value="todos">Todos los asesores</option>
  {resumenPorAsesor.map((item) => (
    <option key={item.asesor.id} value={item.asesor.id}>
      {item.asesor.nombre} — {item.total} lead(s)
    </option>
  ))}
</select>       

                <input
                  name="search"
                  value={filtros.search}
                  onChange={handleFiltroChange}
                  placeholder="Buscar lead, curso o asesor..."
                />

                <select
                  name="estado"
                  value={filtros.estado}
                  onChange={handleFiltroChange}
                >
                  <option value="todos">Todos los estados</option>
                  {ESTADOS_LEAD.map((estado) => (
                    <option key={estado.value} value={estado.value}>
                      {estado.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="leads-table-wrap">
              <table className="leads-admin-table">
                <thead>
                  <tr>
                    <th>Lead</th>
                    <th>Responsable</th>
                    <th>Curso</th>
                    <th>Estado</th>
                    <th>Valor</th>
                    <th>Registro</th>
                    <th>Acciones</th>
                  </tr>
                </thead>

                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="empty-cell">
                        Cargando leads...
                      </td>
                    </tr>
                  ) : leadsFiltrados.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="empty-cell">
                        No hay leads con estos filtros.
                      </td>
                    </tr>
                  ) : (
                    leadsFiltrados.map((lead) => {
                      const asesor = obtenerAsesorLead(lead);

                      return (
                        <tr key={lead.id}>
                          <td data-label="Lead">
                            <div className="lead-main-cell">
                              <strong>{lead.nombre || "Sin nombre"}</strong>
                              <span>{lead.telefono || "Sin teléfono"}</span>
                              <small>{lead.email || "Sin correo"}</small>
                            </div>
                          </td>

                        <td data-label="Responsable">
  <div className="lead-advisor-cell">
    <strong>
      {lead.origen_lead === "coordinador"
        ? "🎯 Coordinador"
        : asesor?.nombre || "Sin asesor"}
    </strong>

    <span>
      {lead.origen_lead === "coordinador"
        ? "Lead propio"
        : asesor?.asesorId ||
          asesor?.asesor_id ||
          lead.asesorId ||
          "-"}
    </span>
  </div>
</td>

                          <td data-label="Curso">
                            <div className="lead-course-cell">
                              <strong>
                                {lead.cursoNombre ||
                                  lead.curso_nombre ||
                                  "Sin curso"}
                              </strong>
                              <span>
  {getCatalogoLabel(
    TIPOS_PROGRAMA,
    lead.tipoPrograma || lead.tipo_programa
  )}{" "}
  ·{" "}
  {getCatalogoLabel(
    MODALIDADES,
    lead.modalidad || lead.modalidad_academica
  )}{" "}
  ·{" "}
  {getCatalogoLabel(
    FORMATOS_CLASE,
    lead.formatoClase || lead.formato_clase
  )}{" "}
  · {lead.duracion || "-"} mes(es)
</span>
                            </div>
                          </td>

       <td data-label="Estado">
  {lead.origen_lead === "coordinador" && lead.estado !== "pagado" ? (
    <select
      className={`lead-status-select estado-${lead.estado || "lead"}`}
      value={lead.estado || "lead"}
      disabled={leadActualizandoId === lead.id}
      onChange={(e) => actualizarEstadoLead(lead, e.target.value)}
    >
      {ESTADOS_LEAD.filter((estado) => estado.value !== "pagado").map(
        (estado) => (
          <option key={estado.value} value={estado.value}>
            {estado.label}
          </option>
        )
      )}
    </select>
  ) : (
    <span
      className={`lead-status-badge estado-${lead.estado || "lead"}`}
    >
      {getEstadoLabel(lead.estado || "lead")}
    </span>
  )}
</td>                

                          <td data-label="Valor">
                            <strong className="lead-money-cell">
                              {formatearPesos(lead.valor || 0)}
                            </strong>
                          </td>

                         <td data-label="Registro">
                            <span className="lead-date-cell">
                              {formatearFecha(lead.createdAt || lead.created_at)}
                            </span>
                          </td>

                          <td data-label="Acciones">
                            <div className="lead-actions-cell">
                              <button
                                type="button"
                                className="table-btn"
                                onClick={() => notificarAsesor(lead)}
                              >
                                Notificar
                              </button>
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
        </section>
      </main>
    </div>
  );
}

export default LeadsAdminSection;