import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { supabase } from "../services/supabaseClient";
import { useAuth } from "../context/AuthContext";
import ExcelJS from "exceljs";

import "./CoordinadorPanel.css";

const CURSOS = [
  "Producción musical",
  "DJ",
  "Piano",
  "Guitarra",
  "Técnica vocal",
];

const MODALIDADES = ["regular", "intensiva", "superintensiva"];

const HORAS_SEMANA_POR_MODALIDAD = {
  regular: 4,
  intensiva: 8,
  superintensiva: 16,
};

const MODULOS_CURSO_DJ = [
  {
    numero: 1,
    nombre: "Módulo 1",
    horas: 16,
    temas: [
      "Fundamentos básicos del DJ",
      "Equipos y formatos de DJ",
      "Elementos y estructuras de las canciones",
      "Introducción a Rekordbox",
      "Ecualización",
      "Empate perfecto",
      "Géneros musicales 1",
    ],
  },
  {
    numero: 2,
    nombre: "Módulo 2",
    horas: 16,
    temas: [
      "Mezcla avanzada",
      "Filtros",
      "Loops",
      "Mezcla armónica",
      "Efectos 1: Reverb, Echo y Delay",
      "Géneros musicales 2",
    ],
  },
  {
    numero: 3,
    nombre: "Módulo 3",
    horas: 16,
    temas: [
      "Introducción Pioneer XDJ RR",
      "Color FX",
      "Mezcla sin visual",
      "Mezcla sin BPM",
      "PADS",
      "Prácticas avanzadas",
    ],
  },
  {
    numero: 4,
    nombre: "Módulo 4",
    horas: 16,
    temas: [
      "Géneros musicales 3",
      "Efectos 2",
      "Cómo preparar presentaciones en vivo",
      "Music Business 1",
      "Prácticas 2",
      "PAD FX",
      "Introducción XDJ RX",
      "Crossover 1",
      "Cómo mezclar con la XDJ y el computador",
    ],
  },
  {
    numero: 5,
    nombre: "Módulo 5",
    horas: 16,
    temas: [
      "Hot Cues",
      "Conexiones avanzadas",
      "Efectos avanzados",
      "Mezcla avanzada con Loops y Acapella",
      "Music Business 3",
      "Cómo grabar tu propio SET desde Rekordbox",
    ],
  },
];

const MODULOS_POR_CURSO = {
  DJ: MODULOS_CURSO_DJ,
  "Producción musical": [],
  Piano: [],
  Guitarra: [],
  "Técnica vocal": [],
};

const HORAS_POR_MODULO = 16;



const DURACIONES_CLASE = [1, 2, 3, 4, 5, 6, 7, 8];

const FORMATOS_CLASE = ["presencial", "virtual"];

const formClaseInicial = {
  alumnoId: "",
  profesorId: "",
  curso: "",
  tema: "",
  fecha: "",
  hora: "",
  horaFin: "",
  duracionClase: 2,
  modalidad: "regular",
  formatoClase: "presencial",
  observaciones: "",
};

const formVisitaInicial = {
  nombreVisitante: "",
  apellidoVisitante: "",
  tipoDocumento: "",
  numeroDocumento: "",
  telefono: "",
  esMenorEdad: false,
  nombreAcudiente: "",
  telefonoAcudiente: "",
  cursoInteres: "",
  fecha: "",
  hora: "",
  responsable: "",
  observaciones: "",
};

const formClaseGratisInicial = {
  nombre: "",
  telefono: "",
  curso: "",
  profesorId: "",
  fecha: "",
  hora: "",
  horaFin: "",
  duracionMinutos: 60,
  observaciones: "",
};

const formatearPesos = (valor) =>
  new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(valor || 0));

const formatearFecha = (fecha) => {
  if (!fecha) return "-";

  try {
    return new Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(fecha));
  } catch {
    return "-";
  }
};

const limpiarTexto = (texto = "") => String(texto || "").trim();
const limpiarTelefono = (telefono = "") =>
  String(telefono || "").replace(/\D/g, "").trim();

const crearIdSeguro = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }

  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

const calcularHoraFin = (horaInicio, duracionClase) => {
  if (!horaInicio || !duracionClase) return "";

  const [horas, minutos] = horaInicio.split(":").map(Number);

  const fecha = new Date();

  fecha.setHours(horas);
  fecha.setMinutes(minutos);
  fecha.setSeconds(0);

  fecha.setHours(fecha.getHours() + Number(duracionClase));

  return `${String(fecha.getHours()).padStart(2, "0")}:${String(
    fecha.getMinutes()
  ).padStart(2, "0")}`;
};

const calcularHoraFinMinutos = (horaInicio, duracionMinutos) => {
  if (!horaInicio || !duracionMinutos) return "";

  const [horas, minutos] = horaInicio.split(":").map(Number);

  const fecha = new Date();
  fecha.setHours(horas);
  fecha.setMinutes(minutos);
  fecha.setSeconds(0);
  fecha.setMilliseconds(0);

  fecha.setMinutes(fecha.getMinutes() + Number(duracionMinutos));

  return `${String(fecha.getHours()).padStart(2, "0")}:${String(
    fecha.getMinutes()
  ).padStart(2, "0")}`;
};


const calcularComisionLead = (lead) => {
  if (lead.estado !== "pagado") return 0;

  const valor = Number(lead.valor || 0);
  const tipo = String(lead.tipo_cliente || lead.tipoCliente || "nuevo").toLowerCase();

  if (tipo === "activo") return valor * 0.05;
  if (tipo === "reactivado") return valor * 0.07;

  return valor * 0.1;
};

