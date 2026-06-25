import { supabase } from "./supabaseClient";

// Detectar sistema operativo y navegador para la auditoría
const detectarDispositivo = () => {
  if (typeof window === "undefined" || !window.navigator) {
    return { sistema: "Desconocido", navegador: "Desconocido" };
  }

  const ua = window.navigator.userAgent;
  let sistema = "Desconocido";
  let navegador = "Desconocido";

  if (/Windows/i.test(ua)) sistema = "Windows";
  else if (/Macintosh/i.test(ua)) sistema = "macOS";
  else if (/Linux/i.test(ua)) sistema = "Linux";
  else if (/Android/i.test(ua)) sistema = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) sistema = "iOS";

  if (/Chrome/i.test(ua)) navegador = "Chrome";
  else if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) navegador = "Safari";
  else if (/Firefox/i.test(ua)) navegador = "Firefox";
  else if (/Edge/i.test(ua)) navegador = "Edge";

  return { sistema, navegador };
};

/**
 * Registra una acción en la tabla de auditorías de Supabase.
 * @param {string} accion - 'crear', 'editar', 'eliminar', 'descargar'
 * @param {string} tabla - Tabla afectada (ej: 'profesores', 'alumnos', 'pagos')
 * @param {string|number} registroId - ID del registro afectado
 * @param {Object} detalles - Campos modificados, filtros, totales, etc.
 * @param {Object} usuarioActual - Usuario logueado en sesión
 */
export const registrarAuditoria = async (accion, tabla, registroId, detalles = {}, usuarioActual = null) => {
  try {
    const { sistema, navegador } = detectarDispositivo();

    // Obtener IP aproximada (puedes usar un endpoint público si lo deseas, pero por rendimiento 
    // y privacidad localizamos lo disponible en cabeceras o registramos el contexto de red)
    let ip = "Cliente local";
    try {
      // Intento rápido de fetch a servicio ip (opcional, sin bloquear)
      const res = await fetch("https://api.ipify.org?format=json");
      const ipData = await res.json();
      if (ipData?.ip) ip = ipData.ip;
    } catch (e) {
      // Fallback silencioso si hay bloqueador o sin internet
    }

    const payload = {
      usuario_id: usuarioActual?.id || "anon",
      usuario_nombre: usuarioActual?.nombre || usuarioActual?.email || "sin-nombre",
      usuario_email: usuarioActual?.email || "sin-email",
      rol: usuarioActual?.role || usuarioActual?.rol || "sin-rol",
      accion,
      tabla,
      registro_id: String(registroId),
      detalles: {
        ...detalles,
        sistema,
        navegador
      },
      ip,
      navegador: `${navegador} on ${sistema}`
    };

    const { error } = await supabase.from("auditorias").insert([payload]);
    
    if (error) {
      console.error("Error guardando auditoría:", error);
    } else {
      console.log(`Auditoría guardada ✅: [${accion.toUpperCase()}] en tabla ${tabla}`);
    }
  } catch (err) {
    console.error("Error en registrarAuditoria:", err);
  }
};
