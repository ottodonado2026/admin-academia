/**
 * @typedef {Object} Terminologia
 * @property {string} alumno
 * @property {string} profesor
 * @property {string} grado
 * @property {string} grupo
 * @property {string} boletin
 * @property {string} mensualidad
 */

/**
 * @typedef {Object} Modulos
 * @property {boolean} contabilidad
 * @property {boolean} nomina
 * @property {boolean} cuentas_por_cobrar
 * @property {boolean} notas
 * @property {boolean} asistencia
 * @property {boolean} boletines
 * @property {boolean} portal_padres
 * @property {boolean} circulares
 * @property {boolean} eventos
 * @property {boolean} observaciones
 * @property {boolean} historial_medico
 * @property {boolean} transporte
 * @property {boolean} biblioteca
 */

/**
 * @typedef {Object} Academico
 * @property {'1-10' | '0-5' | 'A-F' | 'porcentaje'} escala
 * @property {'bimestres' | 'trimestres' | 'semestres'} periodos
 * @property {number} numPeriodos
 * @property {number} notaAprobatoria
 * @property {number} decimales
 */

/**
 * @typedef {Object} Pagos
 * @property {string} moneda
 * @property {string} simbolo
 * @property {number} diasMoraAlerta
 */

/**
 * @typedef {Object} InstitucionConfig
 * @property {string} nombre
 * @property {'colegio' | 'academia_musica' | 'academia_idiomas'} tipo
 * @property {string} logo
 * @property {string} colorPrimario
 * @property {string} colorSecundario
 * @property {string} slogan
 * @property {Terminologia} terminologia
 * @property {Modulos} modulos
 * @property {Academico} academico
 * @property {Pagos} pagos
 */

/** @type {InstitucionConfig} */
export const config = {
  nombre: "Colegio San José",
  tipo: "colegio",           
  logo: "/logo.png",
  colorPrimario: "#1E3A5F",
  colorSecundario: "#D4A017",
  slogan: "Educando con excelencia",

  terminologia: {
    alumno: "estudiante",
    profesor: "docente",
    grado: "grado",
    grupo: "curso",
    boletin: "boletín de notas",
    mensualidad: "pensión",
  },

  modulos: {
    contabilidad: true,
    nomina: true,
    cuentas_por_cobrar: true,
    notas: true,
    asistencia: true,
    boletines: true,
    portal_padres: true,
    circulares: true,
    eventos: true,
    observaciones: true,
    historial_medico: true,
    transporte: false,
    biblioteca: false,
  },

  academico: {
    escala: "1-10",
    periodos: "bimestres",
    numPeriodos: 4,
    notaAprobatoria: 6.0,
    decimales: 1,
  },

  pagos: {
    moneda: "COP",
    simbolo: "$",
    diasMoraAlerta: 30,
  }
};
