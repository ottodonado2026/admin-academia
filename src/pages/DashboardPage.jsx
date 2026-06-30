import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "./DashboardPage.css";
import { config } from "../config/institucion";

import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { supabase } from "../services/supabaseClient";
import { METODOS_PAGO } from "../constants/metodosPago";
import { useAuth } from "../context/AuthContext";
import { useDashboard } from "../hooks/useDashboard";
import { registrarAuditoria } from "../services/auditoriaService";

const meses = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function DashboardPage() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const hoy = new Date();
  const [mesSeleccionado, setMesSeleccionado] = useState(hoy.getMonth());
  const [anioSeleccionado, setAnioSeleccionado] = useState(hoy.getFullYear());

  const { ingresos, egresos, alumnos, pagos, historialPagos, loading: loadingData, refetch } = useDashboard();
  const { user, role, userData, logout } = useAuth();

  const [busqueda, setBusqueda] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("mes");
  const [filtroMetodo, setFiltroMetodo] = useState("todos");
  const [filtroCurso, setFiltroCurso] = useState("todos");
  const [orden, setOrden] = useState("recientes");

  const [fechaInicioCustom, setFechaInicioCustom] = useState("");
  const [fechaFinCustom, setFechaFinCustom] = useState("");
  const [fechaExacta, setFechaExacta] = useState("");

  // Estados para la exportación profesional de Excel
  const [isExporting, setIsExporting] = useState(false);
  const [exportStep, setExportStep] = useState(0);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const usuarioActual = {
    ...user,
    nombre: userData?.nombre || user?.email,
    rol: role === "owner" ? "Gerente" : role === "contador" ? "Contador" : role === "coordinador" ? "Coordinador" : "Usuario"
  };

  const filtrosActivos = {
    busqueda,
    filtroFecha,
    filtroMetodo,
    filtroCurso,
    orden,
    fechaInicioCustom,
    fechaFinCustom,
    fechaExacta,
    mesSeleccionado,
    anioSeleccionado,
  };




  useEffect(() => {
    let debounceTimer = null;
    const debouncedRefetch = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => refetch(), 400);
    };

    const channel = supabase
      .channel("realtime-dashboard")
      .on("postgres_changes", { event: "*", schema: "public", table: "historial_pagos" }, debouncedRefetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "pagos" }, debouncedRefetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "alumnos" }, debouncedRefetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "ingresos" }, debouncedRefetch)
      .on("postgres_changes", { event: "*", schema: "public", table: "egresos" }, debouncedRefetch)
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    if (!showExportMenu) return;

    const handleOutsideClick = (e) => {
      if (!e.target.closest(".export-menu-container")) {
        setShowExportMenu(false);
      }
    };

    document.addEventListener("click", handleOutsideClick);
    return () => {
      document.removeEventListener("click", handleOutsideClick);
    };
  }, [showExportMenu]);


  const formatearPesos = (valor) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(valor || 0);

  const normalizarFecha = (fecha) => {
    const d = new Date(fecha);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const chequearFiltroFecha = (fechaObj) => {
    if (!fechaObj || Number.isNaN(fechaObj.getTime())) return false;
    const itemFecha = normalizarFecha(fechaObj);
    const hoyFecha = normalizarFecha(new Date());

    if (filtroFecha === "hoy") return itemFecha === hoyFecha;

    if (filtroFecha === "semana") {
      const d = new Date(fechaObj);
      const hoy = new Date();
      // Obtener el lunes de la semana actual
      const diaSemana = hoy.getDay() === 0 ? 6 : hoy.getDay() - 1; 
      const primerDia = new Date(hoy.setDate(hoy.getDate() - diaSemana));
      primerDia.setHours(0, 0, 0, 0);
      
      const ultimoDia = new Date(primerDia);
      ultimoDia.setDate(ultimoDia.getDate() + 6);
      ultimoDia.setHours(23, 59, 59, 999);
      
      return d >= primerDia && d <= ultimoDia;
    }

    if (filtroFecha === "mes") {
      return fechaObj.getMonth() === mesSeleccionado && fechaObj.getFullYear() === anioSeleccionado;
    }

    if (filtroFecha === "anio") {
      return fechaObj.getFullYear() === anioSeleccionado;
    }

    if (filtroFecha === "fecha" && fechaExacta) {
      return itemFecha === fechaExacta;
    }

    if (filtroFecha === "rango" && fechaInicioCustom && fechaFinCustom) {
      return itemFecha >= fechaInicioCustom && itemFecha <= fechaFinCustom;
    }

    return true;
  };

  // 🔥 FILTROS
  const ingresosFiltrados = useMemo(() => {
    return ingresos.filter((item) => {
      if (!item.fecha) return false;
      const fechaMatch = chequearFiltroFecha(new Date(item.fecha));

      // 🔹 FILTRO POR MÉTODO
      const metodoItem = (item.metodo || "").trim().toLowerCase();
      const metodoFiltro = (filtroMetodo || "").trim().toLowerCase();
      const metodoMatch = metodoFiltro === "todos" || metodoItem === metodoFiltro;

      // 🔹 FILTRO POR BÚSQUEDA
      const textoBusqueda = busqueda.trim().toLowerCase();
      const busquedaMatch =
        !textoBusqueda ||
        (item.descripcion || "").toLowerCase().includes(textoBusqueda) ||
        (item.referencia || "").toLowerCase().includes(textoBusqueda);

      return fechaMatch && metodoMatch && busquedaMatch;
    });
  }, [ingresos, filtroFecha, mesSeleccionado, anioSeleccionado, fechaExacta, fechaInicioCustom, fechaFinCustom, filtroMetodo, busqueda]);



  const egresosFiltrados = useMemo(() => {
    return egresos.filter((item) => {
      if (!item.fecha) return false;
      const fechaMatch = chequearFiltroFecha(new Date(item.fecha));

      // 🔹 FILTRO MÉTODO
      const metodoItem = (item.metodo || "").trim().toLowerCase();
      const metodoFiltro = (filtroMetodo || "").trim().toLowerCase();
      const metodoMatch = metodoFiltro === "todos" || metodoItem === metodoFiltro;

      // 🔹 FILTRO BÚSQUEDA
      const textoBusqueda = busqueda.trim().toLowerCase();
      const busquedaMatch =
        !textoBusqueda ||
        (item.descripcion || "").toLowerCase().includes(textoBusqueda) ||
        (item.categoria || "").toLowerCase().includes(textoBusqueda);

      return fechaMatch && metodoMatch && busquedaMatch;
    });
  }, [egresos, filtroFecha, mesSeleccionado, anioSeleccionado, fechaExacta, fechaInicioCustom, fechaFinCustom, filtroMetodo, busqueda]);

const historialBase = useMemo(() => {
  return historialPagos.map((item) => {

    const fecha = item.fecha_pago
      ? new Date(item.fecha_pago)
      : item.created_at
      ? new Date(item.created_at)
      : null;

    return {
      id: item.id,
      alumno: item.alumno || "Sin nombre",

      alumnoId: item.alumno_id || item.alumno_db_id || "-",

      curso: item.curso_id || item.curso || "Sin curso",

      monto: Number(item.monto || 0),

      fecha,

      metodo: item.metodo_pago?.trim() || "Sin método",

      referencia: item.referencia_pago?.trim() || "-",
    };

  }).filter(item => item.fecha && !Number.isNaN(item.fecha.getTime()));
}, [historialPagos]);




const historialFiltrado = useMemo(() => {
  let lista = historialBase.filter((item) => {
    const textoBusqueda = busqueda.trim().toLowerCase();

    const nombreMatch =
      !textoBusqueda ||
      item.alumno.toLowerCase().includes(textoBusqueda) ||
      item.curso.toLowerCase().includes(textoBusqueda) ||
      item.referencia.toLowerCase().includes(textoBusqueda) ||
      item.alumnoId.toLowerCase().includes(textoBusqueda);

    const metodoItem = (item.metodo || "").trim().toLowerCase();
const metodoFiltro = (filtroMetodo || "").trim().toLowerCase();

const cursoItem = (item.curso || "").toString().trim().toLowerCase();
const cursoFiltro = (filtroCurso || "").toString().trim().toLowerCase();

const metodoMatch =
  metodoFiltro === "todos" || metodoItem === metodoFiltro;

const cursoMatch =
  cursoFiltro === "todos" || cursoItem === cursoFiltro;

   
    const fechaMatch = chequearFiltroFecha(item.fecha);

    return nombreMatch && metodoMatch && cursoMatch && fechaMatch;
  });

  return lista;
}, [historialBase, busqueda, filtroFecha, mesSeleccionado, anioSeleccionado, fechaExacta, fechaInicioCustom, fechaFinCustom, filtroMetodo, filtroCurso]);


const ingresosCombinados = useMemo(() => {
  const pagos = historialFiltrado.map((item) => ({
    id: `pago-${item.id}`,
    tipo: "Pago",
    categoria: item.curso,
    descripcion: item.referencia,
    monto: item.monto,
    metodo: item.metodo,
    fecha: item.fecha,
  }));

  const manuales = ingresosFiltrados.map((item) => ({
    id: `manual-${item.id}`,
    tipo: "Manual",
    categoria: item.categoria || "Ingreso",
    descripcion: item.descripcion || item.referencia || "-",
    monto: Number(item.monto || 0),
    metodo: item.metodo,
    fecha: new Date(item.fecha),
  }));

  return [...pagos, ...manuales];
}, [historialFiltrado, ingresosFiltrados]);


const top5Ingresos = useMemo(() => {
  return [...ingresosCombinados]
    .sort((a, b) => b.monto - a.monto)
    .slice(0, 5);
}, [ingresosCombinados]);


// 🔥 FUENTE HÍBRIDA (historial + fallback a planes)
// 🔥 PAGOS REALES DESDE HISTORIAL (FUENTE ÚNICA)

const pagosFiltradosDashboard = historialFiltrado.map((item) => ({
  monto: Number(item.monto || 0),
  fecha: item.fecha,
  alumnoId: item.alumnoId,
  alumno: item.alumno,
  curso: item.curso,
  metodo: item.metodo,
  referencia: item.referencia,
}));

const totalPagosMes = pagosFiltradosDashboard.reduce(
  (acc, p) => acc + p.monto,
  0
);

const totalIngresosManual = ingresosFiltrados.reduce(
  (acc, item) => acc + Number(item.monto || 0),
  0
);

// 🔥 NORMALIZACIÓN DE MÉTRICAS (CLARO Y PROFESIONAL)

// dinero real de alumnos
const pagosAlumnos = totalPagosMes;

// ingresos manuales (admin)
const ingresosManuales = totalIngresosManual;

// total ingresos real del negocio
const totalIngresos = pagosAlumnos + ingresosManuales;


// utilidad




// 🔥 NUEVO: separar métricas financieras
const revenueMes = totalIngresosManual;
const cashflowMes = totalPagosMes;
const totalIngresosMes = revenueMes + cashflowMes;

  const totalEgresosMes = egresosFiltrados.reduce(
    (acc, item) => acc + Number(item.monto || 0),
    0
  );

  // 🔥 AHORA SÍ CORRECTO (orden correcto)

const totalEgresos = totalEgresosMes;

const utilidad = totalIngresos - totalEgresos;

const margenReal =
  totalIngresos > 0
    ? (utilidad / totalIngresos) * 100
    : 0;

  // 🔥 NUEVO: separar costos y gastos
const costosMes = egresosFiltrados.filter(e => e.tipo === "costo");
const gastosMes = egresosFiltrados.filter(e => e.tipo === "gasto");

// 🔥 NUEVO: totales separados
const totalCostosMes = costosMes.reduce(
  (acc, e) => acc + Number(e.monto || 0),
  0
);

const totalGastosMes = gastosMes.reduce(
  (acc, e) => acc + Number(e.monto || 0),
  0
);
if (import.meta.env.DEV) {
  console.log(totalCostosMes, totalGastosMes);
}




  const utilidadMes = totalIngresosMes - totalEgresosMes;
  const utilidadReal = totalIngresosMes - totalCostosMes - totalGastosMes;

  const margen = totalIngresosMes > 0 
  ? (utilidadReal / totalIngresosMes) * 100 
  : 0;

  // 🔥 MÉTRICAS REALES DESDE HISTORIAL

// 🔥 HISTÓRICO (todos los pagos, no solo mes)

const totalRecaudado = pagosFiltradosDashboard.reduce(
  (acc, item) => acc + item.monto,
  0
);

const totalMovimientos = pagosFiltradosDashboard.length;

const ultimoMovimiento =
  pagosFiltradosDashboard.length > 0
    ? [...pagosFiltradosDashboard].sort((a, b) => b.fecha - a.fecha)[0]
    : null;

const alumnosConPagos = new Set(
  pagosFiltradosDashboard.map((item) => item.alumnoId)
).size;


  const alumnosActivos = alumnos.filter((a) => a.estado === "activo").length;

  const pagosPendientes = pagos.filter(
    (p) => p.estado === "Pendiente" || p.estado === "En mora"
  ).length;

  // 🔥 HISTÓRICO INGRESOS
  const ventasPorMes = useMemo(() => {
  const data = Array(12).fill(0);

  // 🔹 INGRESOS MANUALES
  ingresos.forEach((i) => {
    if (!i.fecha) return;
    const f = new Date(i.fecha);

    if (f.getFullYear() === anioSeleccionado) {
      data[f.getMonth()] += Number(i.monto || 0);
    }
  });

  // 🔹 PAGOS REALES (historial)
  historialBase.forEach((item) => {
    const f = item.fecha;

    if (f.getFullYear() === anioSeleccionado) {
      data[f.getMonth()] += Number(item.monto || 0);
    }
  });

  return data;
}, [ingresos, historialBase, anioSeleccionado]);

  const maxVenta = Math.max(...ventasPorMes, 1);
  const ventasValidas = ventasPorMes.filter(v => v > 0);
  const promedioVentas = ventasValidas.length ? ventasValidas.reduce((a, b) => a + b, 0) / ventasValidas.length : 0;

  // 🔥 NUEVO: EGRESOS POR MES (BIEN UBICADO)
  const egresosPorMes = useMemo(() => {
    const data = Array(12).fill(0);

    egresos.forEach((e) => {
      if (!e.fecha) return;
      const f = new Date(e.fecha);

      if (f.getFullYear() === anioSeleccionado) {
        data[f.getMonth()] += Number(e.monto || 0);
      }
    });

    return data;
  }, [egresos, anioSeleccionado]);
  const maxEgreso = Math.max(...egresosPorMes, 1);
  const egresosValidos = egresosPorMes.filter(v => v > 0);
  const promedioEgresos = egresosValidos.length ? egresosValidos.reduce((a, b) => a + b, 0) / egresosValidos.length : 0;



const aniosDisponibles = useMemo(() => {
  const anioActual = new Date().getFullYear();
  const rango = [];

  for (let i = anioActual - 5; i <= anioActual + 1; i++) {
    rango.push(i);
  }

  return rango;
}, []);


const detectarDispositivo = () => {
  const ua = navigator.userAgent;

  let sistema = "Desconocido";
  let navegador = "Desconocido";

  if (/Windows/i.test(ua)) sistema = "Windows";
  else if (/Mac/i.test(ua)) sistema = "MacOS";
  else if (/Android/i.test(ua)) sistema = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) sistema = "iOS";

  if (/Chrome/i.test(ua)) navegador = "Chrome";
  else if (/Safari/i.test(ua)) navegador = "Safari";
  else if (/Firefox/i.test(ua)) navegador = "Firefox";
  else if (/Edge/i.test(ua)) navegador = "Edge";

  return { sistema, navegador };
};



