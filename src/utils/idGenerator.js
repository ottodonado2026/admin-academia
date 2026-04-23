import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebase";

// 🔵 GENERADOR DE ID DE ALUMNO (GLOBAL Y ÚNICO)
export const generarIdAlumnoBonito = async (nombre) => {
  const limpio = nombre
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z\s]/g, "")
    .trim();

  const palabras = limpio.split(" ").filter(Boolean);

  let base = palabras.length ? palabras[0].slice(0, 3) : "GEN";

  // 🔥 leer alumnos reales desde Firebase
  const snapshot = await getDocs(collection(db, "alumnos"));

  const usados = snapshot.docs
    .map((doc) => doc.data().alumnoId || "")
    .filter((id) => id.startsWith(`ID-${base}`))
    .map((id) => Number(id.replace(`ID-${base}`, "")))
    .filter((n) => !Number.isNaN(n));

  const siguiente = usados.length ? Math.max(...usados) + 1 : 1;

  return `ID-${base}${siguiente}`;
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