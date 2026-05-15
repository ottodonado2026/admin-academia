import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { supabase } from "../services/supabaseClient";

import "./RegistroCoordinadores.css";

const ROLE_COORDINADOR = "coordinador_academico";
const HORAS_POR_MODULO = 16;

const formInicial = {
  nombre: "",
  email: "",
  password: "",
  confirmarPassword: "",
  tipo_documento: "",
  numero_documento: "",
  telefono: "",
  ciudad: "",
  direccion: "",
  fecha_ingreso: "",
  area_academica: "",
  estado: "activo",
  observaciones: "",
  puedeRegistrarCoordinadores: false,
  puedeVerTodosLeads: false,
  puedeEditarClases: false,
puedePausarClases: false,
puedeCancelarClases: false,
puedeEliminarClases: false,
};

const roleLabels = {
  owner: "Gerente",
  admin: "Administrador",
  contador: "Contador",
  coordinador: "Coordinador",
  coordinador_academico: "Coordinador académico",
};

const estadoLabels = {
  activo: "Activo",
  inactivo: "Inactivo",
  suspendido: "Suspendido",
  eliminado: "Eliminado",
};

const limpiarTexto = (valor = "") => String(valor || "").trim();

const limpiarTelefono = (valor = "") =>
  String(valor || "")
    .replace(/[^\d+]/g, "")
    .trim();

const normalizarEmail = (valor = "") => limpiarTexto(valor).toLowerCase();

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

const obtenerIniciales = (nombre = "") => {
  const partes = String(nombre || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (partes.length === 0) return "CA";

  return partes
    .slice(0, 2)
    .map((parte) => parte[0])
    .join("")
    .toUpperCase();
};

const calcularModuloActual = (horas) => {
  const horasNumero = Number(horas || 0);

  if (horasNumero <= 0) return 1;

  return Math.max(1, Math.ceil(horasNumero / HORAS_POR_MODULO));
};

const calcularHorasModulo = (horas) => {
  const horasNumero = Number(horas || 0);

  if (horasNumero <= 0) return 0;

  const restante = horasNumero % HORAS_POR_MODULO;

  if (restante === 0) return HORAS_POR_MODULO;

  return restante;
};

function RegistroCoordinadores() {
  const navigate = useNavigate();

  const [usuarioActual, setUsuarioActual] = useState(null);
  const [coordinadores, setCoordinadores] = useState([]);
  const [clases, setClases] = useState([]);

  const [form, setForm] = useState(formInicial);
  const [busqueda, setBusqueda] = useState("");
  const [mostrarCoordinadores, setMostrarCoordinadores] = useState(false);
  const [mostrarEliminados, setMostrarEliminados] = useState(false);
  const [coordinadorSeleccionado, setCoordinadorSeleccionado] = useState(null);

  const [loading, setLoading] = useState(true);
  const [guardando, setGuardando] = useState(false);
  const [refresh, setRefresh] = useState(0);

  const [alerta, setAlerta] = useState({
    visible: false,
    tipo: "success",
    mensaje: "",
  });

  const mostrarAlerta = useCallback((tipo, mensaje) => {
    setAlerta({
      visible: true,
      tipo,
      mensaje,
    });
  }, []);

  useEffect(() => {
    if (!alerta.visible) return;

    const timer = setTimeout(() => {
      setAlerta({
        visible: false,
        tipo: "success",
        mensaje: "",
      });
    }, 4200);

    return () => clearTimeout(timer);
  }, [alerta.visible]);

  const handleLogout = () => {
    localStorage.removeItem("auth");
    localStorage.removeItem("user");
    navigate("/");
  };

  const cargarDatos = useCallback(async () => {
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.getUser();

      if (authError) {
        console.error("Error obteniendo usuario Auth:", authError);
      }

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

      const usuario = usuarioData || {
        id: authUser.id,
        auth_uid: authUser.id,
        email: authUser.email,
        nombre: authUser.email,
        role: "",
      };

      setUsuarioActual(usuario);

      const [coordinadoresResponse, clasesResponse] = await Promise.all([
        supabase
          .from("usuarios")
          .select("*")
          .eq("role", ROLE_COORDINADOR)
          .order("created_at", { ascending: false }),
        supabase
          .from("clases")
          .select(
            "id, coordinador_id, coordinador_nombre, duracion_horas, estado, fecha, created_at"
          )
          .order("fecha", { ascending: false }),
      ]);

            if (coordinadoresResponse.error) {
        console.error("Error cargando coordinadores:", coordinadoresResponse.error);
        mostrarAlerta(
          "error",
          "No se pudieron cargar los coordinadores académicos."
        );
        setCoordinadores([]);
      } else {
        const coordinadoresSinUsuarioActual = (coordinadoresResponse.data || []).filter(
          (coordinador) => {
            const mismoAuthUid =
              usuario?.auth_uid &&
              coordinador?.auth_uid &&
              String(coordinador.auth_uid) === String(usuario.auth_uid);

            const mismoId =
              usuario?.id &&
              coordinador?.id &&
              String(coordinador.id) === String(usuario.id);

            return !mismoAuthUid && !mismoId;
          }
        );

        setCoordinadores(coordinadoresSinUsuarioActual);
      }

      if (clasesResponse.error) {
        console.warn(
          "No se pudieron cargar clases para métricas del coordinador:",
          clasesResponse.error
        );
        setClases([]);
      } else {
        setClases(clasesResponse.data || []);
      }
    } catch (error) {
      console.error("Error general cargando registro de coordinadores:", error);
      mostrarAlerta("error", "No se pudo cargar la sesión de coordinadores.");
    } finally {
      setLoading(false);
    }
  }, [mostrarAlerta, navigate]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos, refresh]);

  const roleActual = String(usuarioActual?.role || "").toLowerCase();

  const esAdminPrincipal = ["owner", "admin"].includes(roleActual);

  const esCoordinadorPrincipal =
    roleActual === ROLE_COORDINADOR &&
    (usuarioActual?.puede_registrar_coordinadores === true ||
      usuarioActual?.coordinador_nivel === "principal");

 const puedeRegistrar =
  esAdminPrincipal || esCoordinadorPrincipal;