const registrarDescarga = async (tipo = "excel_dashboard", archivoNombre = "dashboard_financiero.xlsx") => {
  try {
    const { sistema, navegador } = detectarDispositivo();

    await supabase.from("dashboard_descargas").insert([
      {
        usuario_id: usuarioActual?.id || "anon",
       

usuario_nombre: usuarioActual?.nombre || usuarioActual?.email,
 usuario_email: usuarioActual?.email || "sin-email",
rol: usuarioActual?.rol || "sin-rol",


        archivo_nombre: archivoNombre,
        tipo: tipo,

        mes: mesSeleccionado,
        anio: anioSeleccionado,

        filtros: {
          busqueda,
          metodo: filtroMetodo,
          curso: filtroCurso,
        },

        total_ingresos: totalIngresos,
        total_egresos: totalEgresosMes,
        utilidad: utilidad,
        total_movimientos: totalMovimientos,

        dispositivo: sistema,
        sistema_operativo: sistema,
        navegador: navegador,
      },
    ]);

    // Registrar en auditoría
    await registrarAuditoria(
      "descargar",
      "dashboard",
      tipo,
      {
        archivo_nombre: archivoNombre,
        tipo: tipo,
        mes: mesSeleccionado,
        anio: anioSeleccionado,
        filtros: {
          busqueda,
          metodo: filtroMetodo,
          curso: filtroCurso,
        },
        total_ingresos: totalIngresos,
        total_egresos: totalEgresosMes,
        utilidad: utilidad,
        total_movimientos: totalMovimientos,
      },
      usuarioActual
    );
  } catch (error) {
    console.error("Error guardando descarga:", error);
  }
};

  const generarExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportStep(1); // Paso 1: Analizando filtros y registros
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
      await delay(600);
      await registrarDescarga("excel_dashboard", "dashboard_financiero.xlsx");

      setExportStep(2); // Paso 2: Procesando información financiera
      await delay(600);

      // Determinar texto del periodo según filtros activos
      let periodoTexto = `${meses[mesSeleccionado]} ${anioSeleccionado}`;
      if (filtroFecha === "hoy") {
        periodoTexto = `Hoy (${normalizarFecha(new Date())})`;
      } else if (filtroFecha === "fecha" && fechaExacta) {
        periodoTexto = `Día ${fechaExacta}`;
      } else if (filtroFecha === "rango" && fechaInicioCustom && fechaFinCustom) {
        periodoTexto = `Rango (${fechaInicioCustom} al ${fechaFinCustom})`;
      }

      const workbook = new ExcelJS.Workbook();

      /* ======================================================
         📄 HOJA 1: RESUMEN
      ====================================================== */
      const resumenSheet = workbook.addWorksheet("Resumen");

      // 🔹 NOMBRE EMPRESA
      resumenSheet.mergeCells("A1:G1");
      const empresaCell = resumenSheet.getCell("A1");
      empresaCell.value = config.nombre.toUpperCase();
      empresaCell.font = {
        size: 18,
        bold: true,
        color: { argb: "FF1F2937" },
      };
      empresaCell.alignment = {
        horizontal: "center",
        vertical: "middle",
      };

      // 🔹 SUBTÍTULO
      resumenSheet.mergeCells("A2:G2");
      const tituloCell = resumenSheet.getCell("A2");
      tituloCell.value = "Reporte General - Dashboard";
      tituloCell.font = {
        size: 14,
        bold: true,
      };
      tituloCell.alignment = {
        horizontal: "center",
      };

      // 🔹 FECHA
      resumenSheet.mergeCells("A3:G3");
      const fechaCell = resumenSheet.getCell("A3");
      fechaCell.value = `Generado el: ${new Date().toLocaleString()}`;
      fechaCell.alignment = {
        horizontal: "center",
      };

      // 🔹 USUARIO QUE GENERA
      resumenSheet.mergeCells("A4:G4");
      const usuarioCell = resumenSheet.getCell("A4");
      usuarioCell.value = `Generado por: ${
        usuarioActual?.nombre || usuarioActual?.email
      } (${usuarioActual?.rol || "Usuario"})`;
      usuarioCell.font = {
        size: 11,
      };
      usuarioCell.alignment = {
        horizontal: "center",
      };

      // 🔹 FILTROS
      resumenSheet.mergeCells("A5:G5");
      const filtroCell = resumenSheet.getCell("A5");
      filtroCell.value = `Filtros → Periodo: ${periodoTexto} | Búsqueda: ${busqueda || "Ninguna"} | Método: ${filtroMetodo} | Curso: ${filtroCurso}`;
      filtroCell.font = {
        italic: true,
        size: 10,
      };
      filtroCell.alignment = {
        horizontal: "center",
      };

      // espacio
      resumenSheet.addRow([]);
      resumenSheet.addRow([]);

      // 🔹 KPIs
      const header = resumenSheet.addRow([
        "Total ingresos",
        "Pagos alumnos",
        "Total recaudado",
        "Movimientos",
        "Alumnos",
        "Utilidad",
        "Margen",
      ]);

      header.eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF1E293B" },
        };
        cell.alignment = { horizontal: "center" };
      });

      const valores = resumenSheet.addRow([
        totalIngresosMes,
        totalPagosMes,
        totalRecaudado,
        totalMovimientos,
        alumnosConPagos,
        utilidadReal,
        `${margen.toFixed(1)}%`,
      ]);
      const startRow = header.number;
      const endRow = valores.number;
      const startCol = 1;
      const endCol = 7;

      for (let row = startRow; row <= endRow; row++) {
        for (let col = startCol; col <= endCol; col++) {
          const cell = resumenSheet.getRow(row).getCell(col);
          cell.border = {
            top: { style: "thin", color: { argb: "FF999999" } },
            left: { style: "thin", color: { argb: "FF999999" } },
            bottom: { style: "thin", color: { argb: "FF999999" } },
            right: { style: "thin", color: { argb: "FF999999" } },
          };
        }
      }

      // 🔥 BORDES COMPLETOS TIPO TABLA PROFESIONAL
      [header, valores].forEach((row) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FFCCCCCC" } },
            left: { style: "thin", color: { argb: "FFCCCCCC" } },
            bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
            right: { style: "thin", color: { argb: "FFCCCCCC" } },
          };
          cell.alignment = {
            vertical: "middle",
            horizontal: "center",
          };
        });
      });

      resumenSheet.autoFilter = {
        from: "A8",
        to: "G8",
      };
      resumenSheet.addRow([]);
      resumenSheet.addRow([]);

      // 🔹 formato moneda
      [1, 2, 3, 6].forEach((col) => {
        const cell = valores.getCell(col);
        cell.numFmt = '"$"#,##0';
        cell.alignment = { horizontal: "right" }; // 🔥 clave
      });

      // 🔹 colores KPI
      valores.getCell(6).font = {
        bold: true,
        color: { argb: utilidadReal >= 0 ? "FF00FF00" : "FFFF0000" }
      };

      valores.getCell(7).font = {
        bold: true,
        color: { argb: margen >= 0 ? "FF00FF00" : "FFFF0000" }
      };

      // 🔹 gráfico simple (barra simulada)
      resumenSheet.addRow([]);
      resumenSheet.addRow(["Comparación"]);

      const chartData = [
        ["Ingresos", totalIngresosMes],
        ["Egresos", totalEgresosMes],
        ["Utilidad", utilidadReal],
      ];

      const maxValor = Math.max(
        totalIngresosMes,
        totalEgresosMes,
        Math.abs(utilidadReal),
        1
      );

      chartData.forEach(([label, val]) => {
        const porcentaje = Math.abs(val) / maxValor;
        const barraLength = Math.max(1, Math.floor(porcentaje * 30));
        const barra = "▇".repeat(barraLength);
        const row = resumenSheet.addRow([
          label,
          val,
          barra,
        ]);

        // formato moneda
        row.getCell(2).numFmt = '"$"#,##0';
        row.getCell(2).alignment = { horizontal: "right" };

        // estilo visual más limpio
        row.getCell(3).font = {
          color: {
            argb:
              label === "Egresos"
                ? "FFFF4D4D"
                : label === "Utilidad"
                ? val >= 0
                  ? "FF00FF00"
                  : "FFFF0000"
                : "FF0099FF",
          },
          bold: true,
        };
        row.getCell(3).alignment = { horizontal: "left" };
      });

      // ancho automático
      resumenSheet.columns = [
        { width: 30 },
        { width: 30 },
        { width: 50 },
      ];

      /* ======================================================
         📄 HOJA 2: DETALLE
      ====================================================== */
      setExportStep(3); // Paso 3: Diseñando hojas y gráficos de Excel
      await delay(600);

      const detalleSheet = workbook.addWorksheet("Detalle");

      // 🔹 encabezados
      detalleSheet.views = [{ state: "frozen", ySplit: 7 }];

      // Encabezado estilo Historial
      detalleSheet.mergeCells("A1:G1");
      detalleSheet.getCell("A1").value = "CARIBBEAN STUDIO ACADEMY";

      detalleSheet.mergeCells("A2:G2");
      detalleSheet.getCell("A2").value = "Reporte Dashboard";

      detalleSheet.mergeCells("A3:G3");
      detalleSheet.getCell("A3").value = `Generado el: ${normalizarFecha(new Date())}`;

      detalleSheet.mergeCells("A4:G4");
      detalleSheet.getCell("A4").value = `Periodo: ${periodoTexto}`;

      detalleSheet.addRow([]);

      const headerRow = detalleSheet.addRow([
        "Fecha",
        "Alumno",
        "ID Alumno",
        "Curso",
        "Método de pago",
        "Referencia",
        "Monto (COP)",
      ]);

      ["A1", "A2", "A3", "A4"].forEach((cellRef, index) => {
        const cell = detalleSheet.getCell(cellRef);
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
        };
        cell.font = {
          bold: true,
          size: index === 0 ? 16 : 12,
          color: { argb: "FF111111" },
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: index === 0 ? "FFD9EAD3" : "FFF3F3F3" },
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFB7B7B7" } },
          left: { style: "thin", color: { argb: "FFB7B7B7" } },
          bottom: { style: "thin", color: { argb: "FFB7B7B7" } },
          right: { style: "thin", color: { argb: "FFB7B7B7" } },
        };
      });

      headerRow.eachCell((cell) => {
        cell.font = {
          bold: true,
          color: { argb: "FFFFFFFF" },
        };
        cell.alignment = {
          horizontal: "center",
          vertical: "middle",
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FF1F4E78" },
        };
        cell.border = {
          top: { style: "thin", color: { argb: "FFBFBFBF" } },
          left: { style: "thin", color: { argb: "FFBFBFBF" } },
          bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
          right: { style: "thin", color: { argb: "FFBFBFBF" } },
        };
      });

      // 🔹 datos (usamos la lista filtrada del dashboard directamente para respetar rango y filtros)
      const dataExport = [...historialFiltrado];

      if (!dataExport.length) {
        alert("No hay datos para exportar con los filtros actuales.");
        setIsExporting(false);
        setExportStep(0);
        return;
      }

      dataExport.forEach((item) => {
        const row = detalleSheet.addRow([
          normalizarFecha(item.fecha),
          item.alumno,
          item.alumnoId,
          item.curso,
          item.metodo,
          item.referencia,
          item.monto,
        ]);

        // formato moneda
        row.getCell(7).numFmt = '"$"#,##0';

        // 🔥 bordes estilo tabla profesional
        row.eachCell((cell) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FFDDDDDD" } },
            left: { style: "thin", color: { argb: "FFDDDDDD" } },
            bottom: { style: "thin", color: { argb: "FFDDDDDD" } },
            right: { style: "thin", color: { argb: "FFDDDDDD" } },
          };
          cell.alignment = {
            vertical: "middle",
            horizontal: cell.col === 7 ? "right" : "left",
          };
        });
      });

      // 🔹 total profesional
      const total = dataExport.reduce((acc, i) => acc + i.monto, 0);

      detalleSheet.addRow([]);

      const totalRow = detalleSheet.addRow([
        "",
        "",
        "",
        "",
        "",
        "TOTAL GENERAL",
        total,
      ]);

      // estilo completo de fila
      totalRow.eachCell((cell, colNumber) => {
        cell.font = {
          bold: true,
          size: 12,
          color: { argb: "FF000000" },
        };
        cell.alignment = {
          vertical: "middle",
          horizontal: colNumber === 7 ? "right" : "center",
        };
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE2EFDA" }, // verde suave tipo resumen financiero
        };
        cell.border = {
          top: { style: "medium", color: { argb: "FFAAAAAA" } },
          left: { style: "thin", color: { argb: "FFAAAAAA" } },
          bottom: { style: "medium", color: { argb: "FFAAAAAA" } },
          right: { style: "thin", color: { argb: "FFAAAAAA" } },
        };
      });

      // formato moneda
      totalRow.getCell(7).numFmt = '"$"#,##0';

      // 🔹 ancho profesional por columna
      detalleSheet.columns = [
        { width: 15 }, // Fecha
        { width: 28 }, // Alumno
        { width: 18 }, // ID
        { width: 20 }, // Curso
        { width: 20 }, // Método
        { width: 22 }, // Referencia
        { width: 18 }, // Monto
      ];

      // 🔹 activar filtros tipo Excel
      detalleSheet.autoFilter = {
        from: "A7",
        to: "G7",
      };

      /* ======================================================
         📦 EXPORTAR
      ====================================================== */
      setExportStep(4); // Paso 4: Generando archivo Excel
      await delay(500);

      const buffer = await workbook.xlsx.writeBuffer();

      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      setExportStep(5); // Paso 5: ¡Descarga iniciada!
      await delay(400);

      // 🔥 iOS / Safari fix
      if (/iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        const url = window.URL.createObjectURL(blob);
        window.open(url);
      } else {
        saveAs(blob, "dashboard_financiero.xlsx");
      }
    } catch (error) {
      console.error("Error exportando Excel:", error);
      setTimeout(() => alert("Hubo un error al generar el Excel. Por favor intenta de nuevo."), 100);
    } finally {
      setIsExporting(false);
      setExportStep(0);
    }
  };

  const generarPDF = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportStep(1); // Paso 1: Analizando filtros y registros activos
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
      await delay(600);
      await registrarDescarga("pdf_dashboard", `reporte_dashboard_${normalizarFecha(new Date())}.pdf`);

      setExportStep(2); // Paso 2: Estructurando balance contable
      await delay(600);

      // Determinar texto del periodo según filtros activos
      let periodoTexto = `${meses[mesSeleccionado]} ${anioSeleccionado}`;
      if (filtroFecha === "hoy") {
        periodoTexto = `Hoy (${normalizarFecha(new Date())})`;
      } else if (filtroFecha === "fecha" && fechaExacta) {
        periodoTexto = `Día ${fechaExacta}`;
      } else if (filtroFecha === "rango" && fechaInicioCustom && fechaFinCustom) {
        periodoTexto = `Rango (${fechaInicioCustom} al ${fechaFinCustom})`;
      }

      // Obtener datos filtrados
      const dataExport = [...historialFiltrado];

      if (!dataExport.length) {
        alert("No hay datos para exportar con los filtros actuales.");
        setIsExporting(false);
        setExportStep(0);
        return;
      }

      setExportStep(3); // Paso 3: Generando tablas de detalle en formato PDF
      await delay(600);

      // Crear instancia de jsPDF
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4"
      });

      // --- CONFIGURACIÓN DE COLORES Y FUENTES ---
      const colorNavy = [30, 41, 59]; // #1e293b
      const colorGreen = [34, 197, 94]; // #22c55e
      const colorGray = [107, 114, 128]; // #6b7280

      // --- 1. CABECERA CORPORATIVA ---
      // Logo o nombre de empresa
      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(colorNavy[0], colorNavy[1], colorNavy[2]);
      doc.text("CARIBBEAN STUDIO ACADEMY", 15, 20);

      // Línea decorativa verde
      doc.setDrawColor(colorGreen[0], colorGreen[1], colorGreen[2]);
      doc.setLineWidth(1.5);
      doc.line(15, 23, 195, 23);

      // Info del emisor (columna izquierda)
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(colorGray[0], colorGray[1], colorGray[2]);
      doc.text([
        "Caribbean Studio Academy",
        "Nit: 123.456.789-0",
        "Email: contacto@caribbeanstudio.com",
        "Reportes Contables y de Recaudo"
      ], 15, 29);

      // Info de documento (columna derecha)
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(colorNavy[0], colorNavy[1], colorNavy[2]);
      doc.text("ESTADO DE RENDIMIENTO Y RECAUDO", 195, 29, { align: "right" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(colorNavy[0], colorNavy[1], colorNavy[2]);
      doc.text(`Generado el: ${new Date().toLocaleString()}`, 195, 34, { align: "right" });
      doc.text(`Periodo del informe: ${periodoTexto}`, 195, 39, { align: "right" });
      doc.text(`Usuario: ${usuarioActual?.nombre || usuarioActual?.email} (${usuarioActual?.rol || "Usuario"})`, 195, 44, { align: "right" });

      // --- 2. SECCIÓN DE BALANCE GENERAL (KPIs) ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(colorNavy[0], colorNavy[1], colorNavy[2]);
      doc.text("1. RESUMEN CONTABLE DEL PERIODO", 15, 54);

      // Formateador de moneda en PDF
      const formatPDFMoneda = (val) => {
        return new Intl.NumberFormat("es-CO", {
          style: "currency",
          currency: "COP",
          minimumFractionDigits: 0
        }).format(val || 0);
      };

      // Auto-table para el balance general (KPIs)
      autoTable(doc, {
        startY: 57,
        theme: "plain",
        head: [["Indicador", "Monto / Valor", "Margen / Estado"]],
        body: [
          ["Total Ingresos del Periodo", formatPDFMoneda(totalIngresosMes), "100.0%"],
          ["Recaudo Alumnos (Real)", formatPDFMoneda(totalPagosMes), `${((totalPagosMes / (totalIngresosMes || 1)) * 100).toFixed(1)}% del total`],
          ["Otros Ingresos Manuales", formatPDFMoneda(totalIngresosManual), `${((totalIngresosManual / (totalIngresosMes || 1)) * 100).toFixed(1)}% del total`],
          ["Total Egresos (Costos + Gastos)", formatPDFMoneda(totalEgresosMes), `${((totalEgresosMes / (totalIngresosMes || 1)) * 100).toFixed(1)}% del total`],
          ["Utilidad Neta General", formatPDFMoneda(utilidadReal), `${margen.toFixed(1)}% Margen`],
        ],
        headStyles: {
          fillColor: [243, 244, 246], // Gris muy claro
          textColor: colorNavy,
          fontStyle: "bold",
          fontSize: 9,
          halign: "left"
        },
        bodyStyles: {
          fontSize: 9,
          textColor: [31, 41, 55],
        },
        columnStyles: {
          1: { fontStyle: "bold", halign: "right" },
          2: { halign: "right" }
        },
        didParseCell: (data) => {
          if (data.row.index === 4 && data.column.index === 1) {
            // Pintar verde si la utilidad es positiva, rojo si es negativa
            data.cell.styles.textColor = utilidadReal >= 0 ? [22, 163, 74] : [220, 38, 38];
          }
        },
        styles: {
          cellPadding: 3,
          lineColor: [229, 231, 235],
          lineWidth: 0.1
        }
      });

      // --- 3. SECCIÓN DE DETALLE DE MOVIMIENTOS ---
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(colorNavy[0], colorNavy[1], colorNavy[2]);
      doc.text("2. DETALLE DE TRANSACCIONES Y PAGOS", 15, doc.lastAutoTable.finalY + 12);

      // Preparar filas para la tabla de transacciones
      const tableRows = dataExport.map((item) => [
        normalizarFecha(item.fecha),
        item.alumno,
        item.alumnoId,
        item.curso,
        item.metodo,
        item.referencia,
        formatPDFMoneda(item.monto)
      ]);

      // Agregar fila de total general
      const totalGeneral = dataExport.reduce((acc, i) => acc + i.monto, 0);
      tableRows.push([
        "",
        "",
        "",
        "",
        "",
        "TOTAL GENERAL",
        formatPDFMoneda(totalGeneral)
      ]);

      setExportStep(4); // Paso 4: Compilando documento A4
      await delay(500);

      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 15,
        head: [["Fecha", "Alumno", "ID Alumno", "Curso", "Método", "Referencia", "Monto (COP)"]],
        body: tableRows,
        theme: "striped",
        headStyles: {
          fillColor: [30, 58, 95], // Azul institucional
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 8.5,
          halign: "left"
        },
        bodyStyles: {
          fontSize: 8,
          textColor: [55, 65, 81],
        },
        columnStyles: {
          6: { halign: "right", fontStyle: "bold" }
        },
        didParseCell: (data) => {
          if (data.row.index === tableRows.length - 1) {
            data.cell.styles.fillColor = [238, 242, 255]; // Azul suave en lugar de verde
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.textColor = [0, 0, 0];
          }
        },
        styles: {
          cellPadding: 2.5,
          lineColor: [243, 244, 246],
          lineWidth: 0.1
        }
      });

      // --- 4. PIE DE PÁGINA (PAGINACIÓN) ---
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont("helvetica", "italic");
        doc.setFontSize(8);
        doc.setTextColor(colorGray[0], colorGray[1], colorGray[2]);
        
        // Texto de pie de página
        doc.text(`Este documento es un reporte financiero oficial generado por el sistema de ${config.nombre}.`, 15, 287);
        doc.text(`Página ${i} de ${totalPages}`, 195, 287, { align: "right" });
      }

      setExportStep(5); // Paso 5: ¡Descarga iniciada!
      await delay(400);

      // Guardar PDF
      doc.save(`reporte_dashboard_${normalizarFecha(new Date())}.pdf`);
    } catch (error) {
      console.error("Error exportando PDF:", error);
      setTimeout(() => alert("Hubo un error al generar el PDF. Por favor intenta de nuevo."), 100);
    } finally {
      setIsExporting(false);
      setExportStep(0);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar onLogout={handleLogout} />

      <main className="dashboard-main">
        
 <header className="topbar">
  <div>
    <h1>Dashboard</h1>
    <p>{meses[mesSeleccionado]} {anioSeleccionado}</p>
  </div>

  <div style={{ display: "flex", alignItems: "center", gap: "12px", marginLeft: "auto" }}>
    
    <div className="badge-alumnos">
      {config.terminologia.alumno.charAt(0).toUpperCase() + config.terminologia.alumno.slice(1)}s activos: {alumnosActivos}
    </div>

    <div className="export-menu-container">
      <button 
        onClick={() => setShowExportMenu(!showExportMenu)} 
        className="btn-exportar"
        style={{ display: "flex", alignItems: "center", gap: "8px" }}
      >
        <span>Exportar Informe</span>
        <span style={{ fontSize: "10px" }}>▼</span>
      </button>
      {showExportMenu && (
        <div className="export-dropdown-menu">
          <button 
            onClick={() => { 
              setShowExportMenu(false); 
              generarExcel(); 
            }}
          >
            <span className="menu-icon">📊</span>
            <div className="menu-text">
              <span className="menu-title">Excel (.xlsx)</span>
              <span className="menu-desc">Tablas detalladas y gráficos de comparación</span>
            </div>
          </button>
          <button 
            onClick={() => { 
              setShowExportMenu(false); 
              generarPDF(); 
            }}
          >
            <span className="menu-icon">📄</span>
            <div className="menu-text">
              <span className="menu-title">PDF (.pdf)</span>
              <span className="menu-desc">Formato estado de cuenta estilo factura contable</span>
            </div>
          </button>
        </div>
      )}
    </div>

  </div>
</header>

        {/* FILTROS */}
        {/* FILTROS AVANZADOS */}
        <section className="dashboard-filtros" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          
          <div className="filtros-busqueda-avanzada" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', alignItems: 'center' }}>
            <input
              type="text"
              placeholder={`Buscar ${config.terminologia.alumno}, ${config.terminologia.grupo} o referencia`}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ flex: 1, minWidth: '250px' }}
            />
            <select value={filtroMetodo} onChange={(e) => setFiltroMetodo(e.target.value)}>
              <option value="todos">Todos los métodos</option>
              {METODOS_PAGO.map((metodo) => (
                <option key={metodo} value={metodo}>{metodo}</option>
              ))}
            </select>
            <select value={filtroCurso} onChange={(e) => setFiltroCurso(e.target.value)}>
              <option value="todos">Todos los {config.terminologia.grupo}s</option>
              {[...new Set(historialBase.map(i => i.curso))].map((curso) => (
                <option key={curso} value={curso}>{curso}</option>
              ))}
            </select>
          </div>

          <div className="filtros-fechas-botones" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            <span style={{ fontWeight: '600', color: '#64748b', fontSize: '14px', marginRight: '5px' }}>Periodo:</span>
            <button className={`btn-filtro ${filtroFecha === "hoy" ? "active" : ""}`} onClick={() => setFiltroFecha("hoy")}>Hoy</button>
            <button className={`btn-filtro ${filtroFecha === "semana" ? "active" : ""}`} onClick={() => setFiltroFecha("semana")}>Semana</button>
            <button className={`btn-filtro ${filtroFecha === "mes" ? "active" : ""}`} onClick={() => setFiltroFecha("mes")}>Mes</button>
            <button className={`btn-filtro ${filtroFecha === "anio" ? "active" : ""}`} onClick={() => setFiltroFecha("anio")}>Año</button>
            
            <input 
              type="date" 
              className={`btn-filtro input-fecha ${filtroFecha === "fecha" ? "active" : ""}`}
              value={fechaExacta}
              onChange={(e) => {
                setFechaExacta(e.target.value);
                if(e.target.value) setFiltroFecha("fecha");
              }}
              title="Fecha Exacta"
            />

            <button className={`btn-filtro ${filtroFecha === "rango" ? "active" : ""}`} onClick={() => setFiltroFecha("rango")}>Rango</button>

            {filtroFecha === "rango" && (
              <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                <input 
                  type="date" 
                  className="btn-filtro input-fecha"
                  value={fechaInicioCustom}
                  onChange={(e) => setFechaInicioCustom(e.target.value)}
                />
                <span style={{ color: '#94a3b8' }}>-</span>
                <input 
                  type="date" 
                  className="btn-filtro input-fecha"
                  value={fechaFinCustom}
                  onChange={(e) => setFechaFinCustom(e.target.value)}
                />
              </div>
            )}

            {filtroFecha === "mes" && (
              <div style={{ display: "flex", gap: "5px" }}>
                <select value={mesSeleccionado} onChange={(e) => setMesSeleccionado(Number(e.target.value))} className="btn-filtro">
                  {meses.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select value={anioSeleccionado} onChange={(e) => setAnioSeleccionado(Number(e.target.value))} className="btn-filtro">
                  {aniosDisponibles.map((anio) => (
                    <option key={anio} value={anio}>{anio}</option>
                  ))}
                </select>
              </div>
            )}

            {filtroFecha === "anio" && (
              <select value={anioSeleccionado} onChange={(e) => setAnioSeleccionado(Number(e.target.value))} className="btn-filtro">
                {aniosDisponibles.map((anio) => (
                  <option key={anio} value={anio}>{anio}</option>
                ))}
              </select>
            )}
          </div>
        </section>

        {/* TARJETAS */}
        <section className="stats-grid">
          <div className="stat-card" style={{ borderLeft: '4px solid var(--color-primario)' }}>
            <h3>Estudiantes Activos</h3>
            <p>{alumnosActivos}</p>
          </div>

          <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
            <h3>Recaudación Mensual</h3>
            <p>{formatearPesos(totalIngresosMes)}</p>
          </div>

          <div className="stat-card" style={{ borderLeft: '4px solid var(--color-secundario)' }}>
            <h3>Estudiantes en Mora</h3>
            <p>{pagosPendientes || 0}</p>
          </div>

          <div className="stat-card" style={{ borderLeft: '4px solid #f59e0b' }}>
            <h3>Alertas</h3>
            <p style={{ fontSize: '0.9rem', whiteSpace: 'pre-line', marginTop: '10px' }}>
              0 notas pendientes{"\n"}
              0 próximos eventos
            </p>
          </div>
        </section>

        {/* TABLA */}
        <section className="panel-card">
          <h2>Ingresos del mes</h2>

          <table className="tabla-dashboard">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Categoría</th>
                <th>Descripción</th>
                <th>Monto</th>
                <th>Método</th>
                <th>Fecha</th>
              </tr>
            </thead>

          
             <tbody>
               {top5Ingresos.map((item) => (
                <tr key={item.id}>
                 <td>{item.tipo}</td>
                <td>{item.categoria}</td>
                <td>{item.descripcion}</td>
                 <td>{formatearPesos(item.monto)}</td>
                  <td>{item.metodo}</td>
                 <td>{new Date(item.fecha).toLocaleDateString()}</td>
                </tr>
             ))}
            </tbody>
          </table>
        </section>

        {/* GRÁFICO INGRESOS */}
        <section className="panel-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Ventas por mes</h2>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Promedio: {formatearPesos(promedioVentas)}</span>
          </div>

          <div className="grafico-barras">
            {ventasPorMes.map((valor, i) => (
              <div key={i} className="barra-item" title={formatearPesos(valor)}>
                <div 
                  className="barra" 
                  style={{ 
                    height: `${(valor / maxVenta) * 180}px`,
                    backgroundColor: valor > 0 && valor >= promedioVentas ? '#39ff14' : valor > 0 ? '#f59e0b' : '#334155'
                  }} 
                />
                <span>{meses[i].slice(0, 3)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 🔥 NUEVO: GRÁFICO EGRESOS */}
        <section className="panel-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h2>Egresos por mes</h2>
            <span style={{ fontSize: '12px', color: '#64748b' }}>Promedio: {formatearPesos(promedioEgresos)}</span>
          </div>

          <div className="grafico-barras">
            {egresosPorMes.map((valor, i) => (
              <div key={i} className="barra-item" title={formatearPesos(valor)}>
                <div
                  className="barra egreso"
                  style={{ 
                    height: `${(valor / maxEgreso) * 180}px`,
                    backgroundColor: valor > 0 && valor >= promedioEgresos ? '#ef4444' : valor > 0 ? '#94a3b8' : '#334155'
                  }}                
                />
                <span>{meses[i].slice(0, 3)}</span>
              </div>
            ))}
          </div>
        </section>



      
      </main>

      {/* MODAL DE EXPORTACIÓN PROFESIONAL */}
      {isExporting && (
        <div className="export-modal-overlay">
          <div className="export-modal-card animate-zoom-in">
            <div className="export-modal-header">
              <div className="export-spinner-container">
                <div className="export-spinner"></div>
                <div className="export-spinner-glow"></div>
              </div>
              <h2>Preparando tu informe</h2>
              <p>Estamos procesando la información del Dashboard para generar tu reporte profesional en Excel.</p>
            </div>

            <div className="export-modal-body">
              {/* Barra de progreso animada */}
              <div className="export-progress-container">
                <div className="export-progress-bar" style={{ width: `${(exportStep / 5) * 100}%` }}></div>
                <span className="export-progress-percentage">{Math.round((exportStep / 5) * 100)}%</span>
              </div>

              {/* Lista de pasos con su respectivo estado */}
              <ul className="export-steps-list">
                <li className={exportStep >= 1 ? "active" : ""}>
                  <span className="step-icon">{exportStep > 1 ? "✓" : "⚡"}</span>
                  <span className="step-label">Analizando filtros y registros activos</span>
                </li>
                <li className={exportStep >= 2 ? "active" : ""}>
                  <span className="step-icon">{exportStep > 2 ? "✓" : exportStep === 2 ? "⚡" : "○"}</span>
                  <span className="step-label">Procesando información financiera</span>
                </li>
                <li className={exportStep >= 3 ? "active" : ""}>
                  <span className="step-icon">{exportStep > 3 ? "✓" : exportStep === 3 ? "⚡" : "○"}</span>
                  <span className="step-label">Diseñando hojas y gráficos de Excel</span>
                </li>
                <li className={exportStep >= 4 ? "active" : ""}>
                  <span className="step-icon">{exportStep > 4 ? "✓" : exportStep === 4 ? "⚡" : "○"}</span>
                  <span className="step-label">Compilando archivo final</span>
                </li>
                <li className={exportStep >= 5 ? "active" : ""}>
                  <span className="step-icon">{exportStep === 5 ? "🎉" : "○"}</span>
                  <span className="step-label">¡Descarga iniciada!</span>
                </li>
              </ul>

              {/* Filtros activos que se están exportando */}
              <div className="export-filters-summary">
                <h4>Filtros aplicados en la exportación:</h4>
                <div className="export-filter-badges">
                  <div className="filter-badge">
                    <span className="badge-title">Periodo:</span>
                    <span className="badge-value">
                      {filtroFecha === "hoy"
                        ? "Hoy"
                        : filtroFecha === "fecha" && fechaExacta
                        ? fechaExacta
                        : filtroFecha === "rango" && fechaInicioCustom && fechaFinCustom
                        ? `${fechaInicioCustom} al ${fechaFinCustom}`
                        : `${meses[mesSeleccionado]} ${anioSeleccionado}`}
                    </span>
                  </div>
                  <div className="filter-badge">
                    <span className="badge-title">Método:</span>
                    <span className="badge-value">{filtroMetodo === "todos" ? "Todos" : filtroMetodo}</span>
                  </div>
                  <div className="filter-badge">
                    <span className="badge-title">Curso:</span>
                    <span className="badge-value">{filtroCurso === "todos" ? "Todos" : filtroCurso}</span>
                  </div>
                  {busqueda.trim() && (
                    <div className="filter-badge">
                      <span className="badge-title">Búsqueda:</span>
                      <span className="badge-value">"{busqueda.trim()}"</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="export-modal-footer">
              <span className="footer-warning">Por favor, no cierres esta pestaña.</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  
}

export default DashboardPage;