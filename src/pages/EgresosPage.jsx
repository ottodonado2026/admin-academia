import { useEffect, useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import "./EgresosPage.css";
import { supabase } from "../services/supabaseClient";

// Importaciones para exportación
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import jsPDF from "jspdf";
import "jspdf-autotable";

import { registrarAuditoria } from "../services/auditoriaService";

const mesesNombres = [
  "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

function EgresosPage() {
  const [egresos, setEgresos] = useState([]);
  const [usuarioActual, setUsuarioActual] = useState(null);

  const [categoria, setCategoria] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState("");
  const [tipo, setTipo] = useState("gasto");

  const [openCat, setOpenCat] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [editData, setEditData] = useState({});

  // Filtros de fecha
  const dateObj = new Date();
  const [filtroFecha, setFiltroFecha] = useState("mes"); // hoy, semana, mes, anio, fecha
  const [mesSeleccionado, setMesSeleccionado] = useState(dateObj.getMonth() + 1);
  const [anioSeleccionado, setAnioSeleccionado] = useState(dateObj.getFullYear());
  const [fechaExacta, setFechaExacta] = useState("");

  // Exportación
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStep, setExportStep] = useState(0);

  const categoriasPorTipo = {
    costo: ["profesor", "comision", "materiales", "operativo", "venta"],
    gasto: ["marketing", "nomina", "servicios", "arriendo", "otros"]
  };

  useEffect(() => {
    setCategoria("");
  }, [tipo]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        const { data: profile } = await supabase
          .from("usuarios")
          .select("*")
          .eq("id", data.user.id)
          .single();
        setUsuarioActual(profile || data.user);
      }
    };
    fetchUser();
  }, []);

  const fetchEgresos = async () => {
    let query = supabase.from("egresos").select("*").order("fecha", { ascending: false });

    const ahora = new Date();

    if (filtroFecha === "hoy") {
      const inicio = new Date(ahora.setHours(0, 0, 0, 0)).toISOString();
      const fin = new Date(ahora.setHours(23, 59, 59, 999)).toISOString();
      query = query.gte("fecha", inicio).lte("fecha", fin);
    } else if (filtroFecha === "semana") {
      const inicio = new Date(ahora);
      inicio.setDate(inicio.getDate() - inicio.getDay());
      inicio.setHours(0, 0, 0, 0);
      const fin = new Date(inicio);
      fin.setDate(fin.getDate() + 6);
      fin.setHours(23, 59, 59, 999);
      query = query.gte("fecha", inicio.toISOString()).lte("fecha", fin.toISOString());
    } else if (filtroFecha === "mes") {
      const inicio = new Date(anioSeleccionado, mesSeleccionado - 1, 1).toISOString();
      const fin = new Date(anioSeleccionado, mesSeleccionado, 0, 23, 59, 59, 999).toISOString();
      query = query.gte("fecha", inicio).lte("fecha", fin);
    } else if (filtroFecha === "anio") {
      const inicio = new Date(anioSeleccionado, 0, 1).toISOString();
      const fin = new Date(anioSeleccionado, 11, 31, 23, 59, 59, 999).toISOString();
      query = query.gte("fecha", inicio).lte("fecha", fin);
    } else if (filtroFecha === "fecha" && fechaExacta) {
      const inicio = new Date(`${fechaExacta}T00:00:00`).toISOString();
      const fin = new Date(`${fechaExacta}T23:59:59`).toISOString();
      query = query.gte("fecha", inicio).lte("fecha", fin);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error cargando egresos:", error);
      return;
    }
    setEgresos(data || []);
  };

  useEffect(() => {
    fetchEgresos();
  }, [filtroFecha, mesSeleccionado, anioSeleccionado, fechaExacta]);

  const agregarEgreso = async (e) => {
    if (e) e.preventDefault();

    if (!categoria) {
      alert("Selecciona una categoría");
      return;
    }
    if (!metodo) {
      alert("Selecciona un método de pago");
      return;
    }
    if (!tipo) {
      alert("Selecciona el tipo (costo o gasto)");
      return;
    }
    if (!monto || Number(monto) <= 0) {
      alert("El monto debe ser mayor a 0");
      return;
    }

    const descripcionLimpia = descripcion.trim();

    const nuevo = {
      tipo,
      categoria,
      descripcion: descripcionLimpia,
      monto: Number(monto),
      metodo,
      fecha: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("egresos")
      .insert([nuevo])
      .select(); 

    if (error) {
      console.error("Error guardando egreso:", error);
      alert(error.message);
      return;
    }

    if (data && data.length > 0) {
      fetchEgresos();
    }

    setCategoria("");
    setDescripcion("");
    setMonto("");
    setMetodo("");
    setTipo("gasto");
  };

  const eliminarEgreso = async (id) => {
    if (!window.confirm("¿Eliminar egreso?")) return;

    const { error } = await supabase
      .from("egresos")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error eliminando egreso:", error);
      alert("Error al eliminar");
      return;
    }

    setEgresos(egresos.filter((e) => e.id !== id));
  };

  const guardarEdicion = async () => {
    const { error } = await supabase
      .from("egresos")
      .update({
        tipo: editData.tipo,
        categoria: editData.categoria,
        descripcion: editData.descripcion,
        monto: Number(editData.monto),
        metodo: editData.metodo,
      })
      .eq("id", editandoId);

    if (error) {
      console.error("Error actualizando egreso:", error);
      alert("Error al actualizar");
      return;
    }

    setEgresos(
      egresos.map((e) =>
        e.id === editandoId ? { ...e, ...editData } : e
      )
    );

    setEditandoId(null);
    setEditData({});
  };

  // --- EXPORTACIÓN Y AUDITORÍA ---
  const registrarDescargaAuditoria = async (formato) => {
    try {
      const params = { formato, filtroFecha, mesSeleccionado, anioSeleccionado, fechaExacta };
      await registrarAuditoria("descargar", "egresos", formato, params, usuarioActual);
    } catch (err) {
      console.error("Error al registrar auditoria:", err);
    }
  };

  const getPeriodoTexto = () => {
    if (filtroFecha === "hoy") return "Hoy";
    if (filtroFecha === "semana") return "Esta semana";
    if (filtroFecha === "mes") return `${mesesNombres[mesSeleccionado]} ${anioSeleccionado}`;
    if (filtroFecha === "anio") return `Año ${anioSeleccionado}`;
    if (filtroFecha === "fecha") return `Día: ${fechaExacta}`;
    return "";
  };

  const generarExcel = async () => {
    setIsExporting(true);
    setExportStep(1);
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
      await delay(600);
      await registrarDescargaAuditoria("excel");

      setExportStep(2);
      await delay(600);

      const periodoTexto = getPeriodoTexto();
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("Egresos");

      sheet.mergeCells("A1:E1");
      const titleCell = sheet.getCell("A1");
      titleCell.value = "CARIBBEAN STUDIO ACADEMY - Reporte de Egresos";
      titleCell.font = { size: 14, bold: true };
      titleCell.alignment = { horizontal: "center" };

      sheet.mergeCells("A2:E2");
      sheet.getCell("A2").value = `Generado el: ${new Date().toLocaleString()} por ${usuarioActual?.nombre || usuarioActual?.email}`;
      sheet.getCell("A2").alignment = { horizontal: "center" };

      sheet.mergeCells("A3:E3");
      sheet.getCell("A3").value = `Filtro aplicado: ${periodoTexto}`;
      sheet.getCell("A3").alignment = { horizontal: "center" };
      sheet.getCell("A3").font = { italic: true };

      // Encabezados
      sheet.getRow(5).values = ["Fecha", "Tipo", "Categoría", "Descripción", "Monto"];
      sheet.getRow(5).font = { bold: true };

      let currentRow = 6;
      let totalGasto = 0;
      let totalCosto = 0;

      egresos.forEach(e => {
        sheet.getRow(currentRow).values = [
          new Date(e.fecha).toLocaleDateString(),
          e.tipo?.toUpperCase(),
          e.categoria?.toUpperCase(),
          e.descripcion ? e.descripcion.replace(/\(Abono ID: [a-f0-9-]+\)/i, "").trim() : "-",
          Number(e.monto)
        ];
        sheet.getCell(`E${currentRow}`).numFmt = '"$"#,##0.00';
        
        if (e.tipo === "gasto") totalGasto += Number(e.monto);
        else totalCosto += Number(e.monto);

        currentRow++;
      });

      sheet.getRow(currentRow + 1).values = ["", "", "", "Total Gastos:", totalGasto];
      sheet.getRow(currentRow + 2).values = ["", "", "", "Total Costos:", totalCosto];
      sheet.getRow(currentRow + 3).values = ["", "", "", "Total Egresos:", totalGasto + totalCosto];
      
      [1, 2, 3].forEach(i => {
        sheet.getCell(`D${currentRow + i}`).font = { bold: true };
        sheet.getCell(`E${currentRow + i}`).numFmt = '"$"#,##0.00';
        sheet.getCell(`E${currentRow + i}`).font = { bold: true };
      });

      sheet.columns = [
        { width: 15 }, { width: 15 }, { width: 20 }, { width: 40 }, { width: 20 }
      ];

      setExportStep(3);
      await delay(600);

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `Egresos_${periodoTexto.replace(/\s+/g, "_")}.xlsx`);

      setExportStep(4);
      await delay(500);
    } catch (err) {
      console.error(err);
      alert("Error al generar Excel.");
    } finally {
      setIsExporting(false);
      setShowDownloadMenu(false);
    }
  };

  const generarPDF = async () => {
    setIsExporting(true);
    setExportStep(1);
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
      await delay(600);
      await registrarDescargaAuditoria("pdf");

      setExportStep(2);
      await delay(600);

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const periodoTexto = getPeriodoTexto();

      doc.setFontSize(18);
      doc.setTextColor(30, 41, 59);
      doc.text("CARIBBEAN STUDIO ACADEMY", pageWidth / 2, 20, { align: "center" });
      
      doc.setFontSize(14);
      doc.text("Reporte Detallado de Egresos", pageWidth / 2, 28, { align: "center" });

      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Generado el: ${new Date().toLocaleString()}`, pageWidth / 2, 36, { align: "center" });
      doc.text(`Generado por: ${usuarioActual?.nombre || usuarioActual?.email}`, pageWidth / 2, 42, { align: "center" });
      doc.text(`Filtro: ${periodoTexto}`, pageWidth / 2, 48, { align: "center" });

      const tableData = egresos.map(e => [
        new Date(e.fecha).toLocaleDateString(),
        e.tipo?.toUpperCase(),
        e.categoria?.toUpperCase(),
        e.descripcion ? e.descripcion.replace(/\(Abono ID: [a-f0-9-]+\)/i, "").trim() : "-",
        `$${Number(e.monto).toLocaleString("es-CO")}`
      ]);

      const totalGasto = egresos.filter(e => e.tipo === "gasto").reduce((acc, curr) => acc + Number(curr.monto), 0);
      const totalCosto = egresos.filter(e => e.tipo === "costo").reduce((acc, curr) => acc + Number(curr.monto), 0);

      tableData.push([{ content: "", colSpan: 5, styles: { fillColor: [255, 255, 255] } }]);
      tableData.push(["", "", "", "Total Gastos:", `$${totalGasto.toLocaleString("es-CO")}`]);
      tableData.push(["", "", "", "Total Costos:", `$${totalCosto.toLocaleString("es-CO")}`]);
      tableData.push(["", "", "", "Total Egresos:", `$${(totalGasto + totalCosto).toLocaleString("es-CO")}`]);

      doc.autoTable({
        startY: 55,
        head: [["Fecha", "Tipo", "Categoría", "Descripción", "Monto"]],
        body: tableData,
        theme: "grid",
        headStyles: { fillColor: [57, 255, 20], textColor: [0, 0, 0], fontStyle: "bold" },
        styles: { fontSize: 9, cellPadding: 4 },
        columnStyles: { 4: { halign: "right", fontStyle: "bold" } },
        didParseCell: function(data) {
          if (data.row.index >= egresos.length + 1 && data.column.index === 4) {
            data.cell.styles.fontStyle = "bold";
            data.cell.styles.halign = "right";
          }
        }
      });

      setExportStep(3);
      await delay(600);

      doc.save(`Egresos_${periodoTexto.replace(/\s+/g, "_")}.pdf`);

      setExportStep(4);
      await delay(500);
    } catch (err) {
      console.error(err);
      alert("Error al generar PDF.");
    } finally {
      setIsExporting(false);
      setShowDownloadMenu(false);
    }
  };

  return (
    <div className="dashboard-layout">
      <Sidebar />
      {isExporting && (
        <div className="export-modal-overlay">
          <div className="export-modal-card animate-zoom-in">
            <div className="export-modal-header">
              <div className="export-spinner-container">
                <div className="export-spinner"></div>
                <div className="export-spinner-glow"></div>
              </div>
              <h2>Preparando tu informe</h2>
              <p>Estamos procesando la información para generar tu reporte profesional.</p>
            </div>

            <div className="export-modal-body">
              <div className="export-progress-container">
                <div className="export-progress-bar" style={{ width: `${(exportStep / 4) * 100}%` }}></div>
                <span className="export-progress-percentage">{Math.round((exportStep / 4) * 100)}%</span>
              </div>

              <ul className="export-steps-list">
                <li className={exportStep >= 1 ? "active" : ""}>
                  <span className="step-icon">{exportStep > 1 ? "✓" : "⚡"}</span>
                  <span className="step-label">Iniciando sistema de exportación</span>
                </li>
                <li className={exportStep >= 2 ? "active" : ""}>
                  <span className="step-icon">{exportStep > 2 ? "✓" : exportStep === 2 ? "⚡" : "○"}</span>
                  <span className="step-label">Procesando y filtrando registros</span>
                </li>
                <li className={exportStep >= 3 ? "active" : ""}>
                  <span className="step-icon">{exportStep > 3 ? "✓" : exportStep === 3 ? "⚡" : "○"}</span>
                  <span className="step-label">Generando documento y estilos</span>
                </li>
                <li className={exportStep >= 4 ? "active" : ""}>
                  <span className="step-icon">{exportStep > 4 ? "✓" : exportStep === 4 ? "⚡" : "○"}</span>
                  <span className="step-label">Finalizando y descargando archivo</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}

      <main className="dashboard-main">
        <div className="egresos-header">
          <h1>Egresos</h1>

          <div className="egresos-filtros-top" style={{ alignItems: "center" }}>
            <button className="btn-agregar-top" onClick={agregarEgreso}>
              + Agregar Egreso
            </button>
            <button className={`btn-filtro ${filtroFecha === "hoy" ? "active" : ""}`} onClick={() => setFiltroFecha("hoy")}>Hoy</button>
            <button className={`btn-filtro ${filtroFecha === "semana" ? "active" : ""}`} onClick={() => setFiltroFecha("semana")}>Semana</button>
            <button className={`btn-filtro ${filtroFecha === "mes" ? "active" : ""}`} onClick={() => setFiltroFecha("mes")}>Mes</button>
            <button className={`btn-filtro ${filtroFecha === "anio" ? "active" : ""}`} onClick={() => setFiltroFecha("anio")}>Año</button>
            
            {/* Input para fecha exacta */}
            <input 
              type="date" 
              className={`btn-filtro input-fecha ${filtroFecha === "fecha" ? "active" : ""}`}
              value={fechaExacta}
              onChange={(e) => {
                setFechaExacta(e.target.value);
                if(e.target.value) setFiltroFecha("fecha");
              }}
            />

            {/* Si el filtro es mes o año, mostrar selectores */}
            {filtroFecha === "mes" && (
              <div className="filtro-select-mes" style={{ display: "flex", gap: "8px" }}>
                <select value={mesSeleccionado} onChange={(e) => setMesSeleccionado(Number(e.target.value))} className="btn-filtro">
                  {mesesNombres.map((m, i) => i > 0 && <option key={i} value={i}>{m}</option>)}
                </select>
                <select value={anioSeleccionado} onChange={(e) => setAnioSeleccionado(Number(e.target.value))} className="btn-filtro">
                  <option value={2026}>2026</option>
                  <option value={2025}>2025</option>
                  <option value={2024}>2024</option>
                </select>
              </div>
            )}

            {filtroFecha === "anio" && (
              <select value={anioSeleccionado} onChange={(e) => setAnioSeleccionado(Number(e.target.value))} className="btn-filtro">
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
              </select>
            )}

            {/* Menu Descargas */}
            <div className="descargar-container">
              <button
                className="btn-descargar-premium"
                onClick={() => setShowDownloadMenu(!showDownloadMenu)}
              >
                📥 Descargar
              </button>

              {showDownloadMenu && (
                <div className="descargar-menu">
                  <div className="descargar-item excel" onClick={generarExcel}>
                    <img src="https://cdn-icons-png.flaticon.com/512/732/732220.png" alt="Excel" />
                    <span>Formato Excel (.xlsx)</span>
                  </div>
                  <div className="descargar-item pdf" onClick={generarPDF}>
                    <img src="https://cdn-icons-png.flaticon.com/512/337/337946.png" alt="PDF" />
                    <span>Formato PDF (.pdf)</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="egresos-top">
          {/* FORM */}
          <form className="form-egresos" onSubmit={agregarEgreso}>
            {/* CATEGORIA + BOTON */}
            <div className="columna">
              <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="gasto">Gasto</option>
                <option value="costo">Costo</option>
              </select>
            </div>
            <div className="columna-categoria">
              <div className="custom-select">
                <div className="select-box" onClick={() => setOpenCat(!openCat)}>
                  {categoria || "Categoría"}
                </div>
                {openCat && (
                  <ul className="select-options">
                    {categoriasPorTipo[tipo].map((op) => (
                      <li key={op} onClick={() => { setCategoria(op); setOpenCat(false); }}>
                        {op.charAt(0).toUpperCase() + op.slice(1)}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {/* DESCRIPCIÓN */}
            <div className="columna">
              <input
                placeholder="Descripción"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />
            </div>

            {/* MONTO */}
            <div className="columna">
              <input
                type="number"
                placeholder="Monto"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
              />
            </div>

            {/* METODO */}
            <div className="columna">
              <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                <option value="">Método de pago</option>
                <option value="efectivo">Efectivo</option>
                <option value="nequi">Nequi</option>
                <option value="transferencia">Transferencia</option>
              </select>
            </div>
            <button type="submit" style={{ display: "none" }}>Oculto</button>
          </form>
        </div>

        {/* TABLA */}
        <table className="tabla-egresos">
          <thead>
            <tr>
              <th>Categoría</th>
              <th>Descripción</th>
              <th>Monto</th>
              <th>Método</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {egresos.length === 0 ? (
              <tr><td colSpan="6" style={{textAlign:"center", padding:"20px"}}>No hay egresos en este periodo.</td></tr>
            ) : egresos.map((e) => (
              <tr key={e.id}>
                {/* CATEGORIA */}
                <td>
                  {editandoId === e.id ? (
                    <select
                      className="input-edit"
                      value={editData.categoria || ""}
                      onChange={(ev) => setEditData({ ...editData, categoria: ev.target.value })}
                    >
                      <option value="">Categoría</option>
                      {categoriasPorTipo[editData.tipo || "gasto"].map((op) => (
                        <option key={op} value={op}>
                          {op.charAt(0).toUpperCase() + op.slice(1)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    e.categoria ? e.categoria.charAt(0).toUpperCase() + e.categoria.slice(1) : "-"
                  )}
                </td>

                {/* DESCRIPCION */}
                <td>
                  {editandoId === e.id ? (
                    <input
                      className="input-edit"
                      value={editData.descripcion ? editData.descripcion.replace(/\(Abono ID: [a-f0-9-]+\)/i, "").trim() : ""}
                      onChange={(ev) => {
                        const oldDesc = e.descripcion || "";
                        const match = oldDesc.match(/\(Abono ID: [a-f0-9-]+\)/i);
                        const newDesc = match ? `${ev.target.value} ${match[0]}` : ev.target.value;
                        setEditData({ ...editData, descripcion: newDesc });
                      }}
                    />
                  ) : (
                    e.descripcion ? e.descripcion.replace(/\(Abono ID: [a-f0-9-]+\)/i, "").trim() : "-"
                  )}
                </td>

                {/* MONTO */}
                <td style={{ color: "#ff3c3c" }}>
                  {editandoId === e.id ? (
                    <input
                      className="input-edit"
                      type="number"
                      value={editData.monto}
                      onChange={(ev) => setEditData({ ...editData, monto: Number(ev.target.value) })}
                    />
                  ) : (
                    `$${e.monto.toLocaleString()}`
                  )}
                </td>

                {/* METODO */}
                <td>
                  {editandoId === e.id ? (
                    <select
                      className="input-edit"
                      value={editData.metodo}
                      onChange={(ev) => setEditData({ ...editData, metodo: ev.target.value })}
                    >
                      <option value="">Método</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="nequi">Nequi</option>
                      <option value="transferencia">Transferencia</option>
                    </select>
                  ) : (
                    e.metodo || "-"
                  )}
                </td>

                {/* FECHA */}
                <td>{new Date(e.fecha).toLocaleDateString()}</td>

                {/* ACCIONES */}
                <td style={{ display: "flex", gap: "8px" }}>
                  {editandoId === e.id ? (
                    <>
                      <button className="btn-guardar" onClick={guardarEdicion}>Guardar</button>
                      <button className="btn-cancelar" onClick={() => setEditandoId(null)}>Cancelar</button>
                    </>
                  ) : (
                    <>
                      {e.categoria === "nomina" ? (
                        <span style={{ color: "#94a3b8", fontSize: "12px", fontStyle: "italic", alignSelf: "center" }}>
                          Gesti&oacute;n en N&oacute;mina
                        </span>
                      ) : (
                        <>
                          <button className="btn-editar" onClick={() => { setEditandoId(e.id); setEditData(e); }}>Editar</button>
                          <button className="btn-eliminar" onClick={() => eliminarEgreso(e.id)}>Eliminar</button>
                        </>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </div>
  );
}

export default EgresosPage;