const puedeAsignarPrincipal = esAdminPrincipal;

const puedeGestionarPermisos =
  esAdminPrincipal || esCoordinadorPrincipal;
const coordinadoresConMetricas = useMemo(() => {
  return coordinadores.map((coordinador) => {
    const clasesDelCoordinador = clases.filter((clase) => {
      const coincidePorId =
        clase.coordinador_id &&
        coordinador.id &&
        String(clase.coordinador_id) === String(coordinador.id);

      const coincidePorNombre =
        clase.coordinador_nombre &&
        coordinador.nombre &&
        String(clase.coordinador_nombre).trim().toLowerCase() ===
          String(coordinador.nombre).trim().toLowerCase();

      return coincidePorId || coincidePorNombre;
    });

    const clasesCreadas = clasesDelCoordinador.length;

    const clasesReprogramadas = clasesDelCoordinador.filter(
      (clase) =>
        String(clase.estado || "").toLowerCase() === "reprogramada"
    ).length;

    const clasesCanceladas = clasesDelCoordinador.filter((clase) =>
      ["cancelada", "pausada", "anulada"].includes(
        String(clase.estado || "").toLowerCase()
      )
    ).length;

    const ultimaClase = clasesDelCoordinador[0]?.fecha || null;

    return {
      ...coordinador,
      clasesCreadas,
      clasesReprogramadas,
      clasesCanceladas,
      ultimaClase,
    };
  });
}, [coordinadores, clases]);
  const resumen = useMemo(() => {
    const total = coordinadoresConMetricas.length;
    const activos = coordinadoresConMetricas.filter(
      (coordinador) =>
        String(coordinador.estado || "activo").toLowerCase() === "activo"
    ).length;

    const principales = coordinadoresConMetricas.filter(
      (coordinador) =>
        coordinador.puede_registrar_coordinadores === true ||
        coordinador.coordinador_nivel === "principal"
    ).length;

  

    return {
      total,
      activos,
      inactivos: Math.max(total - activos, 0),
      principales,
      secundarios: Math.max(total - principales, 0),
     
    };
  }, [coordinadoresConMetricas]);

