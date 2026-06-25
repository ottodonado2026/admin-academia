import { useEffect, useState } from "react";
import { supabase } from "../../services/supabaseClient";
import "./ProfesorPagos.css";

const meses = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

export default function ProfesorPagos() {
  const [detallesNomina, setDetallesNomina] = useState([]);
  const [detalleSeleccionado, setDetalleSeleccionado] = useState(null);
  const [abonosHistorial, setAbonosHistorial] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingAbonos, setLoadingAbonos] = useState(false);

  const cargarDetalles = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        if (!silent) setLoading(false);
        return;
      }

      // Cargar detalles de nómina vinculados al docente
      const { data, error } = await supabase
        .from("nomina_detalles")
        .select("*, nominas(periodo, tipo, estado)")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error cargando detalles de nómina:", error);
        if (!silent) setLoading(false);
        return;
      }

      setDetallesNomina(data || []);
      if (data && data.length > 0) {
        setDetalleSeleccionado(prev => {
          if (prev) {
            const actualizado = data.find(d => d.id === prev.id);
            return actualizado || data[0];
          }
          return data[0];
        });
      }
    } catch (err) {
      console.error("Error global cargando pagos del profesor:", err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const cargarAbonos = async (silent = false) => {
    if (!detalleSeleccionado) return;
    if (!silent) setLoadingAbonos(true);
    try {
      const { data, error } = await supabase
        .from("nomina_abonos")
        .select("*")
        .eq("nomina_detalle_id", detalleSeleccionado.id)
        .order("fecha_pago", { ascending: false });

      if (error) throw error;
      setAbonosHistorial(data || []);
    } catch (err) {
      console.error("Error cargando abonos:", err);
    } finally {
      if (!silent) setLoadingAbonos(false);
    }
  };

  useEffect(() => {
    cargarDetalles();
  }, []);

  useEffect(() => {
    cargarAbonos();
  }, [detalleSeleccionado?.id]);

  useEffect(() => {
    const channel = supabase
      .channel("profesor_pagos_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "nomina_detalles" }, () => {
        cargarDetalles(true);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "nomina_abonos" }, () => {
        cargarAbonos(true);
        cargarDetalles(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [detalleSeleccionado?.id]);

  const formatearMoneda = (val) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0
    }).format(Number(val) || 0);
  };

  const parsearPeriodo = (periodoStr) => {
    if (!periodoStr) return "";
    const [year, month] = periodoStr.split("-");
    const mesNombre = meses[parseInt(month, 10) - 1];
    return `${mesNombre} ${year}`;
  };

  if (loading) {
    return <div className="profesor-pagos-loading">Cargando información de pagos...</div>;
  }

  if (detallesNomina.length === 0) {
    return (
      <div className="profesor-pagos-vacio">
        <span className="vacio-icon">💵</span>
        <h3>Sin Historial de Pagos</h3>
        <p>Aún no se han registrado periodos de nómina o abonos asociados a tu cuenta de profesor.</p>
      </div>
    );
  }

  const progreso = detalleSeleccionado?.total_neto > 0 
    ? (detalleSeleccionado.total_pagado / detalleSeleccionado.total_neto) * 100 
    : 0;

  const restante = detalleSeleccionado 
    ? detalleSeleccionado.total_neto - detalleSeleccionado.total_pagado 
    : 0;

  return (
    <div className="profesor-pagos-container">
      <div className="profesor-pagos-layout">
        
        {/* PANEL IZQUIERDO: PERIODOS */}
        <aside className="profesor-pagos-sidebar">
          <h3>Periodos de Pago</h3>
          <div className="periodos-lista">
            {detallesNomina.map((det) => {
              const esActivo = detalleSeleccionado?.id === det.id;
              const descPeriodo = parsearPeriodo(det.nominas?.periodo);
              
              return (
                <button
                  key={det.id}
                  type="button"
                  className={`periodo-item ${esActivo ? "active" : ""}`}
                  onClick={() => setDetalleSeleccionado(det)}
                >
                  <div className="periodo-info">
                    <span className="periodo-nombre">{descPeriodo}</span>
                    <span className="periodo-tipo">Sueldo neto: {formatearMoneda(det.total_neto)}</span>
                  </div>
                  <span className={`estado-badge ${det.estado}`}>
                    {det.estado?.toUpperCase()}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* PANEL DERECHO: DETALLES Y HISTORIAL */}
        <section className="profesor-pagos-content">
          {detalleSeleccionado && (
            <>
              <div className="pagos-content-header">
                <h2>Liquidación: {parsearPeriodo(detalleSeleccionado.nominas?.periodo)}</h2>
                <span className={`estado-badge large ${detalleSeleccionado.estado}`}>
                  {detalleSeleccionado.estado?.toUpperCase()}
                </span>
              </div>

              {/* KPIS */}
              <div className="profesor-pagos-kpis">
                <div className="pagos-kpi">
                  <span>Monto Total Neto</span>
                  <strong>{formatearMoneda(detalleSeleccionado.total_neto)}</strong>
                </div>
                <div className="pagos-kpi kpi-pagado">
                  <span>Total Recibido</span>
                  <strong>{formatearMoneda(detalleSeleccionado.total_pagado)}</strong>
                </div>
                <div className="pagos-kpi kpi-restante">
                  <span>Monto Pendiente</span>
                  <strong>{formatearMoneda(restante)}</strong>
                </div>
              </div>

              {/* PROGRESS BAR */}
              <div className="profesor-pagos-progreso">
                <div className="progreso-header">
                  <span>Progreso de Pago</span>
                  <strong>{Math.round(progreso)}% Completado</strong>
                </div>
                <div className="profesor-progreso-bar-bg">
                  <div
                    className="profesor-progreso-bar-fill"
                    style={{ width: `${Math.min(progreso, 100)}%` }}
                  />
                </div>
              </div>

              {/* ABONOS LIST */}
              <div className="profesor-abonos-seccion">
                <h3>Abonos Recibidos</h3>
                <div className="profesor-abonos-box">
                  {loadingAbonos ? (
                    <div className="abonos-loading-text">Cargando abonos...</div>
                  ) : abonosHistorial.length === 0 ? (
                    <div className="abonos-vacio-text">No se han registrado abonos para este periodo de nómina.</div>
                  ) : (
                    <div className="abonos-tabla-wrapper">
                      <table className="profesor-abonos-table">
                        <thead>
                          <tr>
                            <th>Fecha</th>
                            <th>Monto Recibido</th>
                            <th>Método</th>
                            <th>Referencia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {abonosHistorial.map((abono) => (
                            <tr key={abono.id}>
                              <td>{new Date(abono.fecha_pago).toLocaleDateString()}</td>
                              <td className="monto-recibido">{formatearMoneda(abono.monto)}</td>
                              <td style={{ textTransform: "capitalize" }}>{abono.metodo_pago}</td>
                              <td className="mono-code">{abono.referencia || "-"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
