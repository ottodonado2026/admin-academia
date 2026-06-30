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
import { useAuth } from "../context/AuthContext";
import { useDashboard } from "../hooks/useDashboard";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

const meses = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];
const COLORS = ['#0f62fe', '#22c55e', '#ef4444', '#f59e0b', '#8b5cf6'];

function DashboardPage() {
  const navigate = useNavigate();
  const { user, role, userData, logout } = useAuth();
  const { ingresos, egresos, alumnos, pagos, historialPagos, loading: loadingData, refetch } = useDashboard();

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const hoy = new Date();
  const [mesSeleccionado, setMesSeleccionado] = useState(hoy.getMonth());
  const [anioSeleccionado, setAnioSeleccionado] = useState(hoy.getFullYear());

  const [isExporting, setIsExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [exportStep, setExportStep] = useState(0);

  const usuarioActual = {
    ...user,
    nombre: userData?.nombre || user?.email,
    rol: role === "owner" ? "Gerente" : role === "contador" ? "Contador" : role === "coordinador" ? "Coordinador" : "Usuario"
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

  const normalizarFecha = (fecha) => {
    const d = new Date(fecha);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const formatearPesos = (valor) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(valor || 0);

  // Filtros del mes
  const ingresosDelMes = useMemo(() => {
    return ingresos.filter(i => {
      if(!i.fecha) return false;
      const d = new Date(i.fecha);
      return d.getMonth() === mesSeleccionado && d.getFullYear() === anioSeleccionado;
    });
  }, [ingresos, mesSeleccionado, anioSeleccionado]);

  const egresosDelMes = useMemo(() => {
    return egresos.filter(e => {
      if(!e.fecha) return false;
      const d = new Date(e.fecha);
      return d.getMonth() === mesSeleccionado && d.getFullYear() === anioSeleccionado;
    });
  }, [egresos, mesSeleccionado, anioSeleccionado]);

  const historialFiltrado = useMemo(() => {
    return historialPagos.filter(h => {
      if(!h.fecha) return false;
      const d = new Date(h.fecha);
      return d.getMonth() === mesSeleccionado && d.getFullYear() === anioSeleccionado;
    });
  }, [historialPagos, mesSeleccionado, anioSeleccionado]);

  const totalIngresosMes = ingresosDelMes.reduce((acc, i) => acc + (i.monto || 0), 0);
  const totalEgresosMes = egresosDelMes.reduce((acc, e) => acc + (e.monto || 0), 0);
  const utilidadNeta = totalIngresosMes - totalEgresosMes;
  const alumnosActivos = alumnos.filter(a => a.estado === "activo").length;

  // Chart Data
  const chartDataMensual = useMemo(() => {
    const data = [];
    for(let i = 0; i < 12; i++) {
      const ing = ingresos.filter(ing => ing.fecha && new Date(ing.fecha).getMonth() === i && new Date(ing.fecha).getFullYear() === anioSeleccionado).reduce((a, b) => a + (b.monto || 0), 0);
      const egr = egresos.filter(e => e.fecha && new Date(e.fecha).getMonth() === i && new Date(e.fecha).getFullYear() === anioSeleccionado).reduce((a, b) => a + (b.monto || 0), 0);
      data.push({
        mes: meses[i].substring(0,3),
        Ingresos: ing,
        Egresos: egr
      });
    }
    return data;
  }, [ingresos, egresos, anioSeleccionado]);

  const chartDataMatriculas = useMemo(() => {
    const data = [];
    for(let i = 0; i < 12; i++) {
      const mat = alumnos.filter(a => a.created_at && new Date(a.created_at).getMonth() === i && new Date(a.created_at).getFullYear() === anioSeleccionado).length;
      data.push({
        mes: meses[i].substring(0,3),
        Matriculas: mat
      });
    }
    return data;
  }, [alumnos, anioSeleccionado]);

  const estadosAlumnosData = useMemo(() => {
    const activos = alumnos.filter(a => a.estado === 'activo').length;
    const retiro = alumnos.filter(a => a.estado === 'retirado').length;
    const mora = alumnos.filter(a => a.estado_pago === 'mora').length; // Mora is a subset of activos normally, but let's graph it.
    
    // To avoid overlap, we count: Al Dia (Activos - Mora), Mora, Retirados
    const alDia = activos - mora;
    return [
      { name: 'Al Día', value: alDia > 0 ? alDia : 0 },
      { name: 'En Mora', value: mora },
      { name: 'Retirados', value: retiro }
    ];
  }, [alumnos]);

  const ultimasMatriculas = useMemo(() => {
    return [...alumnos].sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 5);
  }, [alumnos]);


  /* ===========================
     EXPORT LOGIC (MANTENIDA)
  =========================== */
  const delay = (ms) => new Promise(res => setTimeout(res, ms));

  const generarExcel = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportStep(1);
    try {
      await delay(600);
      setExportStep(2);
      await delay(600);
      
      const workbook = new ExcelJS.Workbook();
      const detalleSheet = workbook.addWorksheet("Detalle Transacciones");
      
      detalleSheet.addRow([`Reporte Financiero ${config.nombre}`]);
      detalleSheet.addRow([`Periodo: ${meses[mesSeleccionado]} ${anioSeleccionado}`]);
      detalleSheet.addRow([`Generado por: ${usuarioActual.nombre}`]);
      detalleSheet.addRow([]);

      detalleSheet.addRow(["Fecha", "Alumno", "Documento", "Curso", "Método", "Referencia", "Monto"]);
      const headerRow = detalleSheet.getRow(5);
      headerRow.eachCell(cell => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF0F62FE" } };
      });

      const dataExport = [...historialFiltrado];
      if (!dataExport.length) {
        alert("No hay pagos en este periodo.");
        setIsExporting(false);
        setExportStep(0);
        return;
      }

      dataExport.forEach((item) => {
        const row = detalleSheet.addRow([
          normalizarFecha(item.fecha),
          item.alumno || "-",
          item.alumnoId || "-",
          item.curso || "-",
          item.metodo || "-",
          item.referencia || "-",
          item.monto || 0,
        ]);
        row.getCell(7).numFmt = '"$"#,##0';
      });

      const total = dataExport.reduce((acc, i) => acc + (i.monto || 0), 0);
      detalleSheet.addRow([]);
      const totalRow = detalleSheet.addRow(["", "", "", "", "", "TOTAL GENERAL", total]);
      totalRow.getCell(7).numFmt = '"$"#,##0';
      totalRow.font = { bold: true };

      detalleSheet.columns = [
        { width: 15 }, { width: 28 }, { width: 18 }, { width: 20 },
        { width: 20 }, { width: 22 }, { width: 18 }
      ];

      setExportStep(3);
      await delay(500);
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });

      setExportStep(4);
      saveAs(blob, `reporte_financiero_${meses[mesSeleccionado]}_${anioSeleccionado}.xlsx`);
    } catch (e) {
      console.error(e);
      alert("Error exportando excel.");
    } finally {
      setIsExporting(false);
      setExportStep(0);
      setShowExportMenu(false);
    }
  };

  const generarPDF = async () => {
    if (isExporting) return;
    setIsExporting(true);
    setExportStep(1);
    try {
      await delay(600);
      setExportStep(2);
      await delay(600);

      const dataExport = [...historialFiltrado];
      if (!dataExport.length) {
        alert("No hay pagos en este periodo.");
        setIsExporting(false);
        setExportStep(0);
        return;
      }

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const colorNavy = [30, 41, 59];
      const colorBlue = [15, 98, 254];

      doc.setFont("helvetica", "bold");
      doc.setFontSize(20);
      doc.setTextColor(colorNavy[0], colorNavy[1], colorNavy[2]);
      doc.text(config.nombre.toUpperCase(), 15, 20);

      doc.setDrawColor(colorBlue[0], colorBlue[1], colorBlue[2]);
      doc.setLineWidth(1.5);
      doc.line(15, 23, 195, 23);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(`Periodo: ${meses[mesSeleccionado]} ${anioSeleccionado}`, 195, 29, { align: "right" });
      doc.text(`Generado: ${new Date().toLocaleDateString()}`, 195, 34, { align: "right" });

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text("RESUMEN CONTABLE", 15, 45);

      autoTable(doc, {
        startY: 50,
        head: [["Indicador", "Valor"]],
        body: [
          ["Total Recaudado (Ingresos)", formatearPesos(totalIngresosMes)],
          ["Total Egresos", formatearPesos(totalEgresosMes)],
          ["Utilidad Neta del Periodo", formatearPesos(utilidadNeta)],
        ],
        theme: "plain",
        headStyles: { fillColor: [243, 244, 246], textColor: colorNavy, fontStyle: "bold" },
        columnStyles: { 1: { halign: "right" } }
      });

      const tableRows = dataExport.map(item => [
        normalizarFecha(item.fecha),
        item.alumno || "-",
        item.metodo || "-",
        item.referencia || "-",
        formatearPesos(item.monto || 0)
      ]);

      const totalGeneral = dataExport.reduce((acc, i) => acc + (i.monto || 0), 0);
      tableRows.push(["", "", "", "TOTAL GENERAL", formatearPesos(totalGeneral)]);

      doc.text("DETALLE DE TRANSACCIONES", 15, doc.lastAutoTable.finalY + 15);
      
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 20,
        head: [["Fecha", "Alumno", "Método", "Referencia", "Monto"]],
        body: tableRows,
        theme: "striped",
        headStyles: { fillColor: colorBlue, textColor: [255, 255, 255], fontStyle: "bold" },
        columnStyles: { 4: { halign: "right", fontStyle: "bold" } }
      });

      doc.save(`reporte_financiero_${meses[mesSeleccionado]}_${anioSeleccionado}.pdf`);
    } catch (e) {
      console.error(e);
      alert("Error exportando PDF.");
    } finally {
      setIsExporting(false);
      setExportStep(0);
      setShowExportMenu(false);
    }
  };

  return (
    <div className="dashboard-layout colegio-dashboard">
      <Sidebar onLogout={handleLogout} />

      <main className="dashboard-main">
        {/* HEADER */}
        <header className="topbar">
          <div>
            <h1>Dashboard Académico y Financiero</h1>
            <p>Resumen gerencial de {config.nombre}</p>
          </div>
          
          <div className="topbar-actions">
            <select 
              className="mes-selector"
              value={mesSeleccionado} 
              onChange={e => setMesSeleccionado(Number(e.target.value))}
            >
              {meses.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select 
              className="mes-selector"
              value={anioSeleccionado} 
              onChange={e => setAnioSeleccionado(Number(e.target.value))}
            >
              {[2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
            </select>

            <div className="export-menu-container">
              <button onClick={() => setShowExportMenu(!showExportMenu)} className="btn-exportar">
                Exportar Reporte ▼
              </button>
              {showExportMenu && (
                <div className="export-dropdown-menu">
                  <button onClick={generarExcel}>📊 Excel (.xlsx)</button>
                  <button onClick={generarPDF}>📄 PDF Document</button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* LOADING & EXPORT OVERLAYS */}
        {loadingData && (
          <div className="loading-overlay-dash">
            <div className="spinner-dash"></div>
            <p>Cargando datos del colegio...</p>
          </div>
        )}

        {isExporting && (
          <div className="export-overlay">
            <div className="export-modal">
              <div className="spinner"></div>
              <h3>Generando Documento...</h3>
              <p>Por favor espera unos segundos.</p>
            </div>
          </div>
        )}

        {/* KPIs */}
        <div className="kpi-grid">
          <div className="kpi-card blue">
            <div className="kpi-icon">🎓</div>
            <div className="kpi-info">
              <h3>Estudiantes Activos</h3>
              <h2>{alumnosActivos}</h2>
              <p>Total en el sistema</p>
            </div>
          </div>
          <div className="kpi-card green">
            <div className="kpi-icon">💰</div>
            <div className="kpi-info">
              <h3>Ingresos ({meses[mesSeleccionado]})</h3>
              <h2>{formatearPesos(totalIngresosMes)}</h2>
              <p>Recaudos y pensiones</p>
            </div>
          </div>
          <div className="kpi-card red">
            <div className="kpi-icon">📉</div>
            <div className="kpi-info">
              <h3>Egresos ({meses[mesSeleccionado]})</h3>
              <h2>{formatearPesos(totalEgresosMes)}</h2>
              <p>Gastos operativos</p>
            </div>
          </div>
          <div className="kpi-card purple">
            <div className="kpi-icon">⚖️</div>
            <div className="kpi-info">
              <h3>Balance Neto</h3>
              <h2>{formatearPesos(utilidadNeta)}</h2>
              <p>Flujo de caja libre</p>
            </div>
          </div>
        </div>

        {/* CHARTS */}
        <div className="charts-grid">
          <div className="chart-card">
            <h3>Flujo Financiero (Ingresos vs Egresos)</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartDataMensual}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fill: '#64748B'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B'}} tickFormatter={(v) => `$${v/1000}k`} />
                  <Tooltip formatter={(val) => formatearPesos(val)} />
                  <Legend />
                  <Bar dataKey="Ingresos" fill="#22c55e" radius={[4,4,0,0]} />
                  <Bar dataKey="Egresos" fill="#ef4444" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="chart-card">
            <h3>Crecimiento de Matrículas</h3>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartDataMatriculas}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="mes" axisLine={false} tickLine={false} tick={{fill: '#64748B'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748B'}} />
                  <Tooltip />
                  <Line type="monotone" dataKey="Matriculas" stroke="#0f62fe" strokeWidth={3} dot={{r: 4, fill: '#0f62fe'}} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* BOTTOM WIDGETS */}
        <div className="bottom-widgets">
          <div className="widget-card">
            <h3>Estado de Estudiantes</h3>
            <div className="chart-container pie-container">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={estadosAlumnosData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {estadosAlumnosData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="widget-card">
            <h3>Últimas Matrículas</h3>
            <div className="ultimos-list">
              {ultimasMatriculas.length === 0 ? (
                <p className="empty-msg">No hay matrículas recientes.</p>
              ) : (
                ultimasMatriculas.map(a => (
                  <div key={a.id} className="alumno-item">
                    <div className="avatar">{a.nombre.charAt(0).toUpperCase()}</div>
                    <div className="alumno-info">
                      <h4>{a.nombre}</h4>
                      <span>Fecha: {normalizarFecha(a.created_at)}</span>
                    </div>
                    <span className="badge-estado success">Matriculado</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}

export default DashboardPage;