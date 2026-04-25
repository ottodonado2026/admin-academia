import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import "./DashboardPage.css";

import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { supabase } from "../services/supabaseClient";

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

  const handleLogout = () => {
    localStorage.removeItem("auth");
    navigate("/");
  };

  const hoy = new Date();
  const [mesSeleccionado, setMesSeleccionado] = useState(hoy.getMonth());
  const [anioSeleccionado, setAnioSeleccionado] = useState(hoy.getFullYear());

  const [ingresos, setIngresos] = useState([]);
  const [egresos, setEgresos] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [historialPagos, setHistorialPagos] = useState([]);

  const [busqueda, setBusqueda] = useState("");
const [filtroFecha, setFiltroFecha] = useState("mes");
const [filtroMetodo, setFiltroMetodo] = useState("todos");
const [filtroCurso, setFiltroCurso] = useState("todos");
const [orden, setOrden] = useState("recientes");

const [fechaInicioCustom, setFechaInicioCustom] = useState("");
const [fechaFinCustom, setFechaFinCustom] = useState("");
const [fechaExacta, setFechaExacta] = useState("");


const fetchDashboard = async () => {
  try {
    // 🔹 PAGOS (planes)
    const { data: pagosData } = await supabase
      .from("pagos")
      .select("*");

    // 🔹 HISTORIAL (abonos)
    const { data: historialData } = await supabase
      .from("historial_pagos")
      .select("*");

    // 🔹 ALUMNOS
    const { data: alumnosData } = await supabase
      .from("alumnos")
      .select("*");

    // 🔹 INGRESOS
    const { data: ingresosData } = await supabase
      .from("ingresos")
      .select("*");

    // 🔹 EGRESOS
    const { data: egresosData } = await supabase
      .from("egresos")
      .select("*");

    setPagos(pagosData || []);
    setHistorialPagos(historialData || []);
    setAlumnos(alumnosData || []);
    setIngresos(ingresosData || []);
    setEgresos(egresosData || []);

  } catch (error) {
    console.error("Error cargando dashboard:", error);
  }
};

useEffect(() => {
  fetchDashboard();

  const channel = supabase
    .channel("realtime-dashboard")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "historial_pagos" },
      () => {
        fetchDashboard();
      }
    )
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "pagos" },
      () => {
        fetchDashboard();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}, []);

  const formatearPesos = (valor) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(valor || 0);

  // 🔥 FILTROS
  const ingresosFiltrados = useMemo(() => {
    return ingresos.filter((item) => {
      if (!item.fecha) return false;
      const f = new Date(item.fecha);
      return f.getMonth() === mesSeleccionado && f.getFullYear() === anioSeleccionado;
    });
  }, [ingresos, mesSeleccionado, anioSeleccionado]);

  const egresosFiltrados = useMemo(() => {
    return egresos.filter((item) => {
      if (!item.fecha) return false;
      const f = new Date(item.fecha);
      return f.getMonth() === mesSeleccionado && f.getFullYear() === anioSeleccionado;
    });
  }, [egresos, mesSeleccionado, anioSeleccionado]);


  const normalizarFecha = (fecha) => {
  const d = new Date(fecha);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

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

    const metodoMatch =
      filtroMetodo === "todos" || item.metodo === filtroMetodo;

    const cursoMatch =
      filtroCurso === "todos" || item.curso === filtroCurso;

    let fechaMatch = true;

    const itemFecha = normalizarFecha(item.fecha);
    const hoyFecha = normalizarFecha(new Date());

    if (filtroFecha === "hoy") {
      fechaMatch = itemFecha === hoyFecha;
    }

    if (filtroFecha === "mes") {
      const hoy = new Date();
      fechaMatch =
        item.fecha.getMonth() === hoy.getMonth() &&
        item.fecha.getFullYear() === hoy.getFullYear();
    }

    return nombreMatch && metodoMatch && cursoMatch && fechaMatch;
  });

  return lista;
}, [historialBase, busqueda, filtroFecha, filtroMetodo, filtroCurso]);

// 🔥 FUENTE HÍBRIDA (historial + fallback a planes)
// 🔥 PAGOS REALES DESDE HISTORIAL (FUENTE ÚNICA)

const pagosRealesDelMes = historialBase
  .filter((item) => {
    return (
      item.fecha.getMonth() === mesSeleccionado &&
      item.fecha.getFullYear() === anioSeleccionado
    );
  })
  .map((item) => ({
    monto: Number(item.monto || 0),
    fecha: item.fecha,
    alumnoId: item.alumnoId,
  }));

