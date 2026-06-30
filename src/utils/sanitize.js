/**
 * sanitize.js — Utilidad Centralizada de Sanitización Anti-XSS
 * Usa DOMPurify para limpiar cualquier string antes de renderizarlo en el DOM.
 * Importa esta función en cualquier componente donde muestres datos de la base de datos.
 */
import DOMPurify from "dompurify";

/**
 * Limpia un string de posibles inyecciones HTML / XSS.
 * @param {string} input - El string a sanitizar.
 * @returns {string} - El string limpio y seguro.
 */
export function sanitize(input) {
  if (input == null) return "";
  return DOMPurify.sanitize(String(input), {
    ALLOWED_TAGS: [], // No permite ninguna etiqueta HTML
    ALLOWED_ATTR: [], // No permite atributos
  });
}

/**
 * Sanitiza un objeto completo (útil para limpiar registros de la base de datos).
 * @param {object} obj - El objeto a sanitizar.
 * @param {string[]} fields - Los campos del objeto a limpiar.
 * @returns {object} - El objeto con los campos limpios.
 */
export function sanitizeRecord(obj, fields = []) {
  if (!obj) return obj;
  const result = { ...obj };
  fields.forEach((field) => {
    if (typeof result[field] === "string") {
      result[field] = sanitize(result[field]);
    }
  });
  return result;
}
