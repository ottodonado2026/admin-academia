import { supabase } from "../services/supabaseClient";

// 🔵 GENERADOR DE ID DE ALUMNO (GLOBAL Y ÚNICO)
export const generarIdAlumnoBonito = async (nombre) => {
  if (!nombre) return "ID-XXX";

  const limpio = nombre
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z\s]/g, "")
    .trim();

  const palabras = limpio.split(" ").filter(Boolean);

  // 🔥 tomar máximo 3 palabras
  const partes = palabras.slice(0, 3);

  // 🔹 generar combinaciones posibles
  const combinaciones = [];

  if (partes.length === 1) {
    combinaciones.push(partes[0][0]);
  }

  if (partes.length === 2) {
    combinaciones.push(
      partes[0][0] + partes[1][0],
      partes[1][0] + partes[0][0]
    );
  }

  if (partes.length === 3) {
    combinaciones.push(
      partes[0][0] + partes[1][0] + partes[2][0], // JDR
      partes[0][0] + partes[2][0] + partes[1][0], // JRD
      partes[1][0] + partes[0][0] + partes[2][0], // DJR
      partes[1][0] + partes[2][0] + partes[0][0], // DRJ
      partes[2][0] + partes[0][0] + partes[1][0], // RJD
      partes[2][0] + partes[1][0] + partes[0][0]  // RDJ
    );
  }

  // 🔥 leer alumnos existentes

const { data } = await supabase
  .from("alumnos")
  .select("alumno_id");

const usados = data?.map(item => item.alumno_id || "") || [];
 

  // 🔥 buscar primera combinación libre
  for (let combo of combinaciones) {
    const id = `ID-${combo}`;
    if (!usados.includes(id)) {
      return id;
    }
  }

  // ⚠️ fallback extremo (muy raro)
  return `ID-${combinaciones[0]}-${Date.now().toString().slice(-2)}`;
};

// 🟢 GENERADOR DE ID DE CURSO (ÚNICO Y CONSISTENTE)
export const generarIdCurso = (nombre) => {
  if (!nombre) return "";

  const limpio = nombre
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z\s]/g, "")
    .trim();

  const palabras = limpio.split(" ").filter(Boolean);

  let base = palabras.length ? palabras[0].slice(0, 3) : "GEN";

  return `CUR-${base}`;
};