const coordinadoresFiltrados = useMemo(() => {
  const term = busqueda.trim().toLowerCase();

  const base = coordinadoresConMetricas.filter((coordinador) => {
    const estado = String(coordinador.estado || "activo").toLowerCase();

    return mostrarEliminados ? estado === "eliminado" : estado !== "eliminado";
  });

  if (!term) return base;

  return base.filter((coordinador) => {
    return (
      coordinador.nombre?.toLowerCase().includes(term) ||
      coordinador.email?.toLowerCase().includes(term) ||
      coordinador.telefono?.toLowerCase().includes(term) ||
      coordinador.ciudad?.toLowerCase().includes(term) ||
      coordinador.numero_documento?.toLowerCase().includes(term) ||
      coordinador.area_academica?.toLowerCase().includes(term)
    );
  });
}, [busqueda, coordinadoresConMetricas, mostrarEliminados]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const limpiarFormulario = () => {
    setForm(formInicial);
  };

 const validarFormulario = () => {
  const nombre = limpiarTexto(form.nombre);
  const email = normalizarEmail(form.email);
  const password = String(form.password || "");
  const confirmarPassword = String(form.confirmarPassword || "");
  const telefono = limpiarTelefono(form.telefono);
  const ciudad = limpiarTexto(form.ciudad);
  const tipoDocumento = limpiarTexto(form.tipo_documento);
  const numeroDocumento = limpiarTexto(form.numero_documento);
  const direccion = limpiarTexto(form.direccion);
  const fechaIngreso = limpiarTexto(form.fecha_ingreso);
  const areaAcademica = limpiarTexto(form.area_academica);
  const observaciones = limpiarTexto(form.observaciones);

  const emailValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const documentoSoloNumeros = /^\d+$/.test(numeroDocumento);
  const telefonoSoloNumeros = /^\+?\d+$/.test(telefono);

  if (!puedeRegistrar) {
    mostrarAlerta(
      "warning",
      "Tu usuario no tiene permiso para registrar coordinadores."
    );
    return false;
  }

  if (!nombre) {
    mostrarAlerta("warning", "El nombre completo es obligatorio.");
    return false;
  }

  if (!email || !emailValido) {
    mostrarAlerta("warning", "Ingresa un correo electrónico válido.");
    return false;
  }

  if (!telefono || !telefonoSoloNumeros) {
    mostrarAlerta("warning", "El teléfono es obligatorio y solo debe contener números.");
    return false;
  }

  if (!password || password.length < 8) {
    mostrarAlerta(
      "warning",
      "La contraseña temporal debe tener mínimo 8 caracteres."
    );
    return false;
  }

  if (!confirmarPassword) {
    mostrarAlerta("warning", "Confirma la contraseña temporal.");
    return false;
  }

  if (password !== confirmarPassword) {
    mostrarAlerta("warning", "Las contraseñas no coinciden.");
    return false;
  }

  if (!tipoDocumento) {
    mostrarAlerta("warning", "Selecciona el tipo de documento.");
    return false;
  }

  if (!numeroDocumento || !documentoSoloNumeros) {
    mostrarAlerta("warning", "El número de documento es obligatorio y solo debe contener números.");
    return false;
  }

  if (!ciudad) {
    mostrarAlerta("warning", "La ciudad es obligatoria.");
    return false;
  }

  if (!direccion) {
    mostrarAlerta("warning", "La dirección es obligatoria.");
    return false;
  }

  if (!fechaIngreso) {
    mostrarAlerta("warning", "La fecha de ingreso es obligatoria.");
    return false;
  }

  if (!areaAcademica) {
    mostrarAlerta("warning", "Selecciona el área académica.");
    return false;
  }

  if (!form.estado) {
    mostrarAlerta("warning", "Selecciona el estado del coordinador.");
    return false;
  }

  if (!observaciones) {
    mostrarAlerta("warning", "Las observaciones son obligatorias.");
    return false;
  }

  const emailDuplicado = coordinadores.some(
    (coordinador) =>
      String(coordinador.email || "").toLowerCase() === email
  );

  if (emailDuplicado) {
    mostrarAlerta("warning", "Ya existe un coordinador con ese email.");
    return false;
  }

  return true;
};

  const registrarCoordinador = async (e) => {
    e.preventDefault();

    if (!validarFormulario()) return;

    setGuardando(true);

    const puedeRegistrarOtros = puedeAsignarPrincipal
      ? Boolean(form.puedeRegistrarCoordinadores)
      : false;

    const payload = {
      nombre: limpiarTexto(form.nombre),
      email: normalizarEmail(form.email),
      password: String(form.password || ""),
      role: ROLE_COORDINADOR,

      tipo_documento: limpiarTexto(form.tipo_documento),
      numero_documento: limpiarTexto(form.numero_documento),
      telefono: limpiarTelefono(form.telefono),
      ciudad: limpiarTexto(form.ciudad),
      direccion: limpiarTexto(form.direccion),
      fecha_ingreso: form.fecha_ingreso || null,
      area_academica: limpiarTexto(form.area_academica),
      estado: form.estado || "activo",
      observaciones: limpiarTexto(form.observaciones),

      puede_registrar_coordinadores: puedeRegistrarOtros,
      coordinador_nivel: puedeRegistrarOtros ? "principal" : "secundario",

      puede_ver_todos_leads: Boolean(form.puedeVerTodosLeads),
      puede_editar_clases: Boolean(form.puedeEditarClases),
    puede_pausar_clases: Boolean(form.puedePausarClases),
    puede_cancelar_clases: Boolean(form.puedeCancelarClases),
    puede_eliminar_clases: Boolean(form.puedeEliminarClases),
      creado_por: usuarioActual?.id || null,
      creado_por_nombre: usuarioActual?.nombre || usuarioActual?.email || null,
    };

    try {
      const { data, error } = await supabase.functions.invoke(
        "crear-coordinador-academico",
        {
          body: payload,
        }
      );

      if (error) {
        console.error("Error Edge Function crear-coordinador-academico:", error);
        mostrarAlerta(
          "error",
          error.message ||
            "No se pudo crear el coordinador. Revisa la Edge Function."
        );
        return;
      }

      if (data?.error) {
        console.error("Error devuelto por Edge Function:", data);
        mostrarAlerta("error", data.error);
        return;
      }

      mostrarAlerta("success", "Coordinador académico registrado correctamente.");
      limpiarFormulario();
      setRefresh((prev) => prev + 1);
    } catch (error) {
      console.error("Error inesperado registrando coordinador:", error);
      mostrarAlerta(
        "error",
        "Error inesperado registrando el coordinador académico."
      );
    } finally {
      setGuardando(false);
    }
  };

  const actualizarEstadoCoordinador = async (coordinador, nuevoEstado) => {
    if (!puedeRegistrar) {
      mostrarAlerta("warning", "No tienes permiso para modificar coordinadores.");
      return;
    }

    if (String(coordinador.auth_uid) === String(usuarioActual?.auth_uid)) {
      mostrarAlerta(
        "warning",
        "No puedes cambiar el estado de tu propio usuario desde esta pantalla."
      );
      return;
    }

    try {
      const { error } = await supabase
        .from("usuarios")
        .update({
          estado: nuevoEstado,
          updated_at: new Date().toISOString(),
        })
        .eq("id", coordinador.id);

      if (error) {
        console.error("Error actualizando estado coordinador:", error);
        mostrarAlerta("error", "No se pudo actualizar el estado.");
        return;
      }

      mostrarAlerta("success", `Coordinador marcado como ${nuevoEstado}.`);
      setRefresh((prev) => prev + 1);
    } catch (error) {
      console.error("Error inesperado actualizando estado:", error);
      mostrarAlerta("error", "Error inesperado actualizando el coordinador.");
    }
  };

  const editarCoordinador = async (coordinadorActualizado) => {
  try {
    const { error } = await supabase
      .from("usuarios")
      .update({
        nombre: coordinadorActualizado.nombre,
        telefono: coordinadorActualizado.telefono,
        ciudad: coordinadorActualizado.ciudad,
        direccion: coordinadorActualizado.direccion,
        tipo_documento: coordinadorActualizado.tipo_documento,
        numero_documento: coordinadorActualizado.numero_documento,
        area_academica: coordinadorActualizado.area_academica,
        observaciones: coordinadorActualizado.observaciones,
        estado: coordinadorActualizado.estado,
        updated_at: new Date().toISOString(),
      })
      .eq("id", coordinadorActualizado.id);

    if (error) {
      console.error(error);
      mostrarAlerta("error", "No se pudo actualizar el coordinador.");
      return;
    }

    mostrarAlerta("success", "Coordinador actualizado correctamente.");

    setCoordinadorSeleccionado(null);

    setRefresh((prev) => prev + 1);
  } catch (error) {
    console.error(error);

    mostrarAlerta(
      "error",
      "Error inesperado actualizando coordinador."
    );
  }
};

const eliminarCoordinador = async (coordinadorId) => {
  const confirmar = window.confirm(
    "¿Seguro que deseas ocultar este coordinador? No se perderán sus clases ni historial."
  );

  if (!confirmar) return;

  try {
    const { error } = await supabase
      .from("usuarios")
      .update({
        estado: "eliminado",
        eliminado_en: new Date().toISOString(),
        eliminado_por: usuarioActual?.id || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", coordinadorId);

    if (error) {
      console.error(error);

      mostrarAlerta(
        "error",
        "No se pudo ocultar el coordinador."
      );

      return;
    }

    mostrarAlerta(
      "success",
      "Coordinador ocultado correctamente."
    );

    setCoordinadorSeleccionado(null);

    setRefresh((prev) => prev + 1);
  } catch (error) {
    console.error(error);

    mostrarAlerta(
      "error",
      "Error inesperado ocultando coordinador."
    );
  }
};

const recuperarCoordinador = async (coordinadorId) => {
  try {
    const { error } = await supabase
      .from("usuarios")
      .update({
        estado: "activo",
        eliminado_en: null,
        eliminado_por: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", coordinadorId);

    if (error) {
      console.error(error);

      mostrarAlerta(
        "error",
        "No se pudo recuperar el coordinador."
      );

      return;
    }

    mostrarAlerta(
      "success",
      "Coordinador recuperado correctamente."
    );

    setRefresh((prev) => prev + 1);
  } catch (error) {
    console.error(error);

    mostrarAlerta(
      "error",
      "Error inesperado recuperando coordinador."
    );
  }
};



const resetearPassword = async (email) => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    });

    if (error) {
      console.error(error);

      mostrarAlerta(
        "error",
        "No se pudo enviar el correo de recuperación."
      );

      return;
    }

    mostrarAlerta(
      "success",
      "Correo de recuperación enviado correctamente."
    );
  } catch (error) {
    console.error(error);

    mostrarAlerta(
      "error",
      "Error inesperado restableciendo contraseña."
    );
  }
};

  const renderEstado = (estado = "activo") => {
    const estadoNormalizado = String(estado || "activo").toLowerCase();

    return (
      <span className={`registro-status registro-status-${estadoNormalizado}`}>
        {estadoLabels[estadoNormalizado] || estadoNormalizado}
      </span>
    );
  };

  const renderPermiso = (coordinador) => {
    const esPrincipal =
      coordinador.puede_registrar_coordinadores === true ||
      coordinador.coordinador_nivel === "principal";

    return (
      <span
        className={`registro-permiso ${
          esPrincipal ? "principal" : "secundario"
        }`}
      >
        {esPrincipal ? "Principal" : "Secundario"}
      </span>
    );
  };

  return (
    <div className="dashboard-layout registro-coordinadores-layout">
      <Sidebar onLogout={handleLogout} />

      <main className="dashboard-main registro-coordinadores-page">
        <header className="registro-coordinadores-topbar">
          <div>
            <p className="registro-kicker">Gestión académica</p>
            <h1>Registro de coordinadores</h1>
            <span>
              Crea coordinadores académicos, controla su estado, jerarquía,
              contacto y horas acumuladas dentro de la academia.
            </span>
          </div>

          <div className="registro-topbar-actions">
            <button
              type="button"
              className="registro-secondary-btn"
              onClick={() => setRefresh((prev) => prev + 1)}
              disabled={loading}
            >
              {loading ? "Cargando..." : "Actualizar"}
            </button>
          </div>
        </header>

        {alerta.visible && (
          <div className={`registro-alert registro-alert-${alerta.tipo}`}>
            {alerta.mensaje}
          </div>
        )}

        <section className="registro-kpi-grid">
          <article className="registro-kpi-card">
            <small>Total coordinadores</small>
            <strong>{resumen.total}</strong>
          </article>

          <article className="registro-kpi-card highlight">
            <small>Activos</small>
            <strong>{resumen.activos}</strong>
          </article>

          <article className="registro-kpi-card cyan">
            <small>Principales</small>
            <strong>{resumen.principales}</strong>
          </article>

          <article className="registro-kpi-card">
            <small>Secundarios</small>
            <strong>{resumen.secundarios}</strong>
          </article>

         
        </section>

        <section className="registro-main-grid">
          <article className="registro-card registro-form-card">
            <div className="registro-card-head">
              <div>
                <h2>Nuevo coordinador académico</h2>
                <p>
                  El usuario se crea de forma segura mediante Edge Function.
                  React no usa service_role.
                </p>
              </div>
            </div>

            {!puedeRegistrar && (
              <div className="registro-permission-note">
                Tu usuario actual puede ver esta sesión, pero no puede registrar
                coordinadores. Solo un gerente, administrador o coordinador
                principal puede crear nuevos coordinadores.
              </div>
            )}

            <form className="registro-form" onSubmit={registrarCoordinador}>
              <div className="registro-field full">
                <label>Nombre completo *</label>
                <input
                  name="nombre"
                  value={form.nombre}
                  onChange={handleChange}
                  placeholder="Ej: Valentina Rodríguez"
                  disabled={!puedeRegistrar || guardando}
                />
              </div>

              <div className="registro-field">
                <label>Email institucional *</label>
                <input
  type="email"
  name="email"
  value={form.email}
  onChange={handleChange}
  placeholder="correo@empresa.com"
  autoComplete="off"
  required
/>
              </div>

              <div className="registro-field">
                <label>Teléfono *</label>
               <input
  type="text"
  name="telefono"
  value={form.telefono}
  placeholder="Telefono"
  onChange={(e) =>
    setForm((prev) => ({
      ...prev,
      telefono: e.target.value.replace(/\D/g, ""),
    }))
  }
  inputMode="numeric"
  pattern="[0-9]*"
  required
/>
              </div>

              <div className="registro-field">
                <label>Contraseña temporal *</label>
                <input
                  name="password"
                  type="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Mínimo 8 caracteres"
                  disabled={!puedeRegistrar || guardando}
                />
              </div>

              <div className="registro-field">
                <label>Confirmar contraseña *</label>
                <input
                  name="confirmarPassword"
                  type="password"
                  value={form.confirmarPassword}
                  onChange={handleChange}
                  placeholder="Repite la contraseña"
                  disabled={!puedeRegistrar || guardando}
                />
              </div>

              <div className="registro-field">
                <label>Tipo documento</label>
                <select
                  name="tipo_documento"
                  value={form.tipo_documento}
                  onChange={handleChange}
                  disabled={!puedeRegistrar || guardando}
                >
                  <option value="">Seleccionar</option>
                  <option value="cedula">Cédula</option>
                  <option value="ce">Cédula extranjería</option>
                  <option value="ppt">PPT</option>
                  <option value="pasaporte">Pasaporte</option>
                  <option value="nit">NIT</option>
                </select>
              </div>

              <div className="registro-field">
                <label>Número documento</label>
               <input
  type="text"
  name="numero_documento"
  value={form.numero_documento}
  onChange={(e) =>
    setForm((prev) => ({
      ...prev,
      numero_documento: e.target.value.replace(/\D/g, ""),
    }))
  }
  inputMode="numeric"
  pattern="[0-9]*"
  required
/>
              </div>

              <div className="registro-field">
                <label>Ciudad *</label>
                <input
                  name="ciudad"
                  value={form.ciudad}
                  onChange={handleChange}
                  placeholder="Ej: Bogotá"
                  disabled={!puedeRegistrar || guardando}
                />
              </div>

              <div className="registro-field">
                <label>Dirección</label>
                <input
                  name="direccion"
                  value={form.direccion}
                  onChange={handleChange}
                  placeholder="Dirección de residencia"
                  disabled={!puedeRegistrar || guardando}
                />
              </div>

              <div className="registro-field">
                <label>Fecha ingreso</label>
                <input
                  name="fecha_ingreso"
                  type="date"
                  value={form.fecha_ingreso}
                  onChange={handleChange}
                  disabled={!puedeRegistrar || guardando}
                />
              </div>

              <div className="registro-field">
                <label>Área académica</label>
                <select
                  name="area_academica"
                  value={form.area_academica}
                  onChange={handleChange}
                  disabled={!puedeRegistrar || guardando}
                >
                  <option value="">Seleccionar</option>
                  <option value="produccion_musical">Producción musical</option>
                  <option value="dj">DJ</option>
                  <option value="instrumentos">Instrumentos</option>
                  <option value="canto">Canto</option>
                  <option value="general">General académico</option>
                </select>
              </div>

              <div className="registro-field">
                <label>Estado</label>
                <select
                  name="estado"
                  value={form.estado}
                  onChange={handleChange}
                  disabled={!puedeRegistrar || guardando}
                >
                  <option value="activo">Activo</option>
                  <option value="inactivo">Inactivo</option>
                  <option value="suspendido">Suspendido</option>
                </select>
              </div>

              <div className="registro-field full">
                <label>Observaciones</label>
                <textarea
                  name="observaciones"
                  value={form.observaciones}
                  onChange={handleChange}
                  placeholder="Notas internas del coordinador"
                  disabled={!puedeRegistrar || guardando}
                />
              </div>

          {puedeGestionarPermisos && (
  <>
    {puedeAsignarPrincipal && (
      <label className="registro-check full">
        <input
          type="checkbox"
          name="puedeRegistrarCoordinadores"
          checked={form.puedeRegistrarCoordinadores}
          onChange={handleChange}
          disabled={!puedeRegistrar || guardando}
        />

        <span>
          Crear como coordinador principal. Podrá registrar otros coordinadores.
        </span>
      </label>
    )}

    <label className="registro-check full">
      <input
        type="checkbox"
        name="puedeVerTodosLeads"
        checked={form.puedeVerTodosLeads}
        onChange={handleChange}
        disabled={!puedeRegistrar || guardando}
      />

      <span>
        Permitir acceso global a leads y asesores
        <small
          style={{
            display: "block",
            marginTop: "4px",
            color: "#9da6b8",
            fontWeight: 600,
          }}
        >
          Este coordinador podrá visualizar todos los leads y asesores.
        </small>
      </span>
    </label>

   <label className="registro-check full">
  <input
    type="checkbox"
    name="puedeEditarClases"
    checked={form.puedeEditarClases}
    onChange={handleChange}
    disabled={!puedeRegistrar || guardando}
  />
  <span>Permitir editar clases</span>
</label>

<label className="registro-check full">
  <input
    type="checkbox"
    name="puedePausarClases"
    checked={form.puedePausarClases}
    onChange={handleChange}
    disabled={!puedeRegistrar || guardando}
  />
  <span>Permitir pausar clases</span>
</label>

<label className="registro-check full">
  <input
    type="checkbox"
    name="puedeCancelarClases"
    checked={form.puedeCancelarClases}
    onChange={handleChange}
    disabled={!puedeRegistrar || guardando}
  />
  <span>Permitir cancelar clases</span>
</label>

<label className="registro-check full">
  <input
    type="checkbox"
    name="puedeEliminarClases"
    checked={form.puedeEliminarClases}
    onChange={handleChange}
    disabled={!puedeRegistrar || guardando}
  />
  <span>Permitir eliminar clases</span>
</label>
  </>
)}

              {!puedeAsignarPrincipal && puedeRegistrar && (
                <div className="registro-info full">
                  Los coordinadores creados desde este usuario quedarán como
                  secundarios y no podrán registrar otros coordinadores.
                </div>
              )}

              <div className="registro-actions full">
                <button
                  type="button"
                  className="registro-secondary-btn"
                  onClick={limpiarFormulario}
                  disabled={guardando}
                >
                  Limpiar
                </button>

                <button
                  type="submit"
                  className="registro-primary-btn"
                  disabled={!puedeRegistrar || guardando}
                >
                  {guardando ? "Creando..." : "Crear coordinador"}
                </button>
              </div>
            </form>
          </article>

          <aside className="registro-side-column">
  <button
    type="button"
    className="registro-coordinadores-btn"
    onClick={() => setMostrarCoordinadores(true)}
  >
    <span>Coordinadores registrados</span>
    <strong>{resumen.total}</strong>
  </button>

          <aside className="registro-card registro-guide-card">
            <div className="registro-card-head">
              <div>
                <h2>Jerarquía académica</h2>
                <p>Control claro de permisos para coordinadores.</p>
              </div>
            </div>

            <div className="registro-rule-list">
              <div>
                <span>Tu rol actual</span>
                <strong>
                  {roleLabels[roleActual] || usuarioActual?.role || "Usuario"}
                </strong>
              </div>

              <div>
                <span>Permiso de registro</span>
                <strong>{puedeRegistrar ? "Habilitado" : "Solo lectura"}</strong>
              </div>

              <div>
                <span>Regla principal</span>
                <p>
                  Solo gerente, administrador o coordinador principal puede
                  registrar coordinadores.
                </p>
              </div>

              <div>
                <span>Regla secundaria</span>
                <p>
                  Los coordinadores secundarios pueden operar el menú permitido,
                  pero no registrar más coordinadores.
                </p>
              </div>
            </div>
          </aside>
        </aside>


        </section>

     {mostrarCoordinadores && (
  <div
    className="registro-modal-overlay"
    onClick={() => setMostrarCoordinadores(false)}
  >
    <div
      className="registro-modal registro-modal-listado"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="registro-modal-head">
        <div>
          <p className="registro-kicker">Gestión académica</p>
          <h2>Coordinadores registrados</h2>
          <span>
            Consulta contacto, ciudad, estado, horas acumuladas y nivel de permiso.
          </span>
        </div>

        <button
          type="button"
          className="registro-modal-close"
          onClick={() => setMostrarCoordinadores(false)}
        >
          ×
        </button>
      </div>

     <div className="registro-search-actions">
  <input
    className="registro-search registro-search-modal"
    value={busqueda}
    onChange={(e) => setBusqueda(e.target.value)}
    placeholder="Buscar por nombre, email, ciudad o documento"
  />

  <button
    type="button"
    className="registro-secondary-btn"
    onClick={() => setMostrarEliminados((prev) => !prev)}
  >
    {mostrarEliminados ? "Ver activos" : "Ver eliminados"}
  </button>
</div>

      <div className="registro-table-wrap">
        <table className="registro-table">
          <thead>
            <tr>
              <th>Coordinador</th>
              <th>Teléfono</th>
              <th>Ciudad</th>
              <th>Estado</th>
              <th>Actividad</th>
              <th>Permiso</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan="7" className="registro-empty">
                  Cargando coordinadores...
                </td>
              </tr>
            ) : coordinadoresFiltrados.length === 0 ? (
              <tr>
               <td colSpan="7" className="registro-empty">
                  No hay coordinadores registrados.
                </td>
              </tr>
            ) : (
              coordinadoresFiltrados.map((coordinador) => {
                const estadoActual = String(
                  coordinador.estado || "activo"
                ).toLowerCase();

                const siguienteEstado =
                  estadoActual === "activo" ? "inactivo" : "activo";

                return (
                  <tr key={coordinador.id || coordinador.auth_uid}>
                    <td data-label="Coordinador">
                      <div className="registro-person-cell">
                        <div className="registro-avatar">
                          {obtenerIniciales(coordinador.nombre)}
                        </div>

                        <div>
                          <strong>{coordinador.nombre || "Sin nombre"}</strong>
                          <span>
                            {coordinador.area_academica || "General académico"}
                          </span>
                        </div>
                      </div>
                    </td>

                 
                 <td data-label="Teléfono">
  <strong>{coordinador.telefono || "-"}</strong>
</td>

<td data-label="Ciudad">
  {coordinador.ciudad || "-"}
</td>

<td data-label="Estado">
  {renderEstado(coordinador.estado)}
</td>

<td data-label="Actividad">
  <strong>{coordinador.clasesCreadas || 0} creadas</strong>
  <span>{coordinador.clasesReprogramadas || 0} reprogramadas</span>
</td>

<td data-label="Permiso">
  {renderPermiso(coordinador)}
</td>

                    <td data-label="Acciones">
                      <div className="registro-row-actions">
                        <button
                          type="button"
                          className="registro-mini-btn cyan"
                          onClick={() => setCoordinadorSeleccionado(coordinador)}
                        >
                          Ver
                        </button>

                      {puedeRegistrar &&
  String(coordinador.estado || "").toLowerCase() !== "eliminado" && (
    <button
      type="button"
      className={`registro-mini-btn ${
        siguienteEstado === "activo" ? "success" : "warning"
      }`}
      onClick={() =>
        actualizarEstadoCoordinador(coordinador, siguienteEstado)
      }
    >
      {siguienteEstado === "activo" ? "Activar" : "Inactivar"}
    </button>
  )}

{puedeRegistrar &&
  String(coordinador.estado || "").toLowerCase() === "eliminado" && (
    <button
      type="button"
      className="registro-mini-btn success"
      onClick={() => recuperarCoordinador(coordinador.id)}
    >
      Recuperar
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
    </div>
  </div>
)}

        {coordinadorSeleccionado && (
          <div
            className="registro-modal-overlay"
            onClick={() => setCoordinadorSeleccionado(null)}
          >
            <div
              className="registro-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="registro-modal-head">
                <div>
                  <p className="registro-kicker">Detalle del coordinador</p>
                  <h2>{coordinadorSeleccionado.nombre || "Coordinador"}</h2>
                  <span>
                    {coordinadorSeleccionado.email || "-"} ·{" "}
                    {coordinadorSeleccionado.ciudad || "Sin ciudad"}
                  </span>
                </div>

                <button
                  type="button"
                  className="registro-modal-close"
                  onClick={() => setCoordinadorSeleccionado(null)}
                >
                  ×
                </button>
              </div>

           <section className="registro-modal-kpis">
  <div>
    <small>Estado</small>
    <strong>
      {estadoLabels[
        String(coordinadorSeleccionado.estado || "activo").toLowerCase()
      ] || "Activo"}
    </strong>
  </div>

  <div>
    <small>Tipo</small>
    <strong>
      {coordinadorSeleccionado.puede_registrar_coordinadores
        ? "Principal"
        : "Secundario"}
    </strong>
  </div>

  <div>
    <small>Clases creadas</small>
    <strong>{coordinadorSeleccionado.clasesCreadas || 0}</strong>
  </div>

  <div>
    <small>Reprogramadas</small>
    <strong>{coordinadorSeleccionado.clasesReprogramadas || 0}</strong>
  </div>
</section>

              <section className="registro-modal-grid">
              <article className="registro-modal-card">
  <h3>Información personal</h3>

  <div className="registro-edit-grid">
    <label>
      Nombre
      <input
        value={coordinadorSeleccionado.nombre || ""}
        onChange={(e) =>
          setCoordinadorSeleccionado((prev) => ({
            ...prev,
            nombre: e.target.value,
          }))
        }
      />
    </label>

    <label>
      Teléfono
      <input
        value={coordinadorSeleccionado.telefono || ""}
        onChange={(e) =>
          setCoordinadorSeleccionado((prev) => ({
            ...prev,
            telefono: e.target.value,
          }))
        }
      />
    </label>

    <label>
      Ciudad
      <input
        value={coordinadorSeleccionado.ciudad || ""}
        onChange={(e) =>
          setCoordinadorSeleccionado((prev) => ({
            ...prev,
            ciudad: e.target.value,
          }))
        }
      />
    </label>

    <label>
      Dirección
      <input
        value={coordinadorSeleccionado.direccion || ""}
        onChange={(e) =>
          setCoordinadorSeleccionado((prev) => ({
            ...prev,
            direccion: e.target.value,
          }))
        }
      />
    </label>

    <label>
      Área académica
      <input
        value={coordinadorSeleccionado.area_academica || ""}
        onChange={(e) =>
          setCoordinadorSeleccionado((prev) => ({
            ...prev,
            area_academica: e.target.value,
          }))
        }
      />
    </label>

    <label>
      Estado
      <select
        value={coordinadorSeleccionado.estado || "activo"}
        onChange={(e) =>
          setCoordinadorSeleccionado((prev) => ({
            ...prev,
            estado: e.target.value,
          }))
        }
      >
        <option value="activo">Activo</option>
        <option value="inactivo">Inactivo</option>
        <option value="suspendido">Suspendido</option>
        <option value="eliminado">Eliminado</option>
      </select>
    </label>
  </div>
</article>

              <article className="registro-modal-card">
  <h3>Actividad del coordinador</h3>

  <div className="registro-detail-list">
    <p>
      <span>Clases creadas</span>
      <strong>{coordinadorSeleccionado.clasesCreadas || 0}</strong>
    </p>

    <p>
      <span>Clases reprogramadas</span>
      <strong>{coordinadorSeleccionado.clasesReprogramadas || 0}</strong>
    </p>

    <p>
      <span>Clases canceladas / pausadas</span>
      <strong>{coordinadorSeleccionado.clasesCanceladas || 0}</strong>
    </p>

    <p>
      <span>Última clase gestionada</span>
      <strong>{formatearFecha(coordinadorSeleccionado.ultimaClase)}</strong>
    </p>
  </div>
</article>
              </section>

              <article className="registro-modal-card">
                <h3>Observaciones</h3>
                <p className="registro-observacion">
                  {coordinadorSeleccionado.observaciones ||
                    "Sin observaciones registradas."}
                </p>
              </article>

<div className="registro-modal-actions">
  <button
    type="button"
    className="registro-primary-btn"
    onClick={() => editarCoordinador(coordinadorSeleccionado)}
  >
    Guardar cambios
  </button>

  <button
    type="button"
    className="registro-secondary-btn"
    onClick={() =>
      actualizarEstadoCoordinador(
        coordinadorSeleccionado,
        coordinadorSeleccionado.estado === "activo"
          ? "inactivo"
          : "activo"
      )
    }
  >
    {coordinadorSeleccionado.estado === "activo" ? "Inactivar" : "Activar"}
  </button>

  <button
    type="button"
    className="registro-secondary-btn"
    onClick={() => resetearPassword(coordinadorSeleccionado.email)}
  >
    Restablecer contraseña
  </button>

  <button
    type="button"
    className="registro-secondary-btn danger"
    onClick={() => eliminarCoordinador(coordinadorSeleccionado.id)}
  >
    Eliminar
  </button>
</div>

            </div>
          
          
          
          </div>
        )}
      </main>
    </div>
  );
}

export default RegistroCoordinadores;