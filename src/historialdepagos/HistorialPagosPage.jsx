import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import "./HistorialPagosPage.css";
import { METODOS_PAGO } from "../constants/metodosPago";
import { collection, getDocs, query, orderBy, addDoc, serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { db } from "../firebase";


const EXPORTACIONES_COLLECTION = "historial_descargas";

function HistorialDePagos() {
  const [historialRaw, setHistorialRaw] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroFecha, setFiltroFecha] = useState("mes");
  const [filtroMetodo, setFiltroMetodo] = useState("todos");
  const [filtroCurso, setFiltroCurso] = useState("todos");
  const [orden, setOrden] = useState("recientes");
  const [fechaInicioCustom, setFechaInicioCustom] = useState("");
const [fechaFinCustom, setFechaFinCustom] = useState("");
const [fechaExacta, setFechaExacta] = useState("");
const auth = getAuth();

useEffect(() => {
  const fetchData = async () => {
    try {
      // 🔹 HISTORIAL REAL
      const snapshotHistorial = await getDocs(
        query(collection(db, "historial_pagos"), orderBy("createdAt", "desc"))
      );

      const historialData = snapshotHistorial.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // 🔹 PAGOS ANTIGUOS (planes)
      

      // 🔥 UNIFICAR
  setHistorialRaw(historialData);

    } catch (error) {
      console.error("Error cargando historial combinado:", error);
      setHistorialRaw([]);
    }
  };

  fetchData();
}, []);

  const formatearMoneda = (valor) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(Number(valor) || 0);

  const formatearFecha = (fecha) =>
    new Intl.DateTimeFormat("es-CO", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(fecha);

    const normalizarFecha = (fecha) => {
  const d = new Date(fecha);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};


    const historialBase = useMemo(() => {
  return historialRaw.map((item) => {
   const fecha =
  item.fechaPago?.toDate?.() ||
  (item.fechaPago ? new Date(item.fechaPago) : null);
  

    return {
      id: item.id,
      alumno: item.alumno || "Sin nombre",
      alumnoId: item.alumnoId || "-",
      curso: item.cursoId || item.curso || "Sin curso",
      monto: Number(item.monto || 0),
      fecha,
      metodo: item.metodoPago?.trim() || "Sin método",
      referencia: item.referenciaPago?.trim() || "-",
      planId: item.pagoId || null,
    };
  }).filter(item => item.fecha && !Number.isNaN(item.fecha.getTime()));
}, [historialRaw]);

 const metodosDisponibles = useMemo(() => {
  const metodosRegistrados = historialBase
    .map((item) => item.metodo)
    .filter(Boolean)
    .filter((metodo) => metodo !== "Sin método");

  return ["todos", ...new Set([...METODOS_PAGO, ...metodosRegistrados])];
}, [historialBase]);

const cursosDisponibles = useMemo(() => {
  const cursos = historialBase
    .map((item) => item.curso)
    .filter(Boolean)
    .filter((curso) => curso !== "Sin curso");

  return ["todos", ...new Set(cursos)];
}, [historialBase]);


const historial = useMemo(() => {
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

    if (filtroFecha === "dia") {
      if (!fechaExacta) return false;
      fechaMatch = itemFecha === fechaExacta;
    }

    if (filtroFecha === "semana") {
      const hoy = new Date();
      const hace7 = new Date();
      hace7.setDate(hoy.getDate() - 7);
      hace7.setHours(0, 0, 0, 0);

      const finHoy = new Date();
      finHoy.setHours(23, 59, 59, 999);

      const itemDateObj = new Date(item.fecha);
      fechaMatch = itemDateObj >= hace7 && itemDateObj <= finHoy;
    }

    if (filtroFecha === "mes") {
      const hoy = new Date();
      const itemDateObj = new Date(item.fecha);

      fechaMatch =
        itemDateObj.getMonth() === hoy.getMonth() &&
        itemDateObj.getFullYear() === hoy.getFullYear();
    }

    if (filtroFecha === "año") {
      const hoy = new Date();
      const itemDateObj = new Date(item.fecha);

      fechaMatch = itemDateObj.getFullYear() === hoy.getFullYear();
    }

    if (filtroFecha === "personalizado") {
      if (!fechaInicioCustom || !fechaFinCustom) return false;

      fechaMatch =
        itemFecha >= fechaInicioCustom &&
        itemFecha <= fechaFinCustom;
    }

    return nombreMatch && metodoMatch && cursoMatch && fechaMatch;
  });

  lista.sort((a, b) => {
    if (orden === "recientes") return b.fecha - a.fecha;
    if (orden === "antiguos") return a.fecha - b.fecha;
    if (orden === "alumno") {
      return a.alumno.localeCompare(b.alumno, "es", {
        sensitivity: "base",
      });
    }
    return b.fecha - a.fecha;
  });

  return lista;
}, [
  historialBase,
  busqueda,
  filtroFecha,
  filtroMetodo,
  orden,
  fechaExacta,
  fechaInicioCustom,
  fechaFinCustom,
]);


  const resumen = useMemo(() => {
    const totalRecaudado = historial.reduce((acc, item) => acc + item.monto, 0);
    const totalRegistros = historial.length;
    const totalAlumnos = new Set(historial.map((item) => item.alumnoId)).size;

    const ultimoPago =
      historial.length > 0
        ? [...historial].sort((a, b) => b.fecha - a.fecha)[0]
        : null;

    return {
      totalRecaudado,
      totalRegistros,
      totalAlumnos,
      ultimoPago,
    };
  }, [historial]);

  const generarExcel = async () => {
  try {
    if (!historial.length) {
      alert("No hay datos para exportar");
      return;
    }

    const user = auth.currentUser;
    const fechaDescarga = normalizarFecha(new Date());
   const nombreArchivo = `reporte_pagos_${fechaDescarga}.xlsx`;
   

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Pagos", {
      views: [{ state: "frozen", ySplit: 7 }],
    });

    // Encabezado empresa
    worksheet.mergeCells("A1:G1");
    worksheet.getCell("A1").value = "CARIBBEAN STUDIO ACADEMY";

    worksheet.mergeCells("A2:G2");
    worksheet.getCell("A2").value = "Reporte de pagos";

    worksheet.mergeCells("A3:G3");
    worksheet.getCell("A3").value = `Generado el: ${fechaDescarga}`;

    worksheet.mergeCells("A4:G4");
    worksheet.getCell("A4").value = `Reporte creado por: ${user?.email || "Usuario"}`;

    // Fila en blanco
    worksheet.addRow([]);
    // Encabezado de tabla irá en fila 6
    const headerRow = worksheet.addRow([
      "Fecha",
      "Alumno",
      "ID Alumno",
      "Curso",
      "Método de pago",
      "Referencia",
      "Monto (COP)",
    ]);

    // Filas de datos
    historial.forEach((item) => {
      worksheet.addRow([
        normalizarFecha(item.fecha),
        item.alumno,
        item.alumnoId,
        item.curso,
        item.metodo,
        item.referencia,
        Number(item.monto || 0),
      ]);
    });

    // Fila en blanco
    worksheet.addRow([]);

    // Total
    const totalGeneral = historial.reduce((acc, item) => acc + Number(item.monto || 0), 0);
    const totalRow = worksheet.addRow(["", "", "", "", "", "TOTAL", totalGeneral]);

    // Ancho de columnas
    worksheet.columns = [
      { key: "fecha", width: 16 },
      { key: "alumno", width: 28 },
      { key: "idAlumno", width: 18 },
      { key: "curso", width: 20 },
      { key: "metodo", width: 20 },
      { key: "referencia", width: 20 },
      { key: "monto", width: 18 },
    ];

    // Estilo encabezado superior
    ["A1", "A2", "A3", "A4"].forEach((cellRef, index) => {
      const cell = worksheet.getCell(cellRef);

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

    // Estilo fila de encabezados de tabla
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

    // Estilo filas de datos
    const firstDataRowNumber = headerRow.number + 1;
    const lastDataRowNumber = totalRow.number - 2;

    for (let rowNumber = firstDataRowNumber; rowNumber <= lastDataRowNumber; rowNumber++) {
      const row = worksheet.getRow(rowNumber);

      row.eachCell((cell, colNumber) => {
        cell.alignment = {
          horizontal: colNumber === 7 ? "right" : "center",
          vertical: "middle",
        };

        cell.border = {
          top: { style: "thin", color: { argb: "FFD9D9D9" } },
          left: { style: "thin", color: { argb: "FFD9D9D9" } },
          bottom: { style: "thin", color: { argb: "FFD9D9D9" } },
          right: { style: "thin", color: { argb: "FFD9D9D9" } },
        };

        if (colNumber === 7) {
          cell.numFmt = '"$"#,##0';
        }
      });
    }

    // Estilo total
    totalRow.eachCell((cell, colNumber) => {
      cell.font = {
        bold: true,
      };

      cell.alignment = {
        horizontal: colNumber === 7 || colNumber === 6 ? "right" : "center",
        vertical: "middle",
      };

      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFFCE5CD" },
      };

      cell.border = {
        top: { style: "thin", color: { argb: "FFBFBFBF" } },
        left: { style: "thin", color: { argb: "FFBFBFBF" } },
        bottom: { style: "thin", color: { argb: "FFBFBFBF" } },
        right: { style: "thin", color: { argb: "FFBFBFBF" } },
      };

      if (colNumber === 7) {
        cell.numFmt = '"$"#,##0';
      }
    });

    // Alturas
    worksheet.getRow(1).height = 24;
    worksheet.getRow(2).height = 22;
    worksheet.getRow(3).height = 20;
    worksheet.getRow(4).height = 20;
    headerRow.height = 22;
    totalRow.height = 22;

    // Descargar archivo
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(
      new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      }),
      nombreArchivo
    );

    // Auditoría en Firebase
    await addDoc(collection(db, EXPORTACIONES_COLLECTION), {
      usuario: user?.email || "desconocido",
      uid: user?.uid || null,
      fechaDescarga: serverTimestamp(),
      cantidadRegistros: historial.length,
      filtroFecha,
      filtroMetodo,
    });
  } catch (error) {
    console.error("Error exportando Excel:", error);
    alert("Error al generar el archivo Excel");
  }
};


  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main historial-page">
        <section className="historial-hero">
          <div>
            <p className="historial-eyebrow">Control contable</p>
            <h1>Historial de pagos</h1>
            <p className="historial-subtitle">
              Consulta todos los movimientos registrados desde la sesión de
              pagos, con filtros, búsqueda y trazabilidad por método de pago.
            </p>
          </div>
          {/* 🔥 BOTÓN EXPORTAR */}
           <button className="btn-exportar" onClick={generarExcel}>
              Descargar Excel
            </button>
        </section>

        <section className="historial-resumen">
          <article className="resumen-card">
            <span className="resumen-label">Total recaudado</span>
            <strong>{formatearMoneda(resumen.totalRecaudado)}</strong>
            <small>Según filtros aplicados</small>
          </article>

          <article className="resumen-card">
            <span className="resumen-label">Movimientos</span>
            <strong>{resumen.totalRegistros}</strong>
            <small>Registros visibles</small>
          </article>

          <article className="resumen-card">
            <span className="resumen-label">Alumnos con pagos</span>
            <strong>{resumen.totalAlumnos}</strong>
            <small>Únicos en el historial</small>
          </article>

          <article className="resumen-card">
            <span className="resumen-label">Último movimiento</span>
            <strong>
              {resumen.ultimoPago
                ? formatearFecha(resumen.ultimoPago.fecha)
                : "--"}
            </strong>
            <small>
              {resumen.ultimoPago
                ? resumen.ultimoPago.alumno
                : "Sin movimientos"}
            </small>
          </article>
        </section>

        <section className="historial-panel">
          <div className="historial-toolbar">
            <div className="historial-search">
              <input
                type="text"
                placeholder="Buscar por alumno, curso, referencia o ID..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
            </div>

            <div className="historial-filtros">
              <select
                value={filtroFecha}
                onChange={(e) => setFiltroFecha(e.target.value)}
              >
                <option value="hoy">Hoy</option>
                <option value="semana">Últimos 7 días</option>
                <option value="mes">Este mes</option>
                <option value="año">Este año</option>
                <option value="personalizado">Rango personalizado</option>
                <option value="dia">Día específico</option>
              </select>
              {filtroFecha === "personalizado" && (
                <>
                 <input
                    type="date"
                    value={fechaInicioCustom}
                    onChange={(e) => setFechaInicioCustom(e.target.value)}
                 />
                  <input
                    type="date"
                    value={fechaFinCustom}
                    onChange={(e) => setFechaFinCustom(e.target.value)}
                  />
                </>
              )}


                    {filtroFecha === "dia" && (
                      <input
                       type="date"
                        value={fechaExacta}
                        onChange={(e) => setFechaExacta(e.target.value)}
                      />
                    )}


              <select
                value={filtroMetodo}
                onChange={(e) => setFiltroMetodo(e.target.value)}
              >
                {metodosDisponibles.map((metodo) => (
                  <option key={metodo} value={metodo}>
                    {metodo === "todos" ? "Todos los métodos" : metodo}
                  </option>
                ))}
              </select>
              <select
                  value={filtroCurso}
                  onChange={(e) => setFiltroCurso(e.target.value)}
                >
                  {cursosDisponibles.map((curso) => (
                    <option key={curso} value={curso}>
                      {curso === "todos" ? "Todos los cursos" : curso}
                    </option>
                  ))}
                </select>

              <select value={orden} onChange={(e) => setOrden(e.target.value)}>
                <option value="recientes">Más recientes</option>
                <option value="antiguos">Más antiguos</option>
                
                <option value="alumno">Alumno A-Z</option>
              </select>

            </div>
          </div>

          <div className="historial-meta">
            <span>
              Mostrando <strong>{historial.length}</strong> movimiento
              {historial.length !== 1 ? "s" : ""}
            </span>
          </div>

          {historial.length === 0 ? (
            <div className="historial-vacio">
              <h3>Sin resultados</h3>
              <p>
                No hay pagos que coincidan con los filtros actuales. Ajusta la
                búsqueda o cambia el rango de fechas.
              </p>
            </div>
          ) : (
            <>
              <div className="historial-tabla-wrap">
                <table className="historial-tabla">
                  <thead>
                    <tr>
                      <th>Alumno</th>
                      <th>Curso</th>
                      <th>Fecha</th>
                      <th>Método</th>
                      <th>Referencia</th>
                      <th className="text-right">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {historial.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <div className="tabla-alumno">
                            <strong>{item.alumno}</strong>
                            <span>ID alumno: {item.alumnoId}</span>
                          </div>
                        </td>
                        <td>{item.curso}</td>
                        <td>{formatearFecha(item.fecha)}</td>
                        <td>
                          <span className="metodo-badge">{item.metodo}</span>
                        </td>
                        <td className="tabla-ref">{item.referencia}</td>
                        <td className="text-right monto-cell">
                          {formatearMoneda(item.monto)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="historial-cards-mobile">
                {historial.map((item) => (
                  <article key={item.id} className="historial-card">
                    <div className="historial-card-top">
                      <div>
                        <h3>{item.alumno}</h3>
                        <p>ID alumno: {item.alumnoId}</p>
                      </div>

                      <strong className="historial-card-monto">
                        {formatearMoneda(item.monto)}
                      </strong>
                    </div>

                    <div className="historial-card-grid">
                      <div>
                        <span>Curso</span>
                        <strong>{item.curso}</strong>
                      </div>

                      <div>
                        <span>Fecha</span>
                        <strong>{formatearFecha(item.fecha)}</strong>
                      </div>

                      <div>
                        <span>Método</span>
                        <strong>{item.metodo}</strong>
                      </div>

                      <div>
                        <span>Referencia</span>
                        <strong>{item.referencia}</strong>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  );
}

export default HistorialDePagos;