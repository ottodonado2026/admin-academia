import { useEffect, useState, useMemo } from "react";
import Sidebar from "../components/Sidebar";
import { supabase } from "../services/supabaseClient";
import { registrarAuditoria } from "../services/auditoriaService";
import { exportBalanceToExcel, exportBalanceToPDF } from "../utils/exportBalance";
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from "recharts";
import "./BalanceGeneral.css";

const COLORS = ['#22c55e', '#ef4444', '#f59e0b', '#3b82f6'];

export default function BalanceGeneral() {
  const [ingresos, setIngresos] = useState([]);
  const [egresos, setEgresos] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filtroPeriodo, setFiltroPeriodo] = useState("mes"); // semana, mes, año, todo
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailDestino, setEmailDestino] = useState("");
  const [enviando, setEnviando] = useState(false);

  // Estados de animación de descarga
  const [isExporting, setIsExporting] = useState(false);
  const [exportPhase, setExportPhase] = useState("Iniciando...");

  const usuario = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [resIngresos, resEgresos, resPagos] = await Promise.all([
      supabase.from("ingresos").select("*"),
      supabase.from("egresos").select("*"),
      supabase.from("pagos").select("*")
    ]);
    if (resIngresos.data) setIngresos(resIngresos.data);
    if (resEgresos.data) setEgresos(resEgresos.data);
    if (resPagos.data) setPagos(resPagos.data);
    setLoading(false);
  };

  const dataFiltrada = useMemo(() => {
    const ahora = new Date();
    
    const isWithinPeriod = (fechaStr) => {
      if (filtroPeriodo === "todo") return true;
      const fecha = new Date(fechaStr);
      if (filtroPeriodo === "mes") {
        return fecha.getMonth() === ahora.getMonth() && fecha.getFullYear() === ahora.getFullYear();
      }
      if (filtroPeriodo === "año") {
        return fecha.getFullYear() === ahora.getFullYear();
      }
      if (filtroPeriodo === "semana") {
        const unaSemanaAtras = new Date();
        unaSemanaAtras.setDate(ahora.getDate() - 7);
        return fecha >= unaSemanaAtras && fecha <= ahora;
      }
      return true;
    };

    const ingresosF = ingresos.filter(i => isWithinPeriod(i.fecha));
    const egresosF = egresos.filter(e => isWithinPeriod(e.fecha));

    const totalIngresos = ingresosF.reduce((acc, i) => acc + Number(i.monto || 0), 0);
    const totalEgresos = egresosF.reduce((acc, e) => acc + Number(e.monto || 0), 0);
    const patrimonio = totalIngresos - totalEgresos;
    
    // Pagos pendientes
    const totalPorCobrar = pagos
      .filter(p => p.saldoPendiente > 0)
      .reduce((acc, p) => acc + Number(p.saldoPendiente || 0), 0);

    return {
      ingresosF,
      egresosF,
      totales: {
        ingresos: totalIngresos,
        egresos: totalEgresos,
        patrimonio,
        porCobrar: totalPorCobrar,
      }
    };
  }, [ingresos, egresos, pagos, filtroPeriodo]);

  const { ingresosF, egresosF, totales } = dataFiltrada;

  // Datos para gráficas
  const pieData = [
    { name: "Ingresos", value: totales.ingresos },
    { name: "Egresos", value: totales.egresos }
  ];

  const barData = [
    { name: "Ingresos", monto: totales.ingresos },
    { name: "Egresos", monto: totales.egresos },
    { name: "Flujo Real", monto: totales.patrimonio > 0 ? totales.patrimonio : 0 }
  ];

  const rentabilidad = totales.ingresos > 0 
    ? ((totales.patrimonio / totales.ingresos) * 100).toFixed(1) 
    : 0;

  const handleExportar = async (formato) => {
    setIsExporting(true);
    setExportPhase("Autenticando auditoría...");

    // Registrar auditoría
    await registrarAuditoria("descargar", "balance_general", `formato_${formato}`, {
      filtros: { periodo: filtroPeriodo },
      totales
    }, usuario);

    setExportPhase("Recopilando datos financieros...");
    
    setTimeout(() => {
      setExportPhase(formato === "pdf" ? "Renderizando páginas del PDF..." : "Generando hojas de cálculo...");
      
      setTimeout(() => {
        try {
          if (formato === "excel") {
            exportBalanceToExcel(ingresosF, egresosF, totales, { periodo: filtroPeriodo });
          } else {
            exportBalanceToPDF(ingresosF, egresosF, totales, { periodo: filtroPeriodo });
          }
          setExportPhase("¡Descarga Completada!");
        } catch (error) {
          console.error(error);
          setExportPhase("Error al generar el archivo.");
        }
        
        setTimeout(() => setIsExporting(false), 1000);
      }, 1500);
    }, 1000);
  };

  const handleEnviarCorreo = async (e) => {
    e.preventDefault();
    if (!emailDestino) return;
    setEnviando(true);
    
    // Aquí registraríamos en Supabase o llamaríamos a la Edge Function
    await registrarAuditoria("enviar_correo", "balance_general", emailDestino, {
      filtros: { periodo: filtroPeriodo }
    }, usuario);

    // Mock sending since ZeptoMail is out of credits
    setTimeout(() => {
      setEnviando(false);
      setShowEmailModal(false);
      setEmailDestino("");
      alert(`Reporte enviado exitosamente a ${emailDestino} (Simulación). Recuerda recargar los créditos de ZeptoMail o conectar EmailJS.`);
    }, 1500);
  };

  return (
    <div className="dashboard-layout balance-expert-layout">
      <Sidebar />

      <main className="dashboard-main balance-expert-main">
        <header className="balance-header">
          <div>
            <h1>Balance General y Financiero</h1>
            <p>Módulo avanzado de rendimiento contable y auditoría</p>
          </div>
          
          <div className="balance-actions">
            <select 
              className="balance-select" 
              value={filtroPeriodo} 
              onChange={(e) => setFiltroPeriodo(e.target.value)}
            >
              <option value="semana">Últimos 7 días</option>
              <option value="mes">Este Mes</option>
              <option value="año">Este Año</option>
              <option value="todo">Histórico Completo</option>
            </select>

            <button className="btn-export pdf" onClick={() => handleExportar("pdf")}>
              ⬇ PDF
            </button>
            <button className="btn-export excel" onClick={() => handleExportar("excel")}>
              ⬇ Excel
            </button>
            <button className="btn-export mail" onClick={() => setShowEmailModal(true)}>
              ✉ Enviar Reporte
            </button>
          </div>
        </header>

        {loading ? (
          <div className="balance-loader">Cargando datos en tiempo real...</div>
        ) : (
          <>
            <div className="kpi-expert-grid">
              <div className="kpi-expert-card">
                <span>Ingresos Operativos</span>
                <strong>${totales.ingresos.toLocaleString()}</strong>
                <div className="kpi-expert-footer ok">Total facturado</div>
              </div>

              <div className="kpi-expert-card">
                <span>Egresos Operativos</span>
                <strong>${totales.egresos.toLocaleString()}</strong>
                <div className="kpi-expert-footer warn">Costos totales</div>
              </div>

              <div className="kpi-expert-card">
                <span>Cuentas por Cobrar</span>
                <strong>${totales.porCobrar.toLocaleString()}</strong>
                <div className="kpi-expert-footer danger">Pendiente de pago</div>
              </div>

              <div className={`kpi-expert-card ${totales.patrimonio >= 0 ? "ok-border" : "danger-border"}`}>
                <span>Flujo de Caja / Patrimonio</span>
                <strong>${totales.patrimonio.toLocaleString()}</strong>
                <div className={`kpi-expert-footer ${totales.patrimonio >= 0 ? "ok" : "danger"}`}>
                  Rentabilidad: {rentabilidad}%
                </div>
              </div>
            </div>

            <div className="balance-charts-container">
              <div className="chart-box">
                <h3>Distribución (Ingresos vs Egresos)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="chart-box">
                <h3>Comparativa de Flujo</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={barData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="name" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <RechartsTooltip formatter={(value) => `$${value.toLocaleString()}`} />
                    <Bar dataKey="monto" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                      {
                        barData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))
                      }
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="balance-insights">
              <h3>Recomendaciones Automáticas (IA Analítica)</h3>
              <ul>
                {totales.porCobrar > (totales.ingresos * 0.2) && (
                  <li>⚠️ <strong>Alerta de Cartera:</strong> Las cuentas por cobrar superan el 20% de tus ingresos. Refuerza la gestión de cobranza.</li>
                )}
                {totales.egresos > totales.ingresos && (
                  <li>🚨 <strong>Pérdida Operativa:</strong> Los egresos son mayores a los ingresos. Revisa y recorta gastos innecesarios de inmediato.</li>
                )}
                {totales.patrimonio > 0 && totales.egresos <= (totales.ingresos * 0.6) && (
                  <li>✅ <strong>Salud Financiera Excelente:</strong> Tus gastos representan menos del 60% de tus ingresos. Mantén este margen operativo.</li>
                )}
                {totales.ingresos === 0 && (
                  <li>ℹ️ No hay ingresos registrados en este periodo.</li>
                )}
              </ul>
            </div>
          </>
        )}
      </main>

      {showEmailModal && (
        <div className="balance-modal-overlay">
          <div className="balance-modal">
            <button className="balance-modal-close" onClick={() => setShowEmailModal(false)}>×</button>
            <h2>Enviar Reporte Financiero</h2>
            <p>El sistema adjuntará automáticamente el PDF del balance generado.</p>
            
            <div className="zepto-alert">
              ⚠️ <strong>Aviso:</strong> El proveedor ZeptoMail se encuentra sin créditos. El envío actualmente operará en modo simulado/auditoría.
            </div>

            <form onSubmit={handleEnviarCorreo}>
              <div className="form-group">
                <label>Correo Electrónico Destino</label>
                <input 
                  type="email" 
                  required 
                  value={emailDestino} 
                  onChange={e => setEmailDestino(e.target.value)} 
                  placeholder="gerencia@empresa.com"
                />
              </div>
              <button type="submit" className="btn-send-mail" disabled={enviando}>
                {enviando ? "Enviando e inyectando auditoría..." : "Enviar Correo Seguro"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Pantalla de Animación Dinámica */}
      {isExporting && (
        <div className="export-animation-overlay">
          <div className="export-animation-box">
            <div className="export-spinner"></div>
            <h3>Generando Reporte Profesional</h3>
            <p>{exportPhase}</p>
          </div>
        </div>
      )}
    </div>
  );
}