const totalPagosMes = pagosRealesDelMes.reduce(
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


const pagosHistoricos = historialPagos
  .map((item) => {
    const fecha = item.fecha_pago
      ? new Date(item.fecha_pago)
      : null;

    if (!fecha || Number.isNaN(fecha.getTime())) return null;

    return {
      monto: Number(item.monto || 0),
      fecha,
      alumnoId: item.alumno_id || item.alumno_db_id,
    };
  })
  .filter(Boolean);

// 🔹 Total histórico real
const totalRecaudado = pagosHistoricos.reduce(
  (acc, item) => acc + item.monto,
  0
);

// 🔹 Movimientos históricos
const totalMovimientos = pagosHistoricos.length;

// 🔹 Último pago real del sistema
const ultimoMovimiento =
  pagosHistoricos.length > 0
    ? [...pagosHistoricos].sort((a, b) => b.fecha - a.fecha)[0]
    : null;

// 🔹 Alumnos únicos que han pagado (histórico)
const alumnosConPagos = new Set(
  pagosHistoricos.map((item) => item.alumnoId)
).size;

  const alumnosActivos = alumnos.filter((a) => a.estado === "activo").length;

  const pagosPendientes = pagos.filter(
    (p) => p.estado === "Pendiente" || p.estado === "En mora"
  ).length;

  // 🔥 HISTÓRICO INGRESOS
  const ventasPorMes = useMemo(() => {
    const data = Array(12).fill(0);

    ingresos.forEach((i) => {
      if (!i.fecha) return;
      const f = new Date(i.fecha);
      if (f.getFullYear() === anioSeleccionado) {
        data[f.getMonth()] += Number(i.monto || 0);
      }
    });

    pagos.forEach((p) => {
      (p.pagos || []).forEach((pago) => {
        const f = new Date(pago.fecha);
        if (f.getFullYear() === anioSeleccionado) {
          data[f.getMonth()] += Number(pago.monto || 0);
        }
      });
    });

    return data;
  }, [ingresos, pagos, anioSeleccionado]);

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

  const generarExcel = async () => {
  try {


   // 👇 AQUÍ VA TU CÓDIGO NUEVO
const workbook = new ExcelJS.Workbook();

/* ======================================================
   📄 HOJA 1: RESUMEN
====================================================== */
const resumenSheet = workbook.addWorksheet("Resumen");


// 🔹 NOMBRE EMPRESA
resumenSheet.mergeCells("A1:G1");
const empresaCell = resumenSheet.getCell("A1");

empresaCell.value = "CARIBBEAN STUDIO ACADEMY";

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

usuarioCell.value = "Generado por: Administrador"; // 🔥 luego lo puedes hacer dinámico

usuarioCell.font = {
  size: 11,
};

usuarioCell.alignment = {
  horizontal: "center",
};



// 🔹 FILTROS
resumenSheet.mergeCells("A5:G5");
const filtroCell = resumenSheet.getCell("A5");

filtroCell.value = `Filtros → Mes: ${meses[mesSeleccionado]} | Año: ${anioSeleccionado} | Búsqueda: ${busqueda || "Ninguna"} | Método: ${filtroMetodo} | Curso: ${filtroCurso}`
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

// 🔹 formato moneda
[1,2,3,6].forEach((col) => {
  valores.getCell(col).numFmt = '"$"#,##0';
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

  const row = resumenSheet.addRow([
    label,
    val,
    "", // columna visual
  ]);

  // formato moneda
  row.getCell(2).numFmt = '"$"#,##0';

  // 🔥 barra visual (tipo gráfico)
  row.getCell(3).fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: {
      argb:
        label === "Egresos"
          ? "FFFF4D4D"
          : label === "Utilidad"
          ? val >= 0
            ? "FF39FF14"
            : "FFFF0000"
          : "FF00C8FF",
    },
  };

  row.getCell(3).border = {
    left: { style: "thin", color: { argb: "FF999999" } },
  };

  row.getCell(3).alignment = { horizontal: "left" };

  // ancho proporcional
  row.getCell(3).value = "█".repeat(Math.floor(porcentaje * 20));
});

// ancho automático
resumenSheet.columns = [
  { width: 20 },
  { width: 20 },
  { width: 40 },
];

/* ======================================================
   📄 HOJA 2: DETALLE
====================================================== */
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
detalleSheet.getCell("A4").value = `Periodo: ${meses[mesSeleccionado]} ${anioSeleccionado}`;

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

// 🔹 datos
const dataExport = historialFiltrado.filter((item) => {
  return (
    item.fecha.getMonth() === mesSeleccionado &&
    item.fecha.getFullYear() === anioSeleccionado
  );
});


if (!dataExport.length) {
  alert("No hay datos para exportar");
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
const buffer = await workbook.xlsx.writeBuffer();

saveAs(
  new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  }),
  "dashboard_financiero.xlsx"
);
  } catch (error) {
    console.error("Error exportando:", error);
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
      Alumnos activos: {alumnosActivos}
    </div>

    <button onClick={generarExcel} className="btn-exportar">
      Exportar Excel
    </button>

  </div>
</header>

        {/* FILTROS */}
        <section className="dashboard-filtros">
          <input
  type="text"
  placeholder="Buscar alumno, curso o referencia"
  value={busqueda}
  onChange={(e) => setBusqueda(e.target.value)}
/>

<select value={filtroMetodo} onChange={(e) => setFiltroMetodo(e.target.value)}>
  <option value="todos">Todos los métodos</option>
  <option value="Efectivo">Efectivo</option>
  <option value="Transferencia">Transferencia</option>
  <option value="Tarjeta">Tarjeta</option>
</select>

<select value={filtroCurso} onChange={(e) => setFiltroCurso(e.target.value)}>
  <option value="todos">Todos los cursos</option>

  {[...new Set(historialBase.map(i => i.curso))].map((curso) => (
    <option key={curso} value={curso}>
      {curso}
    </option>
  ))}
</select>
          <select value={mesSeleccionado} onChange={(e) => setMesSeleccionado(Number(e.target.value))}>
            {meses.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>

          <select value={anioSeleccionado} onChange={(e) => setAnioSeleccionado(Number(e.target.value))}>
            <option>{anioSeleccionado}</option>
          </select>

        </section>

        {/* TARJETAS */}
        <section className="stats-grid">
          <div className="stat-card">
            <h3>Ingresos manuales</h3>
        <p>{formatearPesos(revenueMes)}</p>         
       </div>

          <div className="stat-card">
            <h3>Pagos alumnos</h3>
           <p>{formatearPesos(totalPagosMes)}</p>
          </div>


          <div className="stat-card">
            <h3>Total ingresos</h3>
            <p>{formatearPesos(totalIngresos)}</p>
          </div>

          <div className="stat-card">
            <h3>Egresos</h3>
            <p>{formatearPesos(totalEgresosMes)}</p>
          </div>
          <div className="stat-card stat-costos">
          <h3>Costos</h3>
          <p>{formatearPesos(totalCostosMes)}</p>
        </div>

        <div className="stat-card stat-gastos">
          <h3>Gastos</h3>
          <p>{formatearPesos(totalGastosMes)}</p>
        </div>

          <div className="stat-card">
  <h3>Utilidad real</h3>
 <p style={{ color: utilidad >= 0 ? "#39ff14" : "#ff3c3c" }}>
  {formatearPesos(utilidad)}
</p>
</div>

<div className="stat-card">
  <h3>Margen</h3>
  <p style={{ color: margen >= 0 ? "#39ff14" : "#ff3c3c" }}>
    {margenReal.toFixed(1)}%
  </p>
</div>

<div className="stat-card stat-highlight">
  <h3>Total recaudado</h3>
  <p>{formatearPesos(totalRecaudado)}</p>
</div>

<div className="stat-card">
  <h3>Movimientos</h3>
  <p>{totalMovimientos}</p>
</div>

<div className="stat-card">
  <h3>Alumnos con pagos</h3>
  <p>{alumnosConPagos}</p>
</div>

<div className="stat-card">
  <h3>Último pago</h3>
  <p>
    {ultimoMovimiento
      ? formatearPesos(ultimoMovimiento.monto)
      : "$0"}
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
              {ingresosFiltrados.map((i) => (
                <tr key={i.id}>
                  <td>{i.tipo}</td>
                  <td>{i.categoria}</td>
                  <td>{i.descripcion}</td>
                  <td>{formatearPesos(i.monto)}</td>
                  <td>{i.metodo}</td>
                  <td>{new Date(i.fecha).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* GRÁFICO INGRESOS */}
        <section className="panel-card">
          <h2>Ventas por mes</h2>

          <div className="grafico-barras">
            {ventasPorMes.map((valor, i) => (
              <div key={i} className="barra-item">
                <div className="barra" style={{ height: `${valor / 10000}px` }} />
                <span>{meses[i].slice(0, 3)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* 🔥 NUEVO: GRÁFICO EGRESOS */}
        <section className="panel-card">
          <h2>Egresos por mes</h2>

          <div className="grafico-barras">
            {egresosPorMes.map((valor, i) => (
              <div key={i} className="barra-item">
                <div
                  className="barra egreso"
style={{ height: `${(valor / maxEgreso) * 180}px` }}                />
                <span>{meses[i].slice(0, 3)}</span>
              </div>
            ))}
          </div>
        </section>



      
      </main>
    </div>
  );
  
}

export default DashboardPage;