function CoordinadorPanel() {
  const navigate = useNavigate();
  const { user: authUser, role: authRole, userData: contextUserData, loading: loadingAuth } = useAuth();

  const [usuario, setUsuario] = useState(null);
  const [permisosClases, setPermisosClases] = useState({
  puedeEditarClases: false,
  puedePausarClases: false,
  puedeCancelarClases: false,
  puedeEliminarClases: false,
});

  const [alumnos, setAlumnos] = useState([]);
  

  const [profesores, setProfesores] = useState([]);
  const [clases, setClases] = useState([]);
  const [visitas, setVisitas] = useState([]);
  const [clasesGratis, setClasesGratis] = useState([]);
  const [leads, setLeads] = useState([]);
  const [pagosCoordinador, setPagosCoordinador] = useState([]);

  const [loading, setLoading] = useState(true);
  const [guardandoClase, setGuardandoClase] = useState(false);
  const [guardandoVisita, setGuardandoVisita] = useState(false);
  const [guardandoClaseGratis, setGuardandoClaseGratis] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [vistaActiva, setVistaActiva] = useState("dashboard");

  const [claseSeleccionada, setClaseSeleccionada] = useState(null);
const [editandoClaseId, setEditandoClaseId] = useState(null);
const [editandoVisitaId, setEditandoVisitaId] = useState(null);
const [modalVisitaAbierto, setModalVisitaAbierto] = useState(false);

const [visitaSeleccionada, setVisitaSeleccionada] = useState(null);
const [modalVerVisitaAbierto, setModalVerVisitaAbierto] = useState(false);

const [alumnoExtraId, setAlumnoExtraId] = useState("");

 const [formClase, setFormClase] = useState(formClaseInicial);
const [alumnosClaseSeleccionados, setAlumnosClaseSeleccionados] = useState([]);
const [formVisita, setFormVisita] = useState(formVisitaInicial);
const [formClaseGratis, setFormClaseGratis] = useState(formClaseGratisInicial);

const [modalClasesGratisAbierto, setModalClasesGratisAbierto] = useState(false);
const [busquedaClaseGratis, setBusquedaClaseGratis] = useState("");
const [estadoClaseGratisFiltro, setEstadoClaseGratisFiltro] = useState("todas");
const [paginaClasesGratis, setPaginaClasesGratis] = useState(1);

const CLASES_GRATIS_POR_PAGINA = 10;

  const [alerta, setAlerta] = useState({
    visible: false,
    tipo: "success",
    mensaje: "",
  });

  const mostrarAlerta = (tipo, mensaje) => {
    setAlerta({ visible: true, tipo, mensaje });
  };

  useEffect(() => {
    if (!alerta.visible) return;

    const timer = setTimeout(() => {
      setAlerta({ visible: false, tipo: "success", mensaje: "" });
    }, 3600);

    return () => clearTimeout(timer);
  }, [alerta]);

  const handleLogout = () => {
    localStorage.removeItem("auth");
    localStorage.removeItem("user");
    navigate("/");
  };

  useEffect(() => {
    const channel = supabase
      .channel("coordinador-clases-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "clases" }, () => {
        setRefresh((prev) => prev + 1);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (loadingAuth) return;
    if (!authUser) {
      if (!loadingAuth) navigate("/login");
      return;
    }

    let activo = true;

    const cargarDatos = async () => {
      setLoading(true);

      try {
        let usuarioActual = contextUserData || {
          id: authUser.id,
          nombre: authUser.email,
          email: authUser.email,
          role: authRole || "coordinador",
        };

        setUsuario(usuarioActual);

        const roleActual = String(usuarioActual?.role || "").toLowerCase();

        const esPrincipal =
          roleActual === "admin" ||
          roleActual === "owner" ||
          (roleActual === "coordinador_academico" &&
          (usuarioActual?.puede_registrar_coordinadores === true ||
           usuarioActual?.coordinador_nivel === "principal"));

const puedeEditarClases =
  esPrincipal ||
  usuarioActual?.puede_editar_clases === true;

const puedePausarClases =
  esPrincipal ||
  usuarioActual?.puede_pausar_clases === true;

const puedeCancelarClases =
  esPrincipal ||
  usuarioActual?.puede_cancelar_clases === true;

const puedeEliminarClases =
  esPrincipal ||
  usuarioActual?.puede_eliminar_clases === true;

  setPermisosClases({
  puedeEditarClases,
  puedePausarClases,
  puedeCancelarClases,
  puedeEliminarClases,
});

const clasesQuery = supabase
  .from("clases")
  .select("*");

const visitasQuery = supabase
  .from("visitas")
  .select("*");

const clasesGratisQuery = supabase
  .from("clases_gratis")
  .select("*");

const leadsQuery = supabase
  .from("leads")
  .select("*")
  .eq("origen_lead", "coordinador");

const pagosQuery = supabase
  .from("pagos_coordinadores")
  .select("*");

if (!esPrincipal && usuarioActual?.id) {
  clasesQuery.eq("coordinador_id", usuarioActual.id);

  visitasQuery.eq("coordinador_id", usuarioActual.id);

  clasesGratisQuery.eq("coordinador_id", usuarioActual.id);

  leadsQuery.eq("coordinador_id", usuarioActual.id);

  pagosQuery.eq("coordinador_id", usuarioActual.id);
}

const [
  alumnosResponse,
  profesoresResponse,
  clasesResponse,
  visitasResponse,
  clasesGratisResponse,
  leadsResponse,
  pagosCoordinadorResponse,
] = await Promise.all([
  supabase
    .from("alumnos")
    .select("*")
    .order("created_at", { ascending: false }),

  supabase
    .from("profesores")
    .select("*")
    .order("created_at", { ascending: false }),

  clasesQuery.order("fecha", { ascending: false }),

  visitasQuery.order("fecha", { ascending: false }),

  clasesGratisQuery.order("fecha", { ascending: false }),

  leadsQuery.order("created_at", { ascending: false }),

  pagosQuery.order("fecha_pago", { ascending: false }),
]);
          

        if (!activo) return;

        setUsuario(usuarioActual);

        if (alumnosResponse.error) {
          console.error("Error cargando alumnos:", alumnosResponse.error);
          setAlumnos([]);
        } else {
          setAlumnos(alumnosResponse.data || []);
        }

       if (profesoresResponse.error) {
      console.error("Error cargando profesores:", profesoresResponse.error);
      setProfesores([]);
    } else {
      const profesoresFormateados = (profesoresResponse.data || [])
        .map((profesor) => ({
      id: profesor.id,
      ...(profesor.data || {}),
        }))
    .filter((profesor) => String(profesor.estado || "").toLowerCase() === "activo");

      setProfesores(profesoresFormateados);
    }

        if (clasesResponse.error) {
          console.error("Error cargando clases:", clasesResponse.error);
          setClases([]);
        } else {
          setClases(clasesResponse.data || []);
        }

       if (visitasResponse.error) {
  console.error("Error cargando visitas:", visitasResponse.error);
  setVisitas([]);
} else {
  console.log("VISITAS CARGADAS:", visitasResponse.data);
  setVisitas(visitasResponse.data || []);
}

        if (clasesGratisResponse.error) {
          console.error("Error cargando clases gratis:", clasesGratisResponse.error);
          setClasesGratis([]);
        } else {
          setClasesGratis(clasesGratisResponse.data || []);
        }

        if (leadsResponse.error) {
          console.error("Error cargando leads coordinador:", leadsResponse.error);
          setLeads([]);
        } else {
          setLeads(leadsResponse.data || []);
        }

        if (pagosCoordinadorResponse.error) {
          console.error("Error cargando pagos coordinador:", pagosCoordinadorResponse.error);
          setPagosCoordinador([]);
        } else {
          setPagosCoordinador(pagosCoordinadorResponse.data || []);
        }
      } catch (error) {
        console.error("Error general cargando panel coordinador:", error);

        if (activo) {
          mostrarAlerta("error", "No se pudo cargar el panel del coordinador.");
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

  const alumnosPorId = useMemo(() => {
    const map = new Map();

    alumnos.forEach((alumno) => {
      if (alumno.id) map.set(String(alumno.id), alumno);
      if (alumno.alumno_id) map.set(String(alumno.alumno_id), alumno);
    });

    return map;
  }, [alumnos]);

  const profesoresPorId = useMemo(() => {
    const map = new Map();

    profesores.forEach((profesor) => {
      if (profesor.id) map.set(String(profesor.id), profesor);
      if (profesor.profesor_id) map.set(String(profesor.profesor_id), profesor);
    });

    return map;
  }, [profesores]);

  const resumen = useMemo(() => {
    const leadsPagados = leads.filter((lead) => lead.estado === "pagado");

    const comisionesGeneradas = leadsPagados.reduce(
      (acc, lead) => acc + calcularComisionLead(lead),
      0
    );

    const pagosRecibidos = pagosCoordinador
      .filter((pago) => String(pago.estado || "").toLowerCase() === "pagado")
      .reduce((acc, pago) => acc + Number(pago.monto || 0), 0);

    const alumnosMora = alumnos.filter((alumno) => {
      const estado = String(alumno.estado_pago || alumno.estado || "").toLowerCase();
      return estado.includes("mora") || estado.includes("pendiente") || estado.includes("falta_pago");
    }).length;

    return {
      clasesProgramadas: clases.length,
      clasesGratis: clasesGratis.length,
      visitasAgendadas: visitas.length,
      alumnosAlDia: Math.max(alumnos.length - alumnosMora, 0),
      alumnosMora,
      comisionesGeneradas,
      pagosRecibidos,
    };
  }, [clases, clasesGratis, visitas, alumnos, leads, pagosCoordinador]);

  const leadsPagados = useMemo(
    () => leads.filter((lead) => lead.estado === "pagado"),
    [leads]
  );

  const totalPagadoCoordinador = useMemo(
    () =>
      pagosCoordinador
        .filter((pago) => String(pago.estado || "").toLowerCase() === "pagado")
        .reduce((acc, pago) => acc + Number(pago.monto || 0), 0),
    [pagosCoordinador]
  );

  const estaEnRango = (fecha, rango) => {
  if (!fecha) return false;

  const hoy = new Date();
  const fechaItem = new Date(fecha);

  const inicioDia = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  const inicioAno = new Date(hoy.getFullYear(), 0, 1);

  const inicioSemana = new Date(inicioDia);
  inicioSemana.setDate(inicioDia.getDate() - inicioDia.getDay());

  if (rango === "dia") return fechaItem >= inicioDia;
  if (rango === "semana") return fechaItem >= inicioSemana;
  if (rango === "mes") return fechaItem >= inicioMes;
  if (rango === "ano") return fechaItem >= inicioAno;

  return false;
};

const totalComisionesPorRango = (rango) =>
  leadsPagados
    .filter((lead) => estaEnRango(lead.created_at, rango))
    .reduce((acc, lead) => acc + calcularComisionLead(lead), 0);

const totalPagosPorRango = (rango) =>
  pagosCoordinador
    .filter((pago) => String(pago.estado || "").toLowerCase() === "pagado")
    .filter((pago) => estaEnRango(pago.fecha_pago || pago.created_at, rango))
    .reduce((acc, pago) => acc + Number(pago.monto || 0), 0);

    const clasesOrdenadas = useMemo(() => {
  return [...clases].sort((a, b) => {
    const fechaA = new Date(`${a.fecha || ""}T${a.hora || a.hora_inicio || "00:00"}`);
    const fechaB = new Date(`${b.fecha || ""}T${b.hora || b.hora_inicio || "00:00"}`);

    return fechaB - fechaA;
  });
}, [clases]);

const resumenClases = useMemo(() => {
  const hoy = new Date().toISOString().split("T")[0];

  return {
    total: clases.length,
    hoy: clases.filter((clase) => clase.fecha === hoy).length,
    programadas: clases.filter((clase) =>
      ["programada", "reprogramada"].includes(String(clase.estado || "").toLowerCase())
    ).length,
    pausadas: clases.filter((clase) =>
      String(clase.estado || "").toLowerCase() === "pausada"
    ).length,
    canceladas: clases.filter((clase) =>
      String(clase.estado || "").toLowerCase() === "cancelada"
    ).length,
  };
}, [clases]);

const clasesGratisOrdenadas = useMemo(() => {
  return [...clasesGratis].sort((a, b) => {
    const fechaA = new Date(`${a.fecha || ""}T${a.hora || "00:00"}`);
    const fechaB = new Date(`${b.fecha || ""}T${b.hora || "00:00"}`);

    return fechaB - fechaA;
  });
}, [clasesGratis]);

const clasesGratisFiltradas = useMemo(() => {
  const term = busquedaClaseGratis.trim().toLowerCase();

  return clasesGratisOrdenadas.filter((clase) => {
    const estado = String(clase.estado || "programada").toLowerCase();

    const coincideEstado =
      estadoClaseGratisFiltro === "todas" ||
      estado === estadoClaseGratisFiltro;

    const textoBusqueda = [
      clase.nombre,
      clase.telefono,
      clase.curso,
      clase.profesor_nombre,
      clase.fecha,
      clase.hora,
      clase.estado,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const coincideBusqueda = !term || textoBusqueda.includes(term);

    return coincideEstado && coincideBusqueda;
  });
}, [clasesGratisOrdenadas, busquedaClaseGratis, estadoClaseGratisFiltro]);

const totalPaginasClasesGratis = Math.max(
  1,
  Math.ceil(clasesGratisFiltradas.length / CLASES_GRATIS_POR_PAGINA)
);

const clasesGratisPaginadas = useMemo(() => {
  const inicio = (paginaClasesGratis - 1) * CLASES_GRATIS_POR_PAGINA;
  const fin = inicio + CLASES_GRATIS_POR_PAGINA;

  return clasesGratisFiltradas.slice(inicio, fin);
}, [clasesGratisFiltradas, paginaClasesGratis]);

useEffect(() => {
  setPaginaClasesGratis(1);
}, [busquedaClaseGratis, estadoClaseGratisFiltro]);

const resumenClasesGratis = useMemo(() => {
  const hoy = new Date().toISOString().split("T")[0];

  return {
    total: clasesGratis.length,
    hoy: clasesGratis.filter((clase) => clase.fecha === hoy).length,
    programadas: clasesGratis.filter(
      (clase) => String(clase.estado || "").toLowerCase() === "programada"
    ).length,
    enCurso: clasesGratis.filter(
      (clase) => String(clase.estado || "").toLowerCase() === "en_curso"
    ).length,
    finalizadas: clasesGratis.filter(
      (clase) => String(clase.estado || "").toLowerCase() === "finalizada"
    ).length,
  };
}, [clasesGratis]);

const obtenerAlumnosDeClase = (clase) => {
  if (!clase) return [];

  if (Array.isArray(clase.alumnos) && clase.alumnos.length > 0) {
    return clase.alumnos.map((alumno) => ({
      id: alumno.id || alumno.alumno_id,
      alumno_id: alumno.alumno_id || alumno.id,
      nombre: alumno.nombre || "Alumno",
      tipo: alumno.tipo || (alumno.agregadoExtra ? "extra" : "principal"),
      asistio: alumno.asistio === true,
      sumaHoras: alumno.sumaHoras === true,
      horasSumadas:
        alumno.asistio === true && alumno.sumaHoras === true
          ? Number(alumno.horasManual || clase.duracion_horas || 0)
          : 0,
    }));
  }

  return [
    {
      id: clase.alumno_db_id || clase.alumno_id,
      alumno_id: clase.alumno_id,
      nombre: clase.alumno_nombre || "Alumno principal",
      tipo: "principal",
      asistio:
        clase.asistio === true ||
        clase.asistencia === true ||
        clase.estado_asistencia === "asistio",
      sumaHoras:
        clase.asistio === true ||
        clase.asistencia === true ||
        clase.estado_asistencia === "asistio",
      horasSumadas:
        clase.asistio === true ||
        clase.asistencia === true ||
        clase.estado_asistencia === "asistio"
          ? Number(clase.duracion_horas || 0)
          : 0,
    },
  ];
};

const calcularHorasAlumno = (alumnoId) => {
  return clases.reduce((acc, clase) => {
    const estado = String(clase.estado || "").toLowerCase();

    if (estado === "cancelada" || estado === "pausada") {
      return acc;
    }

    const alumnosClase = obtenerAlumnosDeClase(clase);

    const alumnoEnClase = alumnosClase.find(
      (alumno) =>
        String(alumno.id) === String(alumnoId) ||
        String(alumno.alumno_id) === String(alumnoId)
    );

    if (!alumnoEnClase) return acc;

    return acc + Number(alumnoEnClase.horasSumadas || 0);
  }, 0);
};

const calcularInasistenciasAlumno = (alumnoId) => {
  return clases.reduce((acc, clase) => {
    const estado = String(clase.estado || "").toLowerCase();

    if (estado === "cancelada") {
      return acc;
    }

    const alumnosClase = obtenerAlumnosDeClase(clase);

    const alumnoEnClase = alumnosClase.find(
      (alumno) =>
        String(alumno.id) === String(alumnoId) ||
        String(alumno.alumno_id) === String(alumnoId)
    );

    if (!alumnoEnClase) return acc;

    return alumnoEnClase.asistio === false ? acc + 1 : acc;
  }, 0);
};

const calcularModuloActual = (horas) => {
  if (!horas || horas <= 0) return 1;

  return Math.ceil(horas / HORAS_POR_MODULO);
};

const calcularHorasModulo = (horas) => {
  if (!horas) return 0;

  const restante = horas % HORAS_POR_MODULO;

  if (restante === 0 && horas > 0) {
    return HORAS_POR_MODULO;
  }

  return restante;
};

const obtenerProgresoAlumno = (alumnoId) => {
  const horasAcumuladas = calcularHorasAlumno(alumnoId);
  const moduloActual = calcularModuloActual(horasAcumuladas);
  const horasModulo = calcularHorasModulo(horasAcumuladas);

  const horasRestantesModulo =
    horasModulo === 0 ? HORAS_POR_MODULO : HORAS_POR_MODULO - horasModulo;

  return {
    horasAcumuladas,
    moduloActual,
    horasModulo,
    horasRestantesModulo,
  };
};

  const validarAlumnoAlDia = async (alumno) => {
    if (!alumno) return false;

    try {
      const filtros = [];

      if (alumno.alumno_id) filtros.push(`alumno_id.eq.${alumno.alumno_id}`);
      if (alumno.id) filtros.push(`alumno_db_id.eq.${alumno.id}`, `alumno_id.eq.${alumno.id}`);

      if (filtros.length === 0) return false;

      const { data, error } = await supabase
        .from("pagos")
        .select("id, estado, monto, valor, fecha_pago, alumno_id, alumno_db_id")
        .or(filtros.join(","))
        .order("fecha_pago", { ascending: false });

      if (error) {
        console.error("Error validando pagos del alumno:", error);
        return false;
      }

      const pagos = data || [];

      if (pagos.length === 0) return false;

      const tieneMora = pagos.some((pago) => {
        const estado = String(pago.estado || "").toLowerCase();
        return estado.includes("mora") || estado.includes("pendiente") || estado.includes("rechazado");
      });

      const tienePagoConfirmado = pagos.some((pago) => {
        const estado = String(pago.estado || "").toLowerCase();
        return estado === "pagado" || estado === "aprobado" || estado === "confirmado";
      });

      return tienePagoConfirmado && !tieneMora;
    } catch (error) {
      console.error("Error inesperado validando alumno al día:", error);
      return false;
    }
  };

const agregarAlumnoAClaseTemporal = () => {
  if (!formClase.alumnoId) {
    mostrarAlerta("warning", "Selecciona un alumno para agregarlo a la clase.");
    return;
  }

 const alumno = alumnosPorId.get(String(formClase.alumnoId));

 const estadoPago = String(
  alumno.estado_pago ||
  alumno.estado ||
  "sin_validar"
).toLowerCase();

const alumnoEnMora =
  estadoPago.includes("mora") ||
  estadoPago.includes("pendiente") ||
  estadoPago.includes("falta_pago");

if (alumnoEnMora) {
  const confirmarIngreso = window.confirm(
    "Este alumno está en mora o tiene pagos pendientes.\n\n¿Gerencia autorizó permitir el ingreso a clase?"
  );

  if (!confirmarIngreso) {
    mostrarAlerta(
      "warning",
      "No se agregó el alumno por estado de mora."
    );

    return;
  }
}

if (!alumno) {
  mostrarAlerta("error", "No se encontró el alumno seleccionado.");
  return;
}

const progresoAlumno = obtenerProgresoAlumno(alumno.id || alumno.alumno_id);

  setAlumnosClaseSeleccionados((prev) => [
    ...prev,
    {
      id: alumno.id || alumno.alumno_id,
      alumno_id: alumno.alumno_id || alumno.id,
      nombre: alumno.nombre || "",
      moduloActual: progresoAlumno.moduloActual,
horasAcumuladas: progresoAlumno.horasAcumuladas,
horasModulo: progresoAlumno.horasModulo,
horasRestantesModulo: progresoAlumno.horasRestantesModulo,
      telefono: alumno.telefono || "",
      estadoPago:
  alumno.estado_pago ||
  alumno.estado ||
  alumno.estadoPago ||
  "Sin validar",
      asistio: false,
      sumaHoras: false,
      horasManual: 0,
      calificacion: null,
      observacion: "",
      tipo: prev.length === 0 ? "principal" : "extra",
      agregadoExtra: prev.length > 0,
      agregadoEn: new Date().toISOString(),
    },
  ]);

  setFormClase((prev) => ({
    ...prev,
    alumnoId: "",
  }));
};

const quitarAlumnoDeClaseTemporal = (alumnoId) => {
  setAlumnosClaseSeleccionados((prev) =>
    prev.map((alumno, index) => ({
      ...alumno,
      tipo: index === 0 ? "principal" : "extra",
      agregadoExtra: index > 0,
    })).filter(
      (alumno) =>
        String(alumno.id) !== String(alumnoId) &&
        String(alumno.alumno_id) !== String(alumnoId)
    )
  );
};

const handleClaseChange = (e) => {
  const { name, value } = e.target;

  setFormClase((prev) => {
    const actualizado = {
      ...prev,
      [name]: value,
    };

    if (name === "hora") {
      actualizado.horaFin = calcularHoraFin(value, actualizado.duracionClase);
    }

    if (name === "duracionClase") {
      actualizado.horaFin = calcularHoraFin(actualizado.hora, value);
    }

    return actualizado;
  });
};
  const handleVisitaChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormVisita((prev) => {

  const nuevoValor =
    type === "checkbox" ? checked : value;

  const nuevoState = {
    ...prev,
    [name]: nuevoValor,
  };

  if (name === "tipoDocumento") {
    nuevoState.esMenorEdad =
      value === "ti";
  }

  return nuevoState;
});
  };

 const handleClaseGratisChange = (e) => {
  const { name, value } = e.target;

  setFormClaseGratis((prev) => {
    const actualizado = {
      ...prev,
      [name]: value,
    };

    if (name === "hora") {
      actualizado.horaFin = calcularHoraFinMinutos(
        value,
        actualizado.duracionMinutos
      );
    }

    if (name === "duracionMinutos") {
      actualizado.horaFin = calcularHoraFinMinutos(
        actualizado.hora,
        value
      );
    }

    return actualizado;
  });
};

  const crearClase = async (e) => {
    e.preventDefault();

   const profesor = profesoresPorId.get(String(formClase.profesorId));

if (
  alumnosClaseSeleccionados.length === 0 ||
  !profesor ||
  !formClase.curso ||
  !formClase.tema ||
  !formClase.fecha ||
  !formClase.hora
) {
  mostrarAlerta(
    "warning",
    "Agrega al menos un alumno y completa profesor, curso, tema, fecha y hora."
  );
  return;
}

const alumnoPrincipal = alumnosClaseSeleccionados[0];

    setGuardandoClase(true);

    try {
      console.log("USUARIO ACTUAL:", usuario);
console.log("COORDINADOR ID QUE SE GUARDA:", usuario?.id);
      const payload = {
        id: crearIdSeguro(),
        alumno_id: alumnoPrincipal.alumno_id || alumnoPrincipal.id,
        alumno_db_id: alumnoPrincipal.id || null,
        alumno_nombre: alumnoPrincipal.nombre || "",
        profesor_id: profesor.profesor_id || profesor.id,
        profesor_db_id: profesor.id || null,
        profesor_nombre: profesor.nombre || "",
        curso: limpiarTexto(formClase.curso),
        tema: limpiarTexto(formClase.tema),
        fecha: formClase.fecha,
        hora: formClase.hora,
      hora_fin: formClase.horaFin,
      duracion_horas: Number(formClase.duracionClase || 0),
      modalidad: formClase.modalidad,
        formato_clase: formClase.formatoClase,
       observaciones: limpiarTexto(formClase.observaciones),
alumnos: alumnosClaseSeleccionados,
estado: "programada",
coordinador_id: usuario?.id || null,


        coordinador_nombre: usuario?.nombre || usuario?.email || "Coordinador",
        created_at: new Date().toISOString(),
      };

    const { data: claseCreada, error } = await supabase
  .from("clases")
  .insert([payload])
  .select()
  .single();

if (error) {
  console.error("Error creando clase:", error);
  mostrarAlerta("error", error.message || "No se pudo crear la clase.");
  return;
}



await registrarAuditoriaClase({
  claseId: claseCreada?.id || payload.id,
  accion: "crear_clase",
  descripcion: "El coordinador creó una clase",
  estadoAnterior: null,
  estadoNuevo: "programada",
  alumno: alumnoPrincipal,
  profesor,
  coordinador: usuario,
  datos: {
  clase: claseCreada || payload,
  hora: payload.hora,
  hora_fin: payload.hora_fin,
  duracion_horas: payload.duracion_horas,
  modalidad: payload.modalidad,
  formato_clase: payload.formato_clase,
  curso: payload.curso,
  tema: payload.tema,
},
});


      setFormClase(formClaseInicial);
setAlumnosClaseSeleccionados([]);
setRefresh((prev) => prev + 1);
mostrarAlerta("success", "Clase programada correctamente.");
    } catch (error) {
      console.error("Error inesperado creando clase:", error);
      mostrarAlerta("error", "Error inesperado creando la clase.");
    } finally {
      setGuardandoClase(false);
    }
  };

  const abrirDetalleVisita = (visita) => {
  setVisitaSeleccionada(visita);
  setModalVerVisitaAbierto(true);
};

  const iniciarEdicionVisita = (visita) => {
  setEditandoVisitaId(visita.id);
  setModalVisitaAbierto(true);

  setFormVisita({
    nombreVisitante: visita.nombre_visitante || "",
    apellidoVisitante: visita.apellido_visitante || "",
    tipoDocumento: visita.tipo_documento || "",
    numeroDocumento: visita.numero_documento || "",
    telefono: visita.telefono || "",
    esMenorEdad:
  visita.es_menor_edad === true ||
  String(visita.tipo_documento || "").toLowerCase() === "ti",
    nombreAcudiente:
      visita.nombre_acudiente === "No aplica" ? "" : visita.nombre_acudiente || "",
    telefonoAcudiente:
      visita.telefono_acudiente === "No aplica" ? "" : visita.telefono_acudiente || "",
    cursoInteres: visita.curso_interes || "",
    fecha: visita.fecha || "",
    hora: visita.hora || "",
    responsable: visita.responsable || "",
    observaciones: visita.observaciones || "",
  });

  setVistaActiva("dashboard");

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};

  const crearVisita = async (e) => {
    e.preventDefault();

    const nombreVisitante = limpiarTexto(formVisita.nombreVisitante);
const apellidoVisitante = limpiarTexto(formVisita.apellidoVisitante);
const tipoDocumento = limpiarTexto(formVisita.tipoDocumento);
const numeroDocumento = limpiarTexto(formVisita.numeroDocumento);
const telefono = limpiarTelefono(formVisita.telefono);
const nombreAcudiente = limpiarTexto(formVisita.nombreAcudiente);
const telefonoAcudiente = limpiarTelefono(formVisita.telefonoAcudiente);

if (
  !nombreVisitante ||
  !apellidoVisitante ||
  !tipoDocumento ||
  !numeroDocumento ||
  !telefono ||
  !formVisita.cursoInteres ||
  !formVisita.fecha ||
  !formVisita.hora ||
  !limpiarTexto(formVisita.responsable) ||
  !limpiarTexto(formVisita.observaciones)
) {
  mostrarAlerta(
    "warning",
    "Completa todos los campos de la visita, incluyendo responsable y observaciones."

  );
  return;
}

if (formVisita.esMenorEdad && (!nombreAcudiente || !telefonoAcudiente)) {
  mostrarAlerta(
    "warning",
    "Para menores de edad debes completar acudiente y teléfono del acudiente."
  );
  return;
}

    setGuardandoVisita(true);

    try {
      const payload = {
  id: crearIdSeguro(),

  nombre_visitante: nombreVisitante,
  apellido_visitante: apellidoVisitante,

  tipo_documento: tipoDocumento,
  numero_documento: numeroDocumento,

  telefono,

  es_menor_edad: Boolean(formVisita.esMenorEdad),
  nombre_acudiente: formVisita.esMenorEdad ? nombreAcudiente : "No aplica",
telefono_acudiente: formVisita.esMenorEdad ? telefonoAcudiente : "No aplica",

  curso_interes: limpiarTexto(formVisita.cursoInteres),
        fecha: formVisita.fecha,
        hora: formVisita.hora,
        responsable: limpiarTexto(formVisita.responsable) || usuario?.nombre || usuario?.email || "Coordinador académico",
observaciones: limpiarTexto(formVisita.observaciones) || "Sin observaciones",
        estado: "agendada",
        coordinador_id: usuario?.id || null,
        coordinador_nombre: usuario?.nombre || usuario?.email || "Coordinador",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data: visitaCreada, error } = await supabase
      .from("visitas")
      .insert([payload])
      .select()
      .single();

      if (error) {
        console.error("Error creando visita:", error);
        mostrarAlerta("error", error.message || "No se pudo programar la visita.");
        return;
      }

      setFormVisita(formVisitaInicial);
      if (visitaCreada) {
  setVisitas((prev) => [visitaCreada, ...prev]);
}
      setRefresh((prev) => prev + 1);
      mostrarAlerta("success", "Visita programada correctamente.");
    } catch (error) {
      console.error("Error inesperado creando visita:", error);
      mostrarAlerta("error", "Error inesperado programando la visita.");
    } finally {
      setGuardandoVisita(false);
    }
  };

  const guardarEdicionVisita = async (e) => {
  e.preventDefault();

  if (!editandoVisitaId) return;

  const nombreVisitante = limpiarTexto(formVisita.nombreVisitante);
  const apellidoVisitante = limpiarTexto(formVisita.apellidoVisitante);
  const tipoDocumento = limpiarTexto(formVisita.tipoDocumento);
  const numeroDocumento = limpiarTexto(formVisita.numeroDocumento);
  const telefono = limpiarTelefono(formVisita.telefono);
  const nombreAcudiente = limpiarTexto(formVisita.nombreAcudiente);
  const telefonoAcudiente = limpiarTelefono(formVisita.telefonoAcudiente);

  if (
    !nombreVisitante ||
    !apellidoVisitante ||
    !tipoDocumento ||
    !numeroDocumento ||
    !telefono ||
    !formVisita.cursoInteres ||
    !formVisita.fecha ||
    !formVisita.hora ||
    !limpiarTexto(formVisita.responsable) ||
    !limpiarTexto(formVisita.observaciones)
  ) {
    mostrarAlerta(
      "warning",
      "Completa todos los campos de la visita antes de guardar cambios."
    );
    return;
  }

  if (formVisita.esMenorEdad && (!nombreAcudiente || !telefonoAcudiente)) {
    mostrarAlerta(
      "warning",
      "Para menores de edad debes completar acudiente y teléfono del acudiente."
    );
    return;
  }

  setGuardandoVisita(true);

  try {
    const payload = {
      nombre_visitante: nombreVisitante,
      apellido_visitante: apellidoVisitante,
      tipo_documento: tipoDocumento,
      numero_documento: numeroDocumento,
      telefono,
      es_menor_edad: Boolean(formVisita.esMenorEdad),
      nombre_acudiente: formVisita.esMenorEdad ? nombreAcudiente : "No aplica",
      telefono_acudiente: formVisita.esMenorEdad ? telefonoAcudiente : "No aplica",
      curso_interes: limpiarTexto(formVisita.cursoInteres),
      fecha: formVisita.fecha,
      hora: formVisita.hora,
      responsable: limpiarTexto(formVisita.responsable),
      observaciones: limpiarTexto(formVisita.observaciones),
      estado: "reprogramada",
      updated_at: new Date().toISOString(),
    };

    const { data: visitaActualizada, error } = await supabase
      .from("visitas")
      .update(payload)
      .eq("id", editandoVisitaId)
      .select()
      .single();

    if (error) {
      console.error("Error actualizando visita:", error);
      mostrarAlerta("error", error.message || "No se pudo actualizar la visita.");
      return;
    }

    setVisitas((prev) =>
      prev.map((visita) =>
        String(visita.id) === String(editandoVisitaId)
          ? visitaActualizada
          : visita
      )
    );

    setEditandoVisitaId(null);
setModalVisitaAbierto(false);

    setFormVisita(formVisitaInicial);
    setRefresh((prev) => prev + 1);
    mostrarAlerta("success", "Visita actualizada correctamente.");
  } catch (error) {
    console.error("Error inesperado actualizando visita:", error);
    mostrarAlerta("error", "Error inesperado actualizando la visita.");
  } finally {
    setGuardandoVisita(false);
  }
};

  const cancelarVisita = async (visitaId) => {
  const confirmar = window.confirm(
    "¿Seguro que deseas cancelar esta visita?"
  );

  if (!confirmar) return;

  try {
    const { data: visitaActualizada, error } = await supabase
      .from("visitas")
      .update({
        estado: "cancelada",
        updated_at: new Date().toISOString(),
      })
      .eq("id", visitaId)
      .select()
      .single();

    if (error) {
      console.error("Error cancelando visita:", error);

      mostrarAlerta(
        "error",
        "No se pudo cancelar la visita."
      );

      return;
    }

    setVisitas((prev) =>
      prev.map((visita) =>
        String(visita.id) === String(visitaId)
          ? visitaActualizada
          : visita
      )
    );

    setRefresh((prev) => prev + 1);

    mostrarAlerta(
      "success",
      "Visita cancelada correctamente."
    );
  } catch (error) {
    console.error("Error inesperado cancelando visita:", error);

    mostrarAlerta(
      "error",
      "Error inesperado cancelando la visita."
    );
  }
};

const cerrarModalVerVisita = () => {
  setModalVerVisitaAbierto(false);
  setVisitaSeleccionada(null);
};

const cerrarModalVisita = () => {
  setModalVisitaAbierto(false);

  setEditandoVisitaId(null);

  setFormVisita(formVisitaInicial);
};

const crearClaseGratis = async (e) => {
  e.preventDefault();

  const nombre = limpiarTexto(formClaseGratis.nombre);
  const telefono = limpiarTelefono(formClaseGratis.telefono);
  const curso = limpiarTexto(formClaseGratis.curso);
  const profesorId = limpiarTexto(formClaseGratis.profesorId);
  const fecha = limpiarTexto(formClaseGratis.fecha);
  const hora = limpiarTexto(formClaseGratis.hora);
  const duracionMinutos = Number(formClaseGratis.duracionMinutos || 60);
  const horaFin = calcularHoraFinMinutos(hora, duracionMinutos);
  const observaciones = limpiarTexto(formClaseGratis.observaciones);

  if (!nombre) {
    mostrarAlerta("warning", "El nombre del interesado es obligatorio.");
    return;
  }

  if (!telefono || telefono.length < 7) {
    mostrarAlerta("warning", "Ingresa un teléfono válido.");
    return;
  }

  if (!curso) {
    mostrarAlerta("warning", "Selecciona el curso de interés.");
    return;
  }

  if (!profesorId) {
    mostrarAlerta("warning", "Selecciona el profesor asignado.");
    return;
  }

  if (!fecha) {
    mostrarAlerta("warning", "Selecciona la fecha de la clase gratis.");
    return;
  }

  if (!hora) {
    mostrarAlerta("warning", "Selecciona la hora de la clase gratis.");
    return;
  }

  if (!duracionMinutos || duracionMinutos < 15) {
    mostrarAlerta("warning", "La duración mínima debe ser de 15 minutos.");
    return;
  }

  const profesor = profesoresPorId.get(String(profesorId));

const payload = {
  id: crearIdSeguro(),
  nombre,
  telefono,
  curso,
  profesor_id: profesorId,
  profesor_nombre: profesor?.nombre || "Profesor asignado",
  fecha,
  hora,
  hora_fin: horaFin || null,
  duracion_minutos: duracionMinutos,
  estado: "programada",
  observaciones,

  coordinador_id: usuario?.id || null,
  coordinador_nombre: usuario?.nombre || usuario?.email || "Coordinador",

  creado_por: usuario?.id || null,
  creado_por_nombre: usuario?.nombre || usuario?.email || "Coordinador",
};

  setGuardandoClaseGratis(true);

  try {
    const { data, error } = await supabase
  .from("clases_gratis")
  .insert([payload])
  .select()
  .single();

  if (error) {
  console.error("Error creando clase gratis completo:", JSON.stringify(error, null, 2));

  mostrarAlerta(
    "error",
    error.message || error.details || "No se pudo programar la clase gratis."
  );

  return;
}

    mostrarAlerta("success", "Clase gratis programada correctamente.");

    setFormClaseGratis(formClaseGratisInicial);
    setRefresh((prev) => prev + 1);
  } catch (error) {
    console.error("Error inesperado creando clase gratis:", error);
    mostrarAlerta("error", "Ocurrió un error inesperado.");
  } finally {
    setGuardandoClaseGratis(false);
  }
};


  const actualizarEstadoClase = async (claseId, estado) => {
  const claseAnterior = clases.find(
    (clase) => String(clase.id) === String(claseId)
  );

  try {
    const { data: claseActualizada, error } = await supabase
      .from("clases")
      .update({
        estado,
        updated_at: new Date().toISOString(),
      })
      .eq("id", claseId)
      .select()
      .single();

    if (error) {
      console.error("Error actualizando estado de clase:", error);
      mostrarAlerta("error", "No se pudo actualizar la clase.");
      return;
    }

    await registrarAuditoriaClase({
      claseId,
      accion: estado === "pausada" ? "pausar_clase" : "cancelar_clase",
      descripcion: `El coordinador cambió el estado de la clase a ${estado}`,
      estadoAnterior: claseAnterior?.estado || null,
      estadoNuevo: estado,
      alumno: {
        id: claseActualizada?.alumno_db_id || claseActualizada?.alumno_id,
        nombre: claseActualizada?.alumno_nombre,
      },
      profesor: {
        id: claseActualizada?.profesor_db_id || claseActualizada?.profesor_id,
        nombre: claseActualizada?.profesor_nombre,
      },
      coordinador: usuario,
      datos: {
        antes: claseAnterior || null,
        despues: claseActualizada,
      },
    });

    setRefresh((prev) => prev + 1);
    mostrarAlerta("success", `Clase marcada como ${estado}.`);
  } catch (error) {
    console.error("Error inesperado actualizando clase:", error);
    mostrarAlerta("error", "Error inesperado actualizando la clase.");
  }
};
 
const eliminarClase = async (claseId) => {
  const confirmar = window.confirm("¿Seguro que deseas eliminar esta clase?");
  if (!confirmar) return;

  const claseAnterior = clases.find(
    (clase) => String(clase.id) === String(claseId)
  );

  try {
    await registrarAuditoriaClase({
      claseId,
      accion: "eliminar_clase",
      descripcion: "El coordinador eliminó una clase",
      estadoAnterior: claseAnterior?.estado || null,
      estadoNuevo: "eliminada",
      alumno: {
        id: claseAnterior?.alumno_db_id || claseAnterior?.alumno_id,
        nombre: claseAnterior?.alumno_nombre,
      },
      profesor: {
        id: claseAnterior?.profesor_db_id || claseAnterior?.profesor_id,
        nombre: claseAnterior?.profesor_nombre,
      },
      coordinador: usuario,
      datos: {
        clase_eliminada: claseAnterior || null,
      },
    });

    const { error } = await supabase
      .from("clases")
      .delete()
      .eq("id", claseId);

    if (error) {
      console.error("Error eliminando clase:", error);
      mostrarAlerta("error", "No se pudo eliminar la clase.");
      return;
    }

    setClaseSeleccionada(null);
    setRefresh((prev) => prev + 1);
    mostrarAlerta("success", "Clase eliminada correctamente.");
  } catch (error) {
    console.error("Error inesperado eliminando clase:", error);
    mostrarAlerta("error", "Error inesperado eliminando la clase.");
  }
};

const abrirDetalleClase = (clase) => {
  setClaseSeleccionada(clase);
  setAlumnoExtraId("");
};

const cerrarDetalleClase = () => {
  setClaseSeleccionada(null);
  setAlumnoExtraId("");
};

const agregarAlumnoExtraAClase = async () => {
  if (!claseSeleccionada || !alumnoExtraId) {
    mostrarAlerta("warning", "Selecciona un alumno para agregarlo a la clase.");
    return;
  }

  const alumno = alumnosPorId.get(String(alumnoExtraId));

  if (!alumno) {
    mostrarAlerta("error", "No se encontró el alumno seleccionado.");
    return;
  }


  const alumnoExtra = {
    id: alumno.id || alumno.alumno_id,
    alumno_id: alumno.alumno_id || alumno.id,
    nombre: alumno.nombre || "",
    telefono: alumno.telefono || "",
    estadoPago: "Al día",
    asistio: false,
    sumaHoras: false,
    horasManual: 0,
    calificacion: null,
    observacion: "",
    agregadoExtra: true,
    agregadoEn: new Date().toISOString(),
  };

  const alumnosActuales = Array.isArray(claseSeleccionada.alumnos)
    ? claseSeleccionada.alumnos
    : [];

  const yaExiste = alumnosActuales.some(
    (item) => String(item.id) === String(alumnoExtra.id)
  );

  if (yaExiste) {
    mostrarAlerta("warning", "Ese alumno ya está agregado a esta clase.");
    return;
  }

  const alumnosActualizados = [...alumnosActuales, alumnoExtra];

  try {
    const { data: claseActualizadaSupabase, error } = await supabase
  .from("clases")
  .update({
    alumnos: alumnosActualizados,
    updated_at: new Date().toISOString(),
  })
  .eq("id", claseSeleccionada.id)
  .select()
  .single();

if (error) {
  console.error("Error agregando alumno extra:", error);
  mostrarAlerta("error", "No se pudo agregar el alumno extra.");
  return;
}

await registrarAuditoriaClase({
  claseId: claseSeleccionada.id,
  accion: "agregar_alumno_extra",
  descripcion: "El coordinador agregó un alumno extra a la clase",
  estadoAnterior: claseSeleccionada?.estado || null,
  estadoNuevo: claseActualizadaSupabase?.estado || claseSeleccionada?.estado || null,
  alumno,
  profesor: {
    id: claseSeleccionada?.profesor_db_id || claseSeleccionada?.profesor_id,
    nombre: claseSeleccionada?.profesor_nombre,
  },
  coordinador: usuario,
  datos: {
    alumno_extra: alumnoExtra,
    antes: claseSeleccionada,
    despues: claseActualizadaSupabase,
  },
});

    const claseActualizada = {
      ...claseSeleccionada,
      alumnos: alumnosActualizados,
      updated_at: new Date().toISOString(),
    };

    setClaseSeleccionada(claseActualizada);
    setAlumnoExtraId("");
    setRefresh((prev) => prev + 1);
    mostrarAlerta("success", "Alumno extra agregado correctamente.");
  } catch (error) {
    console.error("Error inesperado agregando alumno extra:", error);
    mostrarAlerta("error", "Error inesperado agregando el alumno extra.");
  }
};


const iniciarEdicionClase = (clase) => {
  setVistaActiva("dashboard");
  setEditandoClaseId(clase.id);
  setClaseSeleccionada(null);

  
   setFormClase({
  alumnoId: clase.alumno_db_id || clase.alumno_id || "",
  profesorId: clase.profesor_db_id || clase.profesor_id || "",
  curso: clase.curso || "",
  tema: clase.tema || "",
  fecha: clase.fecha || "",
    hora: clase.hora || clase.hora_inicio || "",
    horaFin: clase.hora_fin || "",
    duracionClase: clase.duracion_horas || 2,
    modalidad: clase.modalidad || "regular",
    formatoClase: clase.formato_clase || "presencial",
    observaciones: clase.observaciones || "",
  });

  const alumnosEdicion =
  Array.isArray(clase.alumnos) && clase.alumnos.length > 0
    ? clase.alumnos
    : [
        {
          id: clase.alumno_db_id || clase.alumno_id,
          alumno_id: clase.alumno_id || clase.alumno_db_id,
          nombre: clase.alumno_nombre || "Alumno principal",
          telefono: "",
          estadoPago: "Sin validar",
          asistio: false,
          sumaHoras: false,
          horasManual: 0,
          calificacion: null,
          observacion: "",
          tipo: "principal",
          agregadoExtra: false,
          agregadoEn: new Date().toISOString(),
        },
      ];

setAlumnosClaseSeleccionados(
  alumnosEdicion.map((alumno, index) => ({
    ...alumno,
    tipo: index === 0 ? "principal" : "extra",
    agregadoExtra: index > 0,
  }))
);

  setVistaActiva("dashboard");

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
};

const guardarEdicionClase = async (e) => {
  e.preventDefault();

  if (!editandoClaseId) return;

const claseAnterior = clases.find(
  (clase) => String(clase.id) === String(editandoClaseId)
);

const alumno = alumnosPorId.get(String(formClase.alumnoId)) || null;

const profesor = profesoresPorId.get(String(formClase.profesorId)) || null;

  if (!formClase.tema || !limpiarTexto(formClase.tema)) {
      mostrarAlerta("warning", "El tema de la clase es obligatorio.");
      return;
    }

    setGuardandoClase(true);

  const alumnosActualizadosEdicion =
  alumnosClaseSeleccionados.length > 0
    ? alumnosClaseSeleccionados.map((alumno, index) => ({
        ...alumno,
        tipo: index === 0 ? "principal" : "extra",
        agregadoExtra: index > 0,
      }))
    : claseAnterior?.alumnos || [];

const alumnoPrincipalEditado = alumnosActualizadosEdicion[0] || {
  id: claseAnterior?.alumno_db_id || claseAnterior?.alumno_id,
  alumno_id: claseAnterior?.alumno_id || claseAnterior?.alumno_db_id,
  nombre: claseAnterior?.alumno_nombre || "",
};

  try {
    const payload = {
  alumno_id:
  alumnoPrincipalEditado?.alumno_id ||
  alumnoPrincipalEditado?.id ||
  claseAnterior?.alumno_id,

alumno_db_id:
  alumnoPrincipalEditado?.id ||
  claseAnterior?.alumno_db_id ||
  null,

alumno_nombre:
  alumnoPrincipalEditado?.nombre ||
  claseAnterior?.alumno_nombre ||
  "",

alumnos: alumnosActualizadosEdicion,

  profesor_id:
    profesor?.profesor_id ||
    profesor?.id ||
    claseAnterior?.profesor_id,

  profesor_db_id:
    profesor?.id ||
    claseAnterior?.profesor_db_id ||
    null,

  profesor_nombre:
    profesor?.nombre ||
    claseAnterior?.profesor_nombre ||
    "",

  curso: limpiarTexto(
  formClase.curso || claseAnterior?.curso || ""
),

tema: limpiarTexto(
  formClase.tema || claseAnterior?.tema || ""
),

fecha:
  formClase.fecha || claseAnterior?.fecha,

  hora:
    formClase.hora ||
    claseAnterior?.hora ||
    claseAnterior?.hora_inicio,

  hora_fin:
    formClase.horaFin ||
    claseAnterior?.hora_fin,

  duracion_horas: Number(
    formClase.duracionClase ||
    claseAnterior?.duracion_horas ||
    2
  ),

  modalidad:
    formClase.modalidad ||
    claseAnterior?.modalidad ||
    "regular",

  formato_clase:
    formClase.formatoClase ||
    claseAnterior?.formato_clase ||
    "presencial",

  observaciones: limpiarTexto(
    formClase.observaciones ||
    claseAnterior?.observaciones ||
    ""
  ),

  estado: "reprogramada",

  updated_at: new Date().toISOString(),
};

const { error: updateError, count } = await supabase
  .from("clases")
  .update(payload, { count: "exact" })
  .eq("id", editandoClaseId);

if (updateError) {
  console.error("Error editando clase:", updateError);
  mostrarAlerta("error", "No se pudo guardar la edición.");
  return;
}

if (count === 0) {
  console.error("Supabase no actualizó ninguna fila en clases.", {
    editandoClaseId,
    payload,
    claseAnterior,
  });

  mostrarAlerta(
    "error",
    "Supabase no actualizó la clase. Revisa la política UPDATE de la tabla clases."
  );
  return;
}

const claseActualizada = {
  ...(claseAnterior || {}),
  ...payload,
  id: editandoClaseId,
};


await registrarAuditoriaClase({
  claseId: editandoClaseId,
  accion: "editar_clase",
  descripcion: "El coordinador editó o reprogramó una clase",
  estadoAnterior: claseAnterior?.estado || null,
  estadoNuevo: claseActualizada?.estado || "reprogramada",
  alumno,
  profesor,
  coordinador: usuario,
  datos: {
    antes: claseAnterior || null,
    despues: claseActualizada || payload,
  },
});



    setEditandoClaseId(null);
setFormClase(formClaseInicial);
setAlumnosClaseSeleccionados([]);
setAlumnoExtraId("");
setClaseSeleccionada(null);

setClases((prev) =>
  prev.map((clase) =>
    String(clase.id) === String(editandoClaseId)
      ? claseActualizada
      : clase
  )
);

setRefresh((prev) => prev + 1);
mostrarAlerta("success", "Clase actualizada correctamente.");
  } catch (error) {
    console.error("Error inesperado editando clase:", error);
    mostrarAlerta("error", "Error inesperado editando la clase.");
  } finally {
    setGuardandoClase(false);
  }
};

const cancelarEdicionClase = () => {
  setEditandoClaseId(null);
  setFormClase(formClaseInicial);
};

const cancelarClase = async (claseId) => {
  const confirmar = window.confirm("¿Estás seguro de que deseas cancelar esta clase? Los alumnos serán notificados si están sincronizados.");
  if (!confirmar) return;

  try {
    const { data: claseCancelada, error } = await supabase
      .from("clases")
      .update({ estado: "cancelada", updated_at: new Date().toISOString() })
      .eq("id", claseId)
      .select()
      .single();

    if (error) throw error;

    await registrarAuditoriaClase({
      claseId: claseId,
      accion: "cancelar_clase",
      descripcion: "El coordinador canceló la clase",
      estadoNuevo: "cancelada",
      coordinador: usuario,
    });

    setClases((prev) => prev.map((c) => (c.id === claseId ? claseCancelada : c)));
    setRefresh((prev) => prev + 1);
    mostrarAlerta("success", "La clase ha sido cancelada exitosamente.");
  } catch (error) {
    console.error("Error cancelando clase:", error);
    mostrarAlerta("error", "No se pudo cancelar la clase.");
  }
};

const registrarAuditoriaClase = async ({
  claseId = null,
  accion,
  descripcion = "",
  estadoAnterior = null,
  estadoNuevo = null,
  alumno = null,
  profesor = null,
  coordinador = null,
  datos = {},
}) => {
  try {
    const { error } = await supabase.from("auditoria_clases").insert([
      {
        clase_id: claseId ? String(claseId) : null,
        accion,
        descripcion,
        estado_anterior: estadoAnterior,
        estado_nuevo: estadoNuevo,

       alumno_id: alumno?.id || alumno?.alumno_id ? String(alumno.id || alumno.alumno_id) : null,
alumno_nombre: alumno?.nombre || alumno?.name || alumno?.alumno_nombre || null,

profesor_id: profesor?.id || profesor?.profesor_id ? String(profesor.id || profesor.profesor_id) : null,
profesor_nombre: profesor?.nombre || profesor?.name || profesor?.profesor_nombre || null,

        coordinador_id: coordinador?.id ? String(coordinador.id) : null,
        coordinador_nombre: coordinador?.nombre || coordinador?.name || null,

        datos,
      },
    ]);

    if (error) {
      console.error("Error registrando auditoría:", error);
    }
  } catch (err) {
    console.error("Error inesperado registrando auditoría:", err);
  }
};

const claseSeleccionadaSegura = claseSeleccionada || {
  alumnos: [],
};


  return (
    <div className="dashboard-layout">
      <Sidebar onLogout={handleLogout} />

      <main className="dashboard-main coordinador-page">
        <header className="coordinador-topbar">
          <div>
            <p className="coordinador-kicker">Sesión académica</p>
         <h1>
  {vistaActiva === "dashboard" && "Coordinador académico"}
  {vistaActiva === "comisiones" && "Comisiones del coordinador"}
  {vistaActiva === "pagos" && "Pagos al coordinador"}
  {vistaActiva === "clases" && "Clases programadas"}
  {vistaActiva === "visitas" && "Visitas programadas"}
</h1>
            <span>
              {vistaActiva === "dashboard" &&
              "Programa clases, visitas y clases gratis desde una vista limpia."}
            {vistaActiva === "comisiones" &&
              "Consulta métricas de comisiones por día, semana, mes, año y leads pagados."}
            {vistaActiva === "pagos" &&
              "Consulta pagos recibidos, abonos, método, estado y descripción del pago."}
                      {vistaActiva === "clases" &&
              "Administra clases, profesores, alumnos, estado académico, asistencias y progreso."}

            {vistaActiva === "visitas" &&
            "Consulta visitas programadas, responsables, datos del visitante y seguimiento por WhatsApp."}
            </span>
          </div>

        <div className="coordinador-topbar-actions">
  {vistaActiva !== "dashboard" && (
    <button
      type="button"
      className="coordinador-secondary-btn"
      onClick={() => setVistaActiva("dashboard")}
    >
      ← Volver al panel
    </button>
  )}

  <button
    type="button"
    className="coordinador-primary-btn"
    onClick={() => setRefresh((prev) => prev + 1)}
    disabled={loading}
  >
    {loading ? "Cargando..." : "Actualizar"}
  </button>
</div>
        </header>

        {alerta.visible && (
          <div className={`coordinador-alert coordinador-alert-${alerta.tipo}`}>
            {alerta.mensaje}
          </div>
        )}

        <section className="coordinador-kpi-grid">
          <article className="coordinador-kpi-card">
            <small>Clases programadas</small>
            <strong>{resumen.clasesProgramadas}</strong>
          </article>

          <article className="coordinador-kpi-card">
            <small>Clases gratis</small>
            <strong>{resumen.clasesGratis}</strong>
          </article>

          <article className="coordinador-kpi-card">
            <small>Visitas agendadas</small>
            <strong>{resumen.visitasAgendadas}</strong>
          </article>

          <article className="coordinador-kpi-card">
            <small>Alumnos al día</small>
            <strong>{resumen.alumnosAlDia}</strong>
          </article>

          <article className="coordinador-kpi-card danger">
            <small>Alumnos en mora</small>
            <strong>{resumen.alumnosMora}</strong>
          </article>

          <article className="coordinador-kpi-card highlight">
            <small>Comisiones generadas</small>
            <strong>{formatearPesos(resumen.comisionesGeneradas)}</strong>
          </article>

          <article className="coordinador-kpi-card highlight-cyan">
            <small>Pagos recibidos</small>
            <strong>{formatearPesos(resumen.pagosRecibidos)}</strong>
          </article>
        </section>

        {vistaActiva === "dashboard" && (
  <section className="coordinador-shortcuts">
    <button
      type="button"
      className="coordinador-shortcut-card"
      onClick={() => setVistaActiva("comisiones")}
    >
      <small>Finanzas</small>
      <strong>Comisiones</strong>
      <span>Ver métricas del día, semana, mes, año y leads pagados.</span>
    </button>

    <button
      type="button"
      className="coordinador-shortcut-card cyan"
      onClick={() => setVistaActiva("pagos")}
    >
      <small>Pagos</small>
      <strong>Pagos al coordinador</strong>
      <span>Ver pagos, abonos, método, estado y descripción.</span>
    </button>

<button
  type="button"
  className="coordinador-shortcut-card blue"
  onClick={() => setVistaActiva("clases")}
>
  <small>Agenda académica</small>
  <strong>Clases programadas</strong>
  <span>Ver, modificar, pausar, cancelar, eliminar o agregar alumnos extra.</span>
</button>

<button
  type="button"
  className="coordinador-shortcut-card cyan"
  onClick={() => setVistaActiva("visitas")}
>
  <small>Seguimiento comercial</small>
  <strong>Visitas programadas</strong>
  <span>Ver visitas, responsables y enviar recordatorios por WhatsApp.</span>
</button>

  </section>
)}

        {vistaActiva === "dashboard" && (
  <section className="coordinador-grid">
          <article className="coordinador-card clases-card">
            <div className="coordinador-card-head">
              <div>
                <h2>Gestión de clases</h2>
                <p>Valida pagos antes de programar una clase regular.</p>
              </div>
            </div>

          <form
  className="coordinador-form"
  onSubmit={editandoClaseId ? guardarEdicionClase : crearClase}
>
              <div className="coordinador-field full">
  <label>Alumno</label>

  <div className="coordinador-alumno-selector">
    <select
      name="alumnoId"
      value={formClase.alumnoId}
      onChange={handleClaseChange}
    >
      <option value="">Seleccionar alumno</option>
      {alumnos.map((alumno) => (
        <option
          key={alumno.id || alumno.alumno_id}
          value={alumno.id || alumno.alumno_id}
        >
          {alumno.nombre} — {alumno.curso_nombre || alumno.curso_id || "Sin curso"}
        </option>
      ))}
    </select>

    <button
      type="button"
      className="coordinador-secondary-btn"
      onClick={agregarAlumnoAClaseTemporal}
    >
      Agregar alumno
    </button>
  </div>

  {alumnosClaseSeleccionados.length > 0 && (
    <div className="coordinador-alumnos-temporales">
      {alumnosClaseSeleccionados.map((alumno) => (
        <div key={alumno.id || alumno.alumno_id} className="coordinador-alumno-temporal">
          <span>
            <strong>{alumno.nombre}</strong> ·{" "}
            {alumno.tipo === "principal" ? "Principal" : "Extra"}
          </span>

          <button
            type="button"
            onClick={() => quitarAlumnoDeClaseTemporal(alumno.id || alumno.alumno_id)}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )}
</div>

              <div className="coordinador-field">
                <label>Profesor</label>
                <select name="profesorId" value={formClase.profesorId} onChange={handleClaseChange}>
                  <option value="">Seleccionar profesor</option>
                  {profesores.map((profesor) => (
                    <option key={profesor.id || profesor.profesor_id} value={profesor.id || profesor.profesor_id}>
                      {profesor.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="coordinador-field">
                <label>Curso</label>
                <select name="curso" value={formClase.curso} onChange={handleClaseChange}>
                  <option value="">Seleccionar curso</option>
                  {CURSOS.map((curso) => (
                    <option key={curso} value={curso}>
                      {curso}
                    </option>
                  ))}
                </select>
              </div>

              <div className="coordinador-field full">
  <label>Tema de la clase *</label>
  <input
    type="text"
    name="tema"
    value={formClase.tema}
    onChange={handleClaseChange}
    placeholder="Ej: Ecualización, mezcla básica, acordes mayores..."
    required
  />
</div>

             <div className="coordinador-field mobile-half">
  <label>Fecha</label>
  <input type="date" name="fecha" value={formClase.fecha} onChange={handleClaseChange} />
</div>

<div className="coordinador-field mobile-half">
  <label>Hora</label>
  <input type="time" name="hora" value={formClase.hora} 
  onChange={handleClaseChange} />
</div>

<div className="coordinador-field">
  <label>Duración de la clase</label>

  <select
    name="duracionClase"
    value={formClase.duracionClase}
    onChange={handleClaseChange}
  >
    {DURACIONES_CLASE.map((hora) => (
      <option key={hora} value={hora}>
        {hora} hora{hora > 1 ? "s" : ""}
      </option>
    ))}
  </select>
</div>

<div className="coordinador-field">
  <label>Hora final</label>

  <input
    type="time"
    value={formClase.horaFin}
    readOnly
  />
</div>



              <div className="coordinador-field mobile-half">
  <label>Modalidad</label>
  <select name="modalidad" value={formClase.modalidad} onChange={handleClaseChange}>
                  {MODALIDADES.map((modalidad) => (
                    <option key={modalidad} value={modalidad}>
                      {modalidad}
                    </option>
                  ))}
                </select>
              </div>

             <div className="coordinador-field mobile-half">
  <label>Formato de clase</label>
  <select name="formatoClase" value={formClase.formatoClase} onChange={handleClaseChange}>
                  {FORMATOS_CLASE.map((formato) => (
                    <option key={formato} value={formato}>
                      {formato}
                    </option>
                  ))}
                </select>
              </div>

                 <div className="coordinador-field full">
  <label>Observaciones</label>
  <textarea
    name="observaciones"
    value={formClase.observaciones}
    onChange={handleClaseChange}
    placeholder="Notas internas de la clase"
  />
</div> 

              <div className="coordinador-actions full">
              <button type="submit" className="coordinador-primary-btn" disabled={guardandoClase}>
  {guardandoClase
    ? editandoClaseId
      ? "Guardando..."
      : "Validando..."
    : editandoClaseId
    ? "Guardar cambios"
    : "Guardar clase"}
</button>

{editandoClaseId && (
  <button
    type="button"
    className="coordinador-secondary-btn"
    onClick={cancelarEdicionClase}
  >
    Cancelar edición
  </button>
)}
              </div>
            </form>
          </article>

        <article className="coordinador-card visitas-card">
  <div className="coordinador-card-head">
    <div>
      <h2>Programar visitas</h2>
      <p>Agenda visitas comerciales o académicas.</p>
    </div>
  </div>

  <form
  className="coordinador-form"
  onSubmit={editandoVisitaId ? guardarEdicionVisita : crearVisita}
>
    <div className="coordinador-field">
      <label>Nombre visitante</label>
      <input
        name="nombreVisitante"
        value={formVisita.nombreVisitante}
        onChange={handleVisitaChange}
      />
    </div>

    <div className="coordinador-field">
      <label>Apellido visitante</label>
      <input
        name="apellidoVisitante"
        value={formVisita.apellidoVisitante}
        onChange={handleVisitaChange}
      />
    </div>

    <div className="coordinador-field">
      <label>Tipo documento</label>
      <select
        name="tipoDocumento"
        value={formVisita.tipoDocumento}
        onChange={handleVisitaChange}
      >
        <option value="">Seleccionar</option>
        <option value="cc">Cédula</option>
        <option value="ti">Tarjeta identidad</option>
        <option value="ce">Cédula extranjería</option>
        <option value="pasaporte">Pasaporte</option>
      </select>
    </div>

    <div className="coordinador-field">
      <label>Número documento</label>
      <input
        name="numeroDocumento"
        value={formVisita.numeroDocumento}
        onChange={handleVisitaChange}
      />
    </div>

    <div className="coordinador-field">
      <label>Teléfono alumno</label>
      <input
        name="telefono"
        value={formVisita.telefono}
        onChange={handleVisitaChange}
      />
    </div>

    <div className="coordinador-field">
      <label>Curso de interés</label>
      <select
        name="cursoInteres"
        value={formVisita.cursoInteres}
        onChange={handleVisitaChange}
      >
        <option value="">Seleccionar curso</option>
        {CURSOS.map((curso) => (
          <option key={curso} value={curso}>
            {curso}
          </option>
        ))}
      </select>
    </div>

    {formVisita.esMenorEdad && (
      <>
        <div className="coordinador-field">
          <label>Nombre acudiente</label>
          <input
            name="nombreAcudiente"
            value={formVisita.nombreAcudiente}
            onChange={handleVisitaChange}
          />
        </div>

        <div className="coordinador-field">
          <label>Teléfono acudiente</label>
          <input
            name="telefonoAcudiente"
            value={formVisita.telefonoAcudiente}
            onChange={handleVisitaChange}
          />
        </div>
      </>
    )}

    <div className="coordinador-field mobile-half">
      <label>Fecha</label>
      <input
        type="date"
        name="fecha"
        value={formVisita.fecha}
        onChange={handleVisitaChange}
      />
    </div>

    <div className="coordinador-field mobile-half">
      <label>Hora</label>
      <input
        type="time"
        name="hora"
        value={formVisita.hora}
        onChange={handleVisitaChange}
      />
    </div>

    <div className="coordinador-field full">
      <label>Responsable</label>
      <input
        name="responsable"
        value={formVisita.responsable}
        onChange={handleVisitaChange}
        placeholder="Opcional"
      />
    </div>

    <div className="coordinador-field full observaciones-field">
      <label>Observaciones</label>
      <textarea
        name="observaciones"
        value={formVisita.observaciones}
        onChange={handleVisitaChange}
      />
    </div>

    <div className="coordinador-actions full">
      <button
  type="submit"
  className="coordinador-primary-btn"
  disabled={guardandoVisita}
>
  {guardandoVisita
    ? editandoVisitaId
      ? "Actualizando..."
      : "Guardando..."
    : editandoVisitaId
    ? "Guardar cambios"
    : "Guardar visita"}
</button>
    </div>
  </form>
</article>

          

          <article className="coordinador-card gratis-card">
            <div className="coordinador-card-head">
              <div>
                <h2>Programar clase gratis</h2>
                <p>Agenda clases de prueba para nuevos interesados.</p>
              </div>
            </div>

            <form className="coordinador-form" onSubmit={crearClaseGratis}>
              <div className="coordinador-field">
                <label>Nombre</label>
                <input name="nombre" value={formClaseGratis.nombre} onChange={handleClaseGratisChange} />
              </div>

              <div className="coordinador-field">
                <label>Teléfono</label>
                <input name="telefono" value={formClaseGratis.telefono} onChange={handleClaseGratisChange} />
              </div>

              <div className="coordinador-field">
                <label>Curso</label>
                <select name="curso" value={formClaseGratis.curso} onChange={handleClaseGratisChange}>
                  <option value="">Seleccionar curso</option>
                  {CURSOS.map((curso) => (
                    <option key={curso} value={curso}>
                      {curso}
                    </option>
                  ))}
                </select>
              </div>

              <div className="coordinador-field">
                <label>Profesor</label>
                <select name="profesorId" value={formClaseGratis.profesorId} onChange={handleClaseGratisChange}>
                  <option value="">Seleccionar profesor</option>
                  {profesores.map((profesor) => (
                    <option key={profesor.id || profesor.profesor_id} value={profesor.id || profesor.profesor_id}>
                      {profesor.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="coordinador-field">
                <label>Fecha</label>
                <input type="date" name="fecha" value={formClaseGratis.fecha} onChange={handleClaseGratisChange} />
              </div>

              <div className="coordinador-field">
                <label>Hora</label>
                <input type="time" name="hora" value={formClaseGratis.hora} onChange={handleClaseGratisChange} />
              </div>

              <div className="coordinador-field">
  <label>Duración</label>
  <select
    name="duracionMinutos"
    value={formClaseGratis.duracionMinutos}
    onChange={handleClaseGratisChange}
  >
    <option value={30}>30 minutos</option>
    <option value={45}>45 minutos</option>
    <option value={60}>1 hora</option>
    <option value={90}>1 hora 30 minutos</option>
    <option value={120}>2 horas</option>
  </select>
</div>

<div className="coordinador-field">
  <label>Hora fin</label>
  <input
    value={formClaseGratis.horaFin || ""}
    disabled
    placeholder="Automática"
  />
</div>

              <div className="coordinador-field full">
                <label>Observaciones</label>
                <textarea
                  name="observaciones"
                  value={formClaseGratis.observaciones}
                  onChange={handleClaseGratisChange}
                />
              </div>

              <div className="coordinador-actions full">
                <button type="submit" className="coordinador-primary-btn" disabled={guardandoClaseGratis}>
                  {guardandoClaseGratis ? "Guardando..." : "Guardar clase gratis"}
                </button>
              </div>
            </form>

            <div className="gratis-resumen-grid gratis-resumen-compacto">
  <article>
    <small>Total</small>
    <strong>{resumenClasesGratis.total}</strong>
  </article>

  <article>
    <small>Hoy</small>
    <strong>{resumenClasesGratis.hoy}</strong>
  </article>

  <article>
    <small>Programadas</small>
    <strong>{resumenClasesGratis.programadas}</strong>
  </article>

  <article>
    <small>En curso</small>
    <strong>{resumenClasesGratis.enCurso}</strong>
  </article>

  <article>
    <small>Finalizadas</small>
    <strong>{resumenClasesGratis.finalizadas}</strong>
  </article>
</div>

<div className="clases-gratis-panel-action">
  <button
    type="button"
    className="coordinador-secondary-btn clases-gratis-ver-btn"
    onClick={() => setModalClasesGratisAbierto(true)}
  >
    Ver clases gratis programadas
    <span>{resumenClasesGratis.total}</span>
  </button>
</div>
 


<div className="coordinador-table-wrap gratis-table-wrap">
  <table className="coordinador-table">
    <thead>
      <tr>
        <th>Interesado</th>
        <th>Curso</th>
        <th>Profesor</th>
        <th>Fecha</th>
        <th>Duración</th>
        <th>Estado</th>
      </tr>
    </thead>

    <tbody>
      {loading ? (
        <tr>
          <td colSpan="6" className="empty-cell">
            Cargando clases gratis...
          </td>
        </tr>
      ) : clasesGratisOrdenadas.length === 0 ? (
        <tr>
          <td colSpan="6" className="empty-cell">
            No hay clases gratis programadas.
          </td>
        </tr>
      ) : (
        clasesGratisOrdenadas.map((clase) => (
          <tr key={clase.id}>
            <td data-label="Interesado">
              <strong>{clase.nombre || "-"}</strong>
              <span>{clase.telefono || "-"}</span>
            </td>

            <td data-label="Curso">
              {clase.curso || "-"}
            </td>

            <td data-label="Profesor">
              {clase.profesor_nombre || "-"}
            </td>

            <td data-label="Fecha">
              <strong>{formatearFecha(clase.fecha)}</strong>
              <span>
                {clase.hora || "--:--"}
                {clase.hora_fin ? ` - ${clase.hora_fin}` : ""}
              </span>
            </td>

            <td data-label="Duración">
              {clase.duracion_minutos || 60} min
            </td>

            <td data-label="Estado">
              <span className={`status-pill status-${clase.estado || "programada"}`}>
                {String(clase.estado || "programada").replace("_", " ")}
              </span>
            </td>
          </tr>
        ))
      )}
    </tbody>
  </table>
</div>
          </article>
       </section>
)}

{modalClasesGratisAbierto && (
  <div className="clases-gratis-modal-backdrop">
    <section className="clases-gratis-modal">
      <div className="clases-gratis-modal-head">
        <div>
          <p className="coordinador-kicker">Clases gratis</p>
          <h2>Clases gratis programadas</h2>
          <span>
            Consulta, filtra y revisa las clases gratis sin saturar el panel principal.
          </span>
        </div>

        <button
          type="button"
          className="clases-gratis-close-btn"
          onClick={() => setModalClasesGratisAbierto(false)}
        >
          ×
        </button>
      </div>

      <div className="clases-gratis-toolbar">
        <input
          className="clases-gratis-search"
          value={busquedaClaseGratis}
          onChange={(e) => setBusquedaClaseGratis(e.target.value)}
          placeholder="Buscar por nombre, teléfono, curso o profesor..."
        />

        <select
          className="clases-gratis-filter"
          value={estadoClaseGratisFiltro}
          onChange={(e) => setEstadoClaseGratisFiltro(e.target.value)}
        >
          <option value="todas">Todos los estados</option>
          <option value="programada">Programadas</option>
          <option value="en_curso">En curso</option>
          <option value="finalizada">Finalizadas</option>
          <option value="cancelada">Canceladas</option>
        </select>
      </div>

      <div className="clases-gratis-modal-summary">
        <span>
          Mostrando <strong>{clasesGratisPaginadas.length}</strong> de{" "}
          <strong>{clasesGratisFiltradas.length}</strong> resultados
        </span>

        <span>
          Página <strong>{paginaClasesGratis}</strong> de{" "}
          <strong>{totalPaginasClasesGratis}</strong>
        </span>
      </div>

      <div className="coordinador-table-wrap gratis-table-wrap">
        <table className="coordinador-table clases-gratis-table">
          <thead>
            <tr>
              <th>Interesado</th>
              <th>Curso</th>
              <th>Profesor</th>
              <th>Fecha</th>
              <th>Duración</th>
              <th>Estado</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="empty-cell">
                  Cargando clases gratis...
                </td>
              </tr>
            ) : clasesGratisPaginadas.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-cell">
                  No hay clases gratis con esos filtros.
                </td>
              </tr>
            ) : (
              clasesGratisPaginadas.map((clase) => (
                <tr key={clase.id}>
                  <td data-label="Interesado">
                    <strong>{clase.nombre || "-"}</strong>
                    <span>{clase.telefono || "-"}</span>
                  </td>

                  <td data-label="Curso">{clase.curso || "-"}</td>

                  <td data-label="Profesor">{clase.profesor_nombre || "-"}</td>

                  <td data-label="Fecha">
                    <strong>{formatearFecha(clase.fecha)}</strong>
                    <span>
                      {clase.hora || "--:--"}
                      {clase.hora_fin ? ` - ${clase.hora_fin}` : ""}
                    </span>
                  </td>

                  <td data-label="Duración">
                    {clase.duracion_minutos || 60} min
                  </td>

                  <td data-label="Estado">
                    <span className={`status-pill status-${clase.estado || "programada"}`}>
                      {String(clase.estado || "programada").replace("_", " ")}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="clases-gratis-pagination">
        <button
          type="button"
          disabled={paginaClasesGratis <= 1}
          onClick={() => setPaginaClasesGratis((prev) => Math.max(prev - 1, 1))}
        >
          Anterior
        </button>

        <span>
          {paginaClasesGratis} / {totalPaginasClasesGratis}
        </span>

        <button
          type="button"
          disabled={paginaClasesGratis >= totalPaginasClasesGratis}
          onClick={() =>
            setPaginaClasesGratis((prev) =>
              Math.min(prev + 1, totalPaginasClasesGratis)
            )
          }
        >
          Siguiente
        </button>
      </div>
    </section>
  </div>
)}

{vistaActiva === "visitas" && (
  <section className="coordinador-card">
    <div className="coordinador-card-head">
      <div>
        <h2>Visitas programadas</h2>
        <p>
          Consulta visitas agendadas, responsables y seguimiento comercial.
        </p>
      </div>
    </div>

    <div className="coordinador-table-wrap">
      <table className="coordinador-table">
        <thead>
          <tr>
            <th>Visitante</th>
            <th>Curso</th>
           
            <th>Hora</th>
            <th>Responsable</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>

        <tbody>
          {visitas.length === 0 ? (
            <tr>
             <td colSpan="6" className="empty-cell">
                No hay visitas programadas.
              </td>
            </tr>


          ) : (
            visitas.map((visita) => (
              <tr key={visita.id}>
                <td data-label="Visitante">
               <strong>
  {visita.nombre_visitante || "Sin nombre"}{" "}
  {visita.apellido_visitante || "Sin apellido"}
</strong>

<span>{visita.telefono || "Sin teléfono"}</span>
                </td>

                <td data-label="Curso">
                  {visita.curso_interes || "Sin curso"}
                </td>

             

                <td data-label="Hora">
                  {visita.hora || "Sin hora"}
                </td>

                <td data-label="Responsable">
                  {visita.responsable || visita.coordinador_nombre || "Sin responsable"}
                </td>

                <td data-label="Estado">
                  <span className="status-pill">
                    {visita.estado || "Agendada"}
                  </span>
                </td>

                <td data-label="Acciones">

                  
 
<div className="coordinador-row-actions">
  <button
    type="button"
    className="mini-action-btn"
    onClick={() => abrirDetalleVisita(visita)}
  >
    Ver
  </button>

  <button
    type="button"
    className="mini-action-btn cyan"
    onClick={() => iniciarEdicionVisita(visita)}
  >
    Editar
  </button>


    <button
      type="button"
      className="mini-action-btn danger"
      onClick={() => cancelarVisita(visita.id)}
    >
      Cancelar
    </button>
  </div>
</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </section>
)}

{vistaActiva === "comisiones" && (
  <section className="coordinador-finance-view">
    <section className="coordinador-kpi-grid finance">
      <article className="coordinador-kpi-card highlight">
        <small>Comisiones hoy</small>
        <strong>{formatearPesos(totalComisionesPorRango("dia"))}</strong>
      </article>

      <article className="coordinador-kpi-card highlight">
        <small>Comisiones semana</small>
        <strong>{formatearPesos(totalComisionesPorRango("semana"))}</strong>
      </article>

      <article className="coordinador-kpi-card highlight">
        <small>Comisiones mes</small>
        <strong>{formatearPesos(totalComisionesPorRango("mes"))}</strong>
      </article>

      <article className="coordinador-kpi-card highlight">
        <small>Comisiones año</small>
        <strong>{formatearPesos(totalComisionesPorRango("ano"))}</strong>
      </article>
    </section>

    <article className="coordinador-card">
      <div className="coordinador-card-head">
        <div>
          <h2>Leads pagados del coordinador</h2>
          <p>Total generado: {formatearPesos(resumen.comisionesGeneradas)}</p>
        </div>
      </div>

      <div className="coordinador-table-wrap">
        <table className="coordinador-table">
          <thead>
            <tr>
              <th>Lead</th>
              <th>Tipo cliente</th>
              <th>Valor</th>
              <th>Porcentaje</th>
              <th>Comisión</th>
              <th>Fecha</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="empty-cell">
                  Cargando leads...
                </td>
              </tr>
            ) : leadsPagados.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-cell">
                  No hay leads pagados del coordinador.
                </td>
              </tr>
            ) : (
              leadsPagados.map((lead) => {
                const tipo = String(lead.tipo_cliente || "nuevo").toLowerCase();
                const porcentaje =
                  tipo === "activo"
                    ? "5%"
                    : tipo === "reactivado"
                    ? "7%"
                    : "10%";

                return (
                  <tr key={lead.id}>
                    <td data-label="Lead">
                      <strong>{lead.nombre || "Sin nombre"}</strong>
                      <span>{lead.telefono || "-"}</span>
                    </td>

                    <td data-label="Tipo cliente">
                      {lead.tipo_cliente || "nuevo"}
                    </td>

                    <td data-label="Valor">
                      {formatearPesos(lead.valor || 0)}
                    </td>

                    <td data-label="Porcentaje">{porcentaje}</td>

                    <td data-label="Comisión" className="money-cell">
                      {formatearPesos(calcularComisionLead(lead))}
                    </td>

                    <td data-label="Fecha">
                      {formatearFecha(lead.created_at)}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </article>
  </section>
)}

{vistaActiva === "pagos" && (
  <section className="coordinador-finance-view">
    <section className="coordinador-kpi-grid finance">
      <article className="coordinador-kpi-card highlight-cyan">
        <small>Pagos hoy</small>
        <strong>{formatearPesos(totalPagosPorRango("dia"))}</strong>
      </article>

      <article className="coordinador-kpi-card highlight-cyan">
        <small>Pagos semana</small>
        <strong>{formatearPesos(totalPagosPorRango("semana"))}</strong>
      </article>

      <article className="coordinador-kpi-card highlight-cyan">
        <small>Pagos mes</small>
        <strong>{formatearPesos(totalPagosPorRango("mes"))}</strong>
      </article>

      <article className="coordinador-kpi-card highlight-cyan">
        <small>Pagos año</small>
        <strong>{formatearPesos(totalPagosPorRango("ano"))}</strong>
      </article>
    </section>

    <article className="coordinador-card">
      <div className="coordinador-card-head">
        <div>
          <h2>Historial de pagos al coordinador</h2>
          <p>Total pagado: {formatearPesos(totalPagadoCoordinador)}</p>
        </div>
      </div>

      <div className="coordinador-table-wrap">
        <table className="coordinador-table">
          <thead>
            <tr>
              <th>Mes</th>
              <th>Monto</th>
              <th>Fecha pago</th>
              <th>Método</th>
              <th>Estado</th>
              <th>Descripción</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className="empty-cell">
                  Cargando pagos...
                </td>
              </tr>
            ) : pagosCoordinador.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-cell">
                  No hay pagos registrados.
                </td>
              </tr>
            ) : (
              pagosCoordinador.map((pago) => (
                <tr key={pago.id}>
                  <td data-label="Mes">{pago.mes || "-"}</td>

                  <td data-label="Monto" className="money-cell">
                    {formatearPesos(pago.monto)}
                  </td>

                  <td data-label="Fecha pago">
                    {formatearFecha(pago.fecha_pago)}
                  </td>

                  <td data-label="Método">
                    {pago.metodo_pago || "-"}
                  </td>

                  <td data-label="Estado">
                    <span className={`status-pill status-${pago.estado || "pendiente"}`}>
                      {pago.estado || "pendiente"}
                    </span>
                  </td>

             


                  <td data-label="Descripción">
                    {pago.descripcion || pago.observaciones || "-"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  </section>
)}

{vistaActiva === "clases" && (
  <section className="coordinador-finance-view">
    <section className="coordinador-kpi-grid finance">
      <article className="coordinador-kpi-card highlight-cyan">
        <small>Total clases</small>
        <strong>{resumenClases.total}</strong>
      </article>

      <article className="coordinador-kpi-card highlight">
        <small>Clases hoy</small>
        <strong>{resumenClases.hoy}</strong>
      </article>

      <article className="coordinador-kpi-card">
        <small>Programadas</small>
        <strong>{resumenClases.programadas}</strong>
      </article>

      <article className="coordinador-kpi-card danger">
        <small>Pausadas / canceladas</small>
        <strong>{resumenClases.pausadas + resumenClases.canceladas}</strong>
      </article>
    </section>

    <article className="coordinador-card">
      <div className="coordinador-card-head">
        <div>
          <h2>Agenda de clases</h2>
          <p>Gestiona clases, profesores, alumnos asignados y estados académicos.</p>
        </div>
      </div>

      <div className="coordinador-table-wrap">
        <table className="coordinador-table coordinador-clases-table">
          <thead>
            <tr>
              <th>Clase</th>
              <th>Alumno</th>
              <th>Profesor</th>
              
              <th>Modalidad</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="empty-cell">
                  Cargando clases...
                </td>
              </tr>
            ) : clasesOrdenadas.length === 0 ? (
              <tr>
                <td colSpan="7" className="empty-cell">
                  No hay clases programadas.
                </td>
              </tr>
            ) : (
              clasesOrdenadas.map((clase) => (
                <tr key={clase.id}>
                  <td data-label="Clase">
                    <strong>{clase.curso || "Sin curso"}</strong>
                    <span>{clase.observaciones || "Sin observaciones"}</span>
                  </td>

                  <td data-label="Alumno">
                    {clase.alumno_nombre || "-"}
                  </td>

                  <td data-label="Profesor">
                    {clase.profesor_nombre || "-"}
                  </td>

                  <td data-label="Fecha">
                    <strong>{formatearFecha(clase.fecha)}</strong>
                   <span>
                    {clase.hora || clase.hora_inicio || "--:--"}
                    {clase.hora_fin ? ` - ${clase.hora_fin}` : ""}
                  </span>
                  </td>

                  <td data-label="Modalidad">
                    {clase.modalidad || "-"} / {clase.formato_clase || "-"}
                  </td>

                  <td data-label="Estado">
                    <span className={`status-pill status-${clase.estado || "programada"}`}>
                      {clase.estado || "programada"}
                    </span>
                  </td>

                  <td data-label="Acciones">
                    <div className="coordinador-row-actions">
                      <button
                        type="button"
                        className="mini-action-btn cyan"
                        onClick={() => abrirDetalleClase(clase)}
                        title="Ver detalles"
                      >
                        Ver
                      </button>
                      <button
                        type="button"
                        className="mini-action-btn warning"
                        onClick={() => iniciarEdicionClase(clase)}
                        title="Reprogramar / Editar"
                        disabled={clase.estado === "finalizada" || clase.estado === "cancelada"}
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        className="mini-action-btn danger"
                        onClick={() => cancelarClase(clase.id)}
                        title="Cancelar clase"
                        disabled={clase.estado === "finalizada" || clase.estado === "cancelada"}
                      >
                        Cancelar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </article>
  </section>
)}

{claseSeleccionada && (
  <div className="coordinador-modal-overlay" onClick={cerrarDetalleClase}>
    <div
      className="coordinador-modal"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="coordinador-modal-head">
        <div>
          <p className="coordinador-kicker">Detalle académico</p>
          <h2>{claseSeleccionada.curso || "Clase sin curso"}</h2>
          <span>
            {claseSeleccionada.profesor_nombre || "Profesor no asignado"} ·{" "}
            {formatearFecha(claseSeleccionada.fecha)} ·{" "}
            {claseSeleccionada.hora || claseSeleccionada.hora_inicio || "--:--"}
          </span>
        </div>

        <button
          type="button"
          className="coordinador-modal-close"
          onClick={cerrarDetalleClase}
        >
          ×
        </button>
      </div>

      <section className="coordinador-modal-kpis">
        <div>
          <small>Estado</small>
          <strong>{claseSeleccionada.estado || "programada"}</strong>
        </div>

        <div>
          <small>Modalidad</small>
          <strong>{claseSeleccionada.modalidad || "-"}</strong>
        </div>

        <div>
          <small>Formato</small>
          <strong>{claseSeleccionada.formato_clase || "-"}</strong>
        </div>

        <div>
          <small>Alumnos</small>
         <strong>
  {Array.isArray(claseSeleccionada.alumnos)
    ? claseSeleccionada.alumnos.length
    : 1}
</strong>
        </div>
      </section>

      <section className="coordinador-modal-grid">
        <article className="coordinador-modal-card">
          <h3>Información general</h3>

          <div className="coordinador-detail-row">
            <p>
              <span>Alumno principal</span>
              <strong>{claseSeleccionada.alumno_nombre || "-"}</strong>
            </p>

            <p>
              <span>Profesor</span>
              <strong>{claseSeleccionada.profesor_nombre || "-"}</strong>
            </p>

            <p>
              <span>Fecha</span>
              <strong>{formatearFecha(claseSeleccionada.fecha)}</strong>
            </p>

              <p>
              <span>Horario</span>
              <strong>
                {claseSeleccionada.hora || claseSeleccionada.hora_inicio || "--:--"}
                {claseSeleccionada.hora_fin ? ` - ${claseSeleccionada.hora_fin}` : ""}
              </strong>
            </p>

            <p>
              <span>Duración</span>
              <strong>
                {claseSeleccionada.duracion_horas || 1} hora
                {Number(claseSeleccionada.duracion_horas || 1) > 1 ? "s" : ""}
              </strong>
            </p>

            <p>
              <span>Observaciones</span>
              <strong>{claseSeleccionada.observaciones || "Sin observaciones"}</strong>
            </p>
          </div>
        </article>

        <article className="coordinador-modal-card">
          <h3>Progreso académico</h3>

          <div className="coordinador-progress-list">
           <div>
              <span>Módulo actual</span>

              <strong>
                Módulo{" "}
                {calcularModuloActual(
                  calcularHorasAlumno(
                    claseSeleccionadaSegura.alumno_db_id ||
                      claseSeleccionadaSegura.alumno_id
                  )
                )}
              </strong>
            </div>

            <div>
                <span>Horas acumuladas</span>

                <strong>
                  {calcularHorasAlumno(
                    claseSeleccionadaSegura.alumno_db_id ||
                      claseSeleccionadaSegura.alumno_id
                  )}
                  h
                </strong>
              </div>              

            <div>
  <span>Horas restantes módulo</span>

            <strong>
  {calcularHorasModulo(
    calcularHorasAlumno(
      claseSeleccionadaSegura.alumno_db_id ||
        claseSeleccionadaSegura.alumno_id
    )
  ) >= HORAS_POR_MODULO
    ? 0
    : HORAS_POR_MODULO -
      calcularHorasModulo(
        calcularHorasAlumno(
          claseSeleccionadaSegura.alumno_db_id ||
            claseSeleccionadaSegura.alumno_id
        )
      )}
  h
</strong>
          </div>

            <div>
  <span>Asistencias alumno</span>
  <strong>
    {clases.reduce((acc, clase) => {
      const estado = String(clase.estado || "").toLowerCase();

      if (estado === "cancelada") return acc;

      const alumno = obtenerAlumnosDeClase(clase).find(
        (item) =>
          String(item.id) === String(
            claseSeleccionadaSegura.alumno_db_id ||
              claseSeleccionadaSegura.alumno_id
          ) ||
          String(item.alumno_id) === String(
            claseSeleccionadaSegura.alumno_db_id ||
              claseSeleccionadaSegura.alumno_id
          )
      );

      return alumno?.asistio ? acc + 1 : acc;
    }, 0)}
  </strong>
</div>

            <div>
  <span>Inasistencias alumno</span>
  <strong>
    {calcularInasistenciasAlumno(
      claseSeleccionadaSegura.alumno_db_id ||
        claseSeleccionadaSegura.alumno_id
    )}
  </strong>
</div>
          </div>

          <div className="coordinador-progress-bar-wrapper">
  <div
    className="coordinador-progress-bar"
    style={{
  width: `${Math.min(
    (
      Math.min(
        calcularHorasModulo(
          calcularHorasAlumno(
            claseSeleccionadaSegura.alumno_db_id ||
              claseSeleccionadaSegura.alumno_id
          )
        ),
        HORAS_POR_MODULO
      ) /
        HORAS_POR_MODULO
    ) * 100,
    100
  )}%`,
}}
  />
</div>

<p className="coordinador-progress-text">
  {calcularHorasModulo(
  calcularHorasAlumno(
    claseSeleccionadaSegura.alumno_db_id ||
      claseSeleccionadaSegura.alumno_id
  )
) >= HORAS_POR_MODULO && (
  <span className="modulo-completado-badge">
    ✅ Módulo completado
  </span>
)}
</p>
        </article>
      </section>

      <section className="coordinador-modal-card">
        <div className="coordinador-card-head compact">
          <div>
            <h3>Alumnos de la clase</h3>
            <p>Alumno principal y alumnos extra agregados por coordinación.</p>
          </div>
        </div>

        <div className="coordinador-alumnos-extra-list">
         

         {obtenerAlumnosDeClase(claseSeleccionada).map((alumno) => (
  <article
    key={alumno.id || alumno.alumno_id}
    className={`coordinador-alumno-chip ${
      alumno.tipo === "principal" ? "principal" : ""
    }`}
  >
    <strong>{alumno.nombre || "Alumno"}</strong>

    <span>
      {alumno.tipo === "principal" ? "Principal" : "Extra"} ·{" "}
      {alumno.asistio ? "Asistió" : "No asistió"} ·{" "}
      {alumno.horasSumadas}h
    </span>
  </article>
))}
        </div>

        <div className="coordinador-extra-form">
          <select
            value={alumnoExtraId}
            onChange={(e) => setAlumnoExtraId(e.target.value)}
          >
            <option value="">Agregar alumno extra</option>
            {alumnos.map((alumno) => (
              <option key={alumno.id || alumno.alumno_id} value={alumno.id || alumno.alumno_id}>
                {alumno.nombre}
              </option>
            ))}
          </select>

          <button
            type="button"
            className="coordinador-primary-btn"
            onClick={agregarAlumnoExtraAClase}
          >
            Agregar alumno
          </button>
        </div>
      </section>

     {(
  <div className="coordinador-modal-actions">
       
       {permisosClases.puedeEditarClases && (
  <button
    type="button"
    className="coordinador-secondary-btn"
    onClick={() => iniciarEdicionClase(claseSeleccionada)}
  >
    Editar clase
  </button>
)}


{permisosClases.puedePausarClases && (
        <button
          type="button"
          className="coordinador-secondary-btn"
          onClick={() => actualizarEstadoClase(claseSeleccionada.id, "pausada")}
        >
          Pausar
        </button>
)}
       
       {permisosClases.puedeEliminarClases && (
  <button
    type="button"
    className="coordinador-secondary-btn"
    onClick={() =>
      actualizarEstadoClase(claseSeleccionada.id, "cancelada")
    }
  >
    Cancelar
  </button>
)}

        {permisosClases.puedeEliminarClases && (
  <button
    type="button"
    className="mini-action-btn danger-outline"
    onClick={() => eliminarClase(claseSeleccionada.id)}
  >
    Eliminar
  </button>
)}

        </div>
)}
    </div>
  </div>
)}


{modalVerVisitaAbierto && visitaSeleccionada && (
  <div className="coordinador-modal-overlay">
    <div className="coordinador-modal visita-detalle-modal">
      <div className="coordinador-modal-head visita-detalle-head">
        <div>
          <p className="visita-detalle-kicker">Detalle comercial</p>
          <h2>Detalle de la visita</h2>
          <span>Información registrada solo para consulta.</span>
        </div>

        <button
          type="button"
          className="coordinador-modal-close"
          onClick={cerrarModalVerVisita}
        >
          ×
        </button>
      </div>

      <div className="visita-detalle-grid">
        <div className="visita-detalle-card principal">
          <small>Visitante</small>
          <h3>
            {visitaSeleccionada.nombre_visitante || "-"}{" "}
            {visitaSeleccionada.apellido_visitante || ""}
          </h3>

         <div className="visita-detalle-items visita-visitante-grid">
            <p>
              <span>Tipo documento</span>
              <strong>
  {{
    ti: "Tarjeta de identidad",
    cc: "Cédula",
    cedula: "Cédula",
    ce: "Cédula de extranjería",
    ppt: "Permiso por protección temporal",
    pasaporte: "Pasaporte",
    nit: "NIT",
  }[
    String(
      visitaSeleccionada?.tipo_documento || ""
    ).toLowerCase()
  ] || "-"}
</strong>
            </p>

            <p>
              <span>Número documento</span>
              <strong>{visitaSeleccionada.numero_documento || "-"}</strong>
            </p>

            <p>
              <span>Teléfono</span>
              <strong>{visitaSeleccionada.telefono || "-"}</strong>
            </p>
          </div>
        </div>

        <div className="visita-detalle-card">
  <small>Agenda</small>

        <div className="visita-detalle-items visita-agenda-grid">
            <p>
              <span>Curso de interés</span>
              <strong>{visitaSeleccionada.curso_interes || "-"}</strong>
            </p>

            <p>
              <span>Fecha</span>
              <strong>{visitaSeleccionada.fecha || "-"}</strong>
            </p>

            <p>
              <span>Hora</span>
              <strong>{visitaSeleccionada.hora || "-"}</strong>
            </p>

          <p className="visita-agenda-estado-item">
  <span>Estado</span>
  <strong className={`visita-detalle-estado estado-${visitaSeleccionada.estado || "sin-estado"}`}>
    {String(visitaSeleccionada.estado || "-").toUpperCase()}
  </strong>
</p>
          </div>
        </div>

      <div className="visita-detalle-card">
  <small>Responsables</small>

  <div className="visita-detalle-items visita-responsables-grid">
    <p>
      <span>Responsable</span>
      <strong>{visitaSeleccionada?.responsable || "-"}</strong>
    </p>

    <p>
      <span>Coordinador</span>
      <strong>{visitaSeleccionada?.coordinador_nombre || "-"}</strong>
    </p>
  </div>
</div>

<div className="visita-detalle-card">
  <small>Acudiente</small>

  <div className="visita-detalle-items visita-responsables-grid">
    <p>
      <span>Nombre acudiente</span>
      <strong>{visitaSeleccionada?.nombre_acudiente || "-"}</strong>
    </p>

    <p>
      <span>Teléfono acudiente</span>
      <strong>{visitaSeleccionada?.telefono_acudiente || "-"}</strong>
    </p>
  </div>
</div>
       

        <div className="visita-detalle-card full">
          <small>Observaciones</small>
          <p className="visita-detalle-observacion">
            {visitaSeleccionada.observaciones || "-"}
          </p>
        </div>

        <div className="visita-detalle-actions">
 
</div>
      </div>
    </div>
  </div>
)}

{modalVisitaAbierto && (
  <div className="coordinador-modal-overlay">
    <div className="coordinador-modal">

      <div className="coordinador-modal-head">
        <div>
          <h2>Editar visita</h2>
          <span>
            Modifica la información y guarda cambios.
          </span>
        </div>

        <button
          type="button"
          className="coordinador-modal-close"
          onClick={cerrarModalVisita}
        >
          ×
        </button>
      </div>

      <form
        className="coordinador-form"
        onSubmit={guardarEdicionVisita}
      >

        <div className="coordinador-field">
          <label>Nombre</label>

          <input
            type="text"
            name="nombreVisitante"
            value={formVisita.nombreVisitante}
            onChange={handleVisitaChange}
          />
        </div>

        <div className="coordinador-field">
          <label>Apellido</label>

          <input
            type="text"
            name="apellidoVisitante"
            value={formVisita.apellidoVisitante}
            onChange={handleVisitaChange}
          />
        </div>

        <div className="coordinador-field">
          <label>Teléfono</label>

          <input
            type="text"
            name="telefono"
            value={formVisita.telefono}
            onChange={handleVisitaChange}
          />
        </div>

        <div className="coordinador-field">
          <label>Curso</label>

          <select
            name="cursoInteres"
            value={formVisita.cursoInteres}
            onChange={handleVisitaChange}
          >
            {CURSOS.map((curso) => (
              <option key={curso} value={curso}>
                {curso}
              </option>
            ))}
          </select>
        </div>

        <div className="coordinador-field">
          <label>Fecha</label>

          <input
            type="date"
            name="fecha"
            value={formVisita.fecha}
            onChange={handleVisitaChange}
          />
        </div>

        <div className="coordinador-field">
          <label>Hora</label>

          <input
            type="time"
            name="hora"
            value={formVisita.hora}
            onChange={handleVisitaChange}
          />
        </div>

       

{formVisita.esMenorEdad && (
  <>
    <div className="coordinador-field">
      <label>Nombre acudiente</label>

      <input
        type="text"
        name="nombreAcudiente"
        value={formVisita.nombreAcudiente}
        onChange={handleVisitaChange}
      />
    </div>

    <div className="coordinador-field">
      <label>Teléfono acudiente</label>

      <input
        type="text"
        name="telefonoAcudiente"
        value={formVisita.telefonoAcudiente}
        onChange={handleVisitaChange}
      />
    </div>
  </>
)}

        <div className="coordinador-field full">
          <label>Responsable</label>

          <input
            type="text"
            name="responsable"
            value={formVisita.responsable}
            onChange={handleVisitaChange}
          />
        </div>

        <div className="coordinador-field full">
          <label>Observaciones</label>

          <textarea
            name="observaciones"
            value={formVisita.observaciones}
            onChange={handleVisitaChange}
          />
        </div>

        <div className="coordinador-actions full">

          <button
            type="submit"
            className="coordinador-primary-btn"
          >
            Guardar cambios
          </button>
        </div>

      </form>
    </div>
  </div>
)}

      </main>
    </div>
  );
}

export default CoordinadorPanel;