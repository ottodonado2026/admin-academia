import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

const cleanConcepto = (str) => {
  if (!str) return "Sin descripción";
  return String(str).replace(/\s*\(Abono ID:.*?\)/i, "").trim();
};

const getPeriodoText = (periodo) => {
  const meses = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const fecha = new Date();
  
  if (periodo === "mes") return `Mes de ${meses[fecha.getMonth()]} del ${fecha.getFullYear()}`;
  if (periodo === "semana") return "Últimos 7 días";
  if (periodo === "año") return `Año ${fecha.getFullYear()}`;
  if (periodo === "todo") return "Histórico Completo";
  return periodo;
};

/**
 * Exporta el balance a Excel
 */
export const exportBalanceToExcel = (ingresos, egresos, totales, filtros) => {
  // 1. Crear hojas de datos
  const wsIngresos = XLSX.utils.json_to_sheet(
    ingresos.map((i) => ({
      Fecha: new Date(i.fecha).toLocaleDateString(),
      Concepto: cleanConcepto(i.nombre),
      Categoría: i.categoria,
      Método: i.metodo,
      Monto: i.monto,
    }))
  );

  const wsEgresos = XLSX.utils.json_to_sheet(
    egresos.map((e) => ({
      Fecha: new Date(e.fecha).toLocaleDateString(),
      Concepto: cleanConcepto(e.descripcion || e.nombre || e.concepto),
      Categoría: e.categoria,
      Monto: e.monto,
    }))
  );

  const wsResumen = XLSX.utils.json_to_sheet([
    { Métrica: "Total Ingresos", Valor: totales.ingresos },
    { Métrica: "Total Egresos", Valor: totales.egresos },
    { Métrica: "Cuentas por Cobrar", Valor: totales.porCobrar },
    { Métrica: "Patrimonio / Flujo Real", Valor: totales.patrimonio },
  ]);

  // 2. Crear libro
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");
  XLSX.utils.book_append_sheet(wb, wsIngresos, "Ingresos");
  XLSX.utils.book_append_sheet(wb, wsEgresos, "Egresos");

  // 3. Descargar
  const fileName = `Balance_General_${filtros.periodo}_${new Date().toISOString().split("T")[0]}.xlsx`;
  XLSX.writeFile(wb, fileName);
};

/**
 * Exporta el balance a PDF Profesional
 */
export const exportBalanceToPDF = (ingresos, egresos, totales, filtros, empresa = "Caribbean Studio Academy") => {
  const doc = new jsPDF();
  
  // Membrete
  doc.setFontSize(22);
  doc.setTextColor(41, 128, 185);
  doc.text(empresa, 14, 22);
  
  doc.setFontSize(16);
  doc.setTextColor(44, 62, 80);
  doc.text("Reporte de Balance General", 14, 32);
  
  doc.setFontSize(11);
  doc.setTextColor(127, 140, 141);
  doc.text(`Período: ${getPeriodoText(filtros.periodo)}`, 14, 40);
  doc.text(`Fecha de emisión: ${new Date().toLocaleString()}`, 14, 46);

  // Resumen Financiero
  autoTable(doc, {
    startY: 55,
    head: [["Métrica Financiera", "Valor (USD/Local)"]],
    body: [
      ["Total Ingresos Operativos", `$${totales.ingresos.toLocaleString()}`],
      ["Total Egresos Operativos", `$${totales.egresos.toLocaleString()}`],
      ["Cuentas por Cobrar (Pendiente)", `$${totales.porCobrar.toLocaleString()}`],
      ["Patrimonio / Flujo de Caja Real", `$${totales.patrimonio.toLocaleString()}`],
    ],
    theme: "grid",
    headStyles: { fillColor: [41, 128, 185] },
    styles: { fontSize: 11, halign: "left" },
    columnStyles: { 1: { halign: "right", fontStyle: "bold" } },
  });

  // Top 5 Ingresos
  let finalY = doc.lastAutoTable.finalY + 15;
  doc.setFontSize(14);
  doc.setTextColor(44, 62, 80);
  doc.text("Detalle de Ingresos (Top 10 recientes)", 14, finalY);

  const topIngresos = ingresos.slice(0, 10).map((i) => [
    new Date(i.fecha).toLocaleDateString(),
    cleanConcepto(i.nombre),
    i.categoria,
    `$${i.monto.toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: finalY + 5,
    head: [["Fecha", "Concepto", "Categoría", "Monto"]],
    body: topIngresos.length ? topIngresos : [["-", "No hay datos", "-", "-"]],
    theme: "striped",
    headStyles: { fillColor: [39, 174, 96] },
  });

  // Top 5 Egresos
  finalY = doc.lastAutoTable.finalY + 15;
  if (finalY > 250) {
    doc.addPage();
    finalY = 20;
  }

  doc.setFontSize(14);
  doc.setTextColor(44, 62, 80);
  doc.text("Detalle de Egresos (Top 10 recientes)", 14, finalY);

  const topEgresos = egresos.slice(0, 10).map((e) => [
    new Date(e.fecha).toLocaleDateString(),
    cleanConcepto(e.descripcion || e.nombre || e.concepto),
    e.categoria,
    `$${e.monto.toLocaleString()}`,
  ]);

  autoTable(doc, {
    startY: finalY + 5,
    head: [["Fecha", "Concepto", "Categoría", "Monto"]],
    body: topEgresos.length ? topEgresos : [["-", "No hay datos", "-", "-"]],
    theme: "striped",
    headStyles: { fillColor: [192, 57, 43] },
  });

  // Firmas
  finalY = doc.lastAutoTable.finalY + 40;
  if (finalY > 260) {
    doc.addPage();
    finalY = 40;
  }

  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.line(40, finalY, 90, finalY);
  doc.line(120, finalY, 170, finalY);
  
  doc.setFontSize(10);
  doc.text("Revisado por (Gerencia)", 45, finalY + 5);
  doc.text("Auditoría Contable", 128, finalY + 5);

  const fileName = `Balance_General_${filtros.periodo}.pdf`;
  doc.save(fileName);
};
