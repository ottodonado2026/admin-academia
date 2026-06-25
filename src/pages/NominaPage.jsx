import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { supabase } from "../services/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { registrarAuditoria } from "../services/auditoriaService";
import "./NominaPage.css";

const meses = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
];

const anios = [2025, 2026, 2027, 2028];

export default function NominaPage() {
  const { user: usuarioActual, role: userRole } = useAuth();

  const hoy = new Date();
  const [mesSeleccionado, setMesSeleccionado] = useState(hoy.getMonth());
  const [anioSeleccionado, setAnioSeleccionado] = useState(hoy.getFullYear());
  const [activeTab, setActiveTab] = useState("profesor"); // 'profesor' | 'asesor'

  const [nominaGeneral, setNominaGeneral] = useState(null);
  const [detalles, setDetalles] = useState([]);
  const [cargando, setCargando] = useState(false);

  // Modales
  const [mostrarAbonarModal, setMostrarAbonarModal] = useState(false);
  const [detalleParaAbonar, setDetalleParaAbonar] = useState(null);
  const [montoAbonar, setMontoAbonar] = useState("");
  const [metodoPago, setMetodoPago] = useState("transferencia");
  const [referenciaPago, setReferenciaPago] = useState("");

  const [mostrarAbonosModal, setMostrarAbonosModal] = useState(false);
  const [detalleParaAbonos, setDetalleParaAbonos] = useState(null);
  const [abonosHistorial, setAbonosHistorial] = useState([]);
  const [cargandoAbonos, setCargandoAbonos] = useState(false);

  const [guardandoAbono, setGuardandoAbono] = useState(false);

  const [mostrarEditarAbonoModal, setMostrarEditarAbonoModal] = useState(false);
  const [abonoAEditar, setAbonoAEditar] = useState(null);
  const [montoEditar, setMontoEditar] = useState("");
  const [metodoPagoEditar, setMetodoPagoEditar] = useState("transferencia");
  const [referenciaEditar, setReferenciaEditar] = useState("");
  const [guardandoEdicionAbono, setGuardandoEdicionAbono] = useState(false);

  const periodoActual = `${anioSeleccionado}-${String(mesSeleccionado + 1).padStart(2, "0")}`;

  const fetchNomina = async () => {
    setCargando(true);
    try {
      // 1. Buscar si ya existe la nómina del periodo y tipo
      const { data: nomina, error: nominaError } = await supabase
        .from("nominas")
        .select("*")
        .eq("periodo", periodoActual)
        .eq("tipo", activeTab)
        .maybeSingle();

      if (nominaError) {
        console.error("Error buscando nomina:", nominaError);
        setCargando(false);
        return;
      }

      if (!nomina) {
        setNominaGeneral(null);
        setDetalles([]);
        setCargando(false);
        return;
      }

      setNominaGeneral(nomina);

      // 2. Cargar los detalles de la nómina
      const { data: details, error: detailsError } = await supabase
        .from("nomina_detalles")
        .select("*")
        .eq("nomina_id", nomina.id)
        .order("nombre", { ascending: true });

      if (detailsError) {
        console.error("Error cargando detalles:", detailsError);
      } else {
        setDetalles(details || []);
      }
    } catch (err) {
      console.error("Error global en fetchNomina:", err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchNomina();
  }, [mesSeleccionado, anioSeleccionado, activeTab]);

  const inicializarNomina = async () => {
    if (!["owner", "contador"].includes(userRole)) {
      alert("No tienes permisos para inicializar periodos de nómina.");
      return;
    }

    if (!window.confirm(`¿Seguro que deseas inicializar la nómina de ${meses[mesSeleccionado]} ${anioSeleccionado} para ${activeTab === "profesor" ? "Profesores" : "Asesores"}?`)) {
      return;
    }

    setCargando(true);
    try {
      // 1. Obtener la lista de personal activo según la pestaña activa
      let personalActivo = [];
      if (activeTab === "profesor") {
        const { data: profesores, error: profError } = await supabase
          .from("profesores")
          .select("*");

        if (profError) throw profError;
        personalActivo = (profesores || [])
          .map(p => ({
            id: String(p.id),
            auth_uid: p.data?.auth_uid || null,
            nombre: p.data?.nombre || "Sin nombre",
            salario: Number(p.data?.salario) || 0,
            estado: p.data?.estado || "activo"
          }))
          .filter(p => p.estado === "activo");
      } else {
        const { data: asesores, error: asesError } = await supabase
          .from("asesores")
          .select("*")
          .eq("estado", "activo");

        if (asesError) throw asesError;
        personalActivo = (asesores || []).map(a => ({
          id: String(a.id),
          auth_uid: a.auth_uid || null,
          nombre: a.nombre || "Sin nombre",
          salario: Number(a.salario_base) || 0,
          estado: a.estado
        }));
      }

      if (personalActivo.length === 0) {
        alert(`No hay ${activeTab === "profesor" ? "profesores" : "asesores"} activos en el sistema para inicializar.`);
        setCargando(false);
        return;
      }

      // Buscar si faltan auth_uids en profesores cruzando con tabla usuarios
      if (activeTab === "profesor") {
        const { data: usuarios } = await supabase
          .from("usuarios")
          .select("email, auth_uid")
          .eq("role", "profesor");
        
        const mapEmailUid = {};
        (usuarios || []).forEach(u => {
          if (u.email && u.auth_uid) mapEmailUid[u.email.toLowerCase()] = u.auth_uid;
        });

        // Completar
        personalActivo.forEach(p => {
          if (!p.auth_uid) {
            const normalizedEmail = `${p.nombre.toLowerCase().replace(/[^a-z0-9]/g, "")}@caribbeanacademy.com`;
            if (mapEmailUid[normalizedEmail]) {
              p.auth_uid = mapEmailUid[normalizedEmail];
            }
          }
        });
      }

      // 2. Crear cabecera de la nómina
      const totalDevengadoCalculado = personalActivo.reduce((acc, curr) => acc + curr.salario, 0);

      const { data: nuevaNomina, error: insertError } = await supabase
        .from("nominas")
        .insert([
          {
            periodo: periodoActual,
            tipo: activeTab,
            estado: "abierto",
            total_devengado: totalDevengadoCalculado,
            total_pagado: 0.00
          }
        ])
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // 3. Crear detalles individuales
      const insertsDetalles = personalActivo.map(p => ({
        nomina_id: nuevaNomina.id,
        usuario_id: p.id,
        usuario_auth_uid: p.auth_uid,
        nombre: p.nombre,
        salario_base: p.salario,
        comisiones: 0.00,
        total_neto: p.salario,
        total_pagado: 0.00,
        estado: "pendiente"
      }));

      const { error: errorDetalles } = await supabase
        .from("nomina_detalles")
        .insert(insertsDetalles);

      if (errorDetalles) throw errorDetalles;

      await registrarAuditoria("crear", "nominas", nuevaNomina.id, {
        periodo: periodoActual,
        tipo: activeTab,
        total_personal: personalActivo.length,
        total_devengado: totalDevengadoCalculado
      }, usuarioActual);

      alert("Nómina del periodo inicializada con éxito.");
      fetchNomina();
    } catch (err) {
      console.error("Error al inicializar nómina:", err);
      alert("Error al inicializar: " + (err.message || err.error_description));
    } finally {
      setCargando(false);
    }
  };

  const abrirAbonarModal = (det) => {
    setDetalleParaAbonar(det);
    setMontoAbonar(String(det.total_neto - det.total_pagado));
    setMetodoPago("transferencia");
    setReferenciaPago("");
    setMostrarAbonarModal(true);
  };

  const guardarAbono = async (e) => {
    e.preventDefault();
    if (!detalleParaAbonar || !montoAbonar || guardandoAbono) return;

    const monto = Number(montoAbonar);
    const pendiente = detalleParaAbonar.total_neto - detalleParaAbonar.total_pagado;

    if (monto <= 0) {
      alert("El monto debe ser mayor a cero.");
      return;
    }

    if (monto > pendiente) {
      alert(`El monto no puede exceder el saldo restante por pagar ($${formatearMoneda(pendiente)}).`);
      return;
    }

    setGuardandoAbono(true);

    try {
      // 1. Insertar abono
      const { data: abonoInsertado, error: abonoError } = await supabase
        .from("nomina_abonos")
        .insert([
          {
            nomina_detalle_id: detalleParaAbonar.id,
            monto: monto,
            metodo_pago: metodoPago,
            referencia: referenciaPago || null,
            registrado_por: usuarioActual?.id || null,
            registrado_por_nombre: usuarioActual?.nombre || usuarioActual?.email || "Administrador"
          }
        ])
        .select()
        .single();

      if (abonoError) throw abonoError;

      // 2. Actualizar detalle de nómina
      const nuevoPagadoDetalle = Number(detalleParaAbonar.total_pagado) + monto;
      let nuevoEstadoDetalle = "parcial";
      if (nuevoPagadoDetalle >= Number(detalleParaAbonar.total_neto)) {
        nuevoEstadoDetalle = "pagado";
      }

      const { error: updateDetError } = await supabase
        .from("nomina_detalles")
        .update({
          total_pagado: nuevoPagadoDetalle,
          estado: nuevoEstadoDetalle
        })
        .eq("id", detalleParaAbonar.id);

      if (updateDetError) throw updateDetError;

      // 3. Actualizar cabecera de nómina
      const nuevoPagadoNomina = Number(nominaGeneral.total_pagado) + monto;
      const { error: updateNomError } = await supabase
        .from("nominas")
        .update({
          total_pagado: nuevoPagadoNomina
        })
        .eq("id", nominaGeneral.id);

      if (updateNomError) throw updateNomError;

      // 4. Registrar Egreso (Sincronía Contable)
      const { error: egresoError } = await supabase
        .from("egresos")
        .insert([
          {
            tipo: "gasto",
            categoria: "nomina",
            descripcion: `Pago de nómina (${activeTab === "profesor" ? "Profesor" : "Asesor"}) a ${detalleParaAbonar.nombre} - Periodo ${periodoActual} (Abono ID: ${abonoInsertado.id})`,
            monto: monto,
            metodo: metodoPago,
            fecha: new Date().toISOString()
          }
        ]);

      if (egresoError) {
        console.error("Error registrando egreso automático:", egresoError);
      }

      // 5. Auditoría
      await registrarAuditoria("crear", "nomina_abonos", abonoInsertado.id, {
        periodo: periodoActual,
        tipo_personal: activeTab,
        beneficiario: detalleParaAbonar.nombre,
        monto_abonado: monto,
        metodo_pago: metodoPago,
        referencia: referenciaPago
      }, usuarioActual);

      alert("Pago registrado con éxito.");
      setMostrarAbonarModal(false);
      setDetalleParaAbonar(null);
      fetchNomina();
    } catch (err) {
      console.error("Error guardando abono:", err);
      alert("Error al registrar el pago: " + err.message);
    } finally {
      setGuardandoAbono(false);
    }
  };

  const eliminarAbono = async (abono) => {
    if (!["owner", "contador"].includes(userRole)) {
      alert("No tienes permisos para eliminar abonos de nómina.");
      return;
    }

    if (!window.confirm(`¿Seguro que deseas anular este abono de ${formatearMoneda(abono.monto)}? Esta acción es irreversible y actualizará la contabilidad.`)) {
      return;
    }

    try {
      const { data: detalle, error: detError } = await supabase
        .from("nomina_detalles")
        .select("*")
        .eq("id", abono.nomina_detalle_id)
        .single();
      
      if (detError) throw detError;

      const nuevoPagadoDetalle = Math.max(0, Number(detalle.total_pagado) - Number(abono.monto));
      let nuevoEstadoDetalle = "pendiente";
      if (nuevoPagadoDetalle > 0) {
        if (nuevoPagadoDetalle >= Number(detalle.total_neto)) {
          nuevoEstadoDetalle = "pagado";
        } else {
          nuevoEstadoDetalle = "parcial";
        }
      }

      const { error: delAbonoError } = await supabase
        .from("nomina_abonos")
        .delete()
        .eq("id", abono.id);

      if (delAbonoError) throw delAbonoError;

      const { error: updateDetError } = await supabase
        .from("nomina_detalles")
        .update({
          total_pagado: nuevoPagadoDetalle,
          estado: nuevoEstadoDetalle
        })
        .eq("id", detalle.id);

      if (updateDetError) throw updateDetError;

      const nuevoPagadoNomina = Math.max(0, Number(nominaGeneral.total_pagado) - Number(abono.monto));
      const { error: updateNomError } = await supabase
        .from("nominas")
        .update({ total_pagado: nuevoPagadoNomina })
        .eq("id", nominaGeneral.id);

      if (updateNomError) throw updateNomError;

      const { error: egresoError } = await supabase
        .from("egresos")
        .delete()
        .like("descripcion", `%Abono ID: ${abono.id}%`);

      if (egresoError) {
        console.error("Error eliminando egreso contable:", egresoError);
      }

      await registrarAuditoria("eliminar", "nomina_abonos", abono.id, {
        periodo: periodoActual,
        tipo_personal: activeTab,
        beneficiario: detalle.nombre,
        monto_eliminado: abono.monto
      }, usuarioActual);

      alert("Abono anulado con éxito.");
      
      const nuevosAbonos = abonosHistorial.filter(a => a.id !== abono.id);
      setAbonosHistorial(nuevosAbonos);
      setDetalleParaAbonos({
        ...detalleParaAbonos,
        total_pagado: nuevoPagadoDetalle,
        estado: nuevoEstadoDetalle
      });
      fetchNomina();
    } catch (err) {
      console.error("Error eliminando abono:", err);
      alert("Error al eliminar el abono: " + err.message);
    }
  };

  const abrirEditarAbono = (abono) => {
    setAbonoAEditar(abono);
    setMontoEditar(String(abono.monto));
    setMetodoPagoEditar(abono.metodo_pago);
    setReferenciaEditar(abono.referencia || "");
    setMostrarEditarAbonoModal(true);
  };

  const guardarEdicionAbono = async (e) => {
    e.preventDefault();
    if (!abonoAEditar || !montoEditar || guardandoEdicionAbono) return;

    const montoNuevo = Number(montoEditar);
    const montoViejo = Number(abonoAEditar.monto);
    const delta = montoNuevo - montoViejo;

    if (montoNuevo <= 0) {
      alert("El monto debe ser mayor a cero.");
      return;
    }

    setGuardandoEdicionAbono(true);

    try {
      const { data: detalle, error: detError } = await supabase
        .from("nomina_detalles")
        .select("*")
        .eq("id", abonoAEditar.nomina_detalle_id)
        .single();
      
      if (detError) throw detError;

      const pendienteSinEsteAbono = Number(detalle.total_neto) - (Number(detalle.total_pagado) - montoViejo);

      if (montoNuevo > pendienteSinEsteAbono) {
        alert(`El monto no puede exceder el saldo restante por pagar ($${formatearMoneda(pendienteSinEsteAbono)}).`);
        setGuardandoEdicionAbono(false);
        return;
      }

      const { error: updateAbonoError } = await supabase
        .from("nomina_abonos")
        .update({
          monto: montoNuevo,
          metodo_pago: metodoPagoEditar,
          referencia: referenciaEditar || null,
          registrado_por: usuarioActual?.id || null,
          registrado_por_nombre: usuarioActual?.nombre || usuarioActual?.email || "Administrador"
        })
        .eq("id", abonoAEditar.id);

      if (updateAbonoError) throw updateAbonoError;

      const nuevoPagadoDetalle = Number(detalle.total_pagado) + delta;
      let nuevoEstadoDetalle = "pendiente";
      if (nuevoPagadoDetalle > 0) {
        if (nuevoPagadoDetalle >= Number(detalle.total_neto)) {
          nuevoEstadoDetalle = "pagado";
        } else {
          nuevoEstadoDetalle = "parcial";
        }
      }

      const { error: updateDetError } = await supabase
        .from("nomina_detalles")
        .update({
          total_pagado: nuevoPagadoDetalle,
          estado: nuevoEstadoDetalle
        })
        .eq("id", detalle.id);

      if (updateDetError) throw updateDetError;

      const nuevoPagadoNomina = Number(nominaGeneral.total_pagado) + delta;
      const { error: updateNomError } = await supabase
        .from("nominas")
        .update({ total_pagado: nuevoPagadoNomina })
        .eq("id", nominaGeneral.id);

      if (updateNomError) throw updateNomError;

      const { data: egresosExistentes, error: queryEgresoError } = await supabase
        .from("egresos")
        .select("*")
        .like("descripcion", `%Abono ID: ${abonoAEditar.id}%`);

      if (!queryEgresoError && egresosExistentes && egresosExistentes.length > 0) {
        await supabase
          .from("egresos")
          .update({
            monto: montoNuevo,
            metodo: metodoPagoEditar,
            descripcion: `Pago de nómina (${activeTab === "profesor" ? "Profesor" : "Asesor"}) a ${detalle.nombre} - Periodo ${periodoActual} (Abono ID: ${abonoAEditar.id})`
          })
          .eq("id", egresosExistentes[0].id);
      } else {
        await supabase
          .from("egresos")
          .insert([{
            tipo: "gasto",
            categoria: "nomina",
            descripcion: `Pago de nómina (${activeTab === "profesor" ? "Profesor" : "Asesor"}) a ${detalle.nombre} - Periodo ${periodoActual} (Abono ID: ${abonoAEditar.id})`,
            monto: montoNuevo,
            metodo: metodoPagoEditar,
            fecha: new Date().toISOString()
          }]);
      }

      await registrarAuditoria("editar", "nomina_abonos", abonoAEditar.id, {
        periodo: periodoActual,
        tipo_personal: activeTab,
        beneficiario: detalle.nombre,
        monto_anterior: montoViejo,
        monto_nuevo: montoNuevo
      }, usuarioActual);

      alert("Pago actualizado con éxito.");
      setMostrarEditarAbonoModal(false);
      setAbonoAEditar(null);
      
      const { data: abonosActualizados } = await supabase
        .from("nomina_abonos")
        .select("*")
        .eq("nomina_detalle_id", detalle.id)
        .order("fecha_pago", { ascending: false });

      setAbonosHistorial(abonosActualizados || []);
      setDetalleParaAbonos({
        ...detalleParaAbonos,
        total_pagado: nuevoPagadoDetalle,
        estado: nuevoEstadoDetalle
      });

      fetchNomina();
    } catch (err) {
      console.error("Error editando abono:", err);
      alert("Error al actualizar el abono: " + err.message);
    } finally {
      setGuardandoEdicionAbono(false);
    }
  };

  const abrirAbonosHistorialModal = async (det) => {
    setDetalleParaAbonos(det);
    setMostrarAbonosModal(true);
    setCargandoAbonos(true);
    setAbonosHistorial([]);

    try {
      const { data, error } = await supabase
        .from("nomina_abonos")
        .select("*")
        .eq("nomina_detalle_id", det.id)
        .order("fecha_pago", { ascending: false });

      if (error) throw error;
      setAbonosHistorial(data || []);
    } catch (err) {
      console.error("Error cargando abonos:", err);
      alert("Error al cargar historial de pagos");
    } finally {
      setCargandoAbonos(false);
    }
  };

  const formatearMoneda = (val) => {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0
    }).format(Number(val) || 0);
  };

  const totalDevengado = nominasResumen("total_devengado");
  const totalPagado = nominasResumen("total_pagado");
  const totalRestante = totalDevengado - totalPagado;

  function nominasResumen(field) {
    if (!nominaGeneral) return 0;
    return Number(nominaGeneral[field]) || 0;
  }

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main nomina-page">
        <section className="nomina-header">
          <div>
            <h1>Control de Nómina</h1>
            <p className="nomina-subtitle">
              Calcula y gestiona los pagos, sueldos base y comisiones de tu equipo académico y asesores.
            </p>
          </div>

          <div className="nomina-periodo-selector">
            <select
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(Number(e.target.value))}
            >
              {meses.map((m, idx) => (
                <option key={m} value={idx}>{m}</option>
              ))}
            </select>
            <select
              value={anioSeleccionado}
              onChange={(e) => setAnioSeleccionado(Number(e.target.value))}
            >
              {anios.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </section>

        {/* PESTAÑAS */}
        <div className="nomina-tabs">
          <button
            className={`tab-btn ${activeTab === "profesor" ? "active" : ""}`}
            onClick={() => setActiveTab("profesor")}
          >
            👨‍🏫 Nómina Profesores
          </button>
          <button
            className={`tab-btn ${activeTab === "asesor" ? "active" : ""}`}
            onClick={() => setActiveTab("asesor")}
          >
            💼 Nómina Asesores
          </button>
        </div>

        {cargando ? (
          <div className="nomina-loading">Cargando datos de nómina...</div>
        ) : !nominaGeneral ? (
          <div className="nomina-vacia">
            <p>La nómina para el periodo {meses[mesSeleccionado]} {anioSeleccionado} de {activeTab === "profesor" ? "Profesores" : "Asesores"} no ha sido inicializada.</p>
            {["owner", "contador"].includes(userRole) && (
              <button className="btn-inicializar" onClick={inicializarNomina}>
                ⚡ Inicializar Nómina del Periodo
              </button>
            )}
          </div>
        ) : (
          <>
            {/* KPI METRICS */}
            <section className="nomina-kpis">
              <div className="nomina-kpi-card">
                <h3>Total Nómina</h3>
                <p>{formatearMoneda(totalDevengado)}</p>
              </div>
              <div className="nomina-kpi-card kpi-pagado">
                <h3>Total Pagado</h3>
                <p>{formatearMoneda(totalPagado)}</p>
              </div>
              <div className="nomina-kpi-card kpi-restante">
                <h3>Restante por Pagar</h3>
                <p>{formatearMoneda(totalRestante)}</p>
              </div>
            </section>

            {/* TABLA DETALLES */}
            <div className="tabla-container">
              <div className="tabla-header-info">
                <h2>Planilla de Liquidación ({meses[mesSeleccionado]} {anioSeleccionado})</h2>
                <span className={`nomina-estado-badge ${nominaGeneral.estado}`}>
                  {nominaGeneral.estado?.toUpperCase()}
                </span>
              </div>

              <table className="tabla-nomina">
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>ID Ref</th>
                    <th>Sueldo Base</th>
                    <th>Comisiones</th>
                    <th>Total Neto</th>
                    <th>Liquidado (Progreso)</th>
                    <th>Restante</th>
                    <th>Estado</th>
                    <th>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {detalles.map((det) => {
                    const progreso = det.total_neto > 0 ? (det.total_pagado / det.total_neto) * 100 : 0;
                    const restante = det.total_neto - det.total_pagado;

                    return (
                      <tr key={det.id}>
                        <td><strong>{det.nombre}</strong></td>
                        <td className="mono-text">{det.usuario_id}</td>
                        <td className="mono-text">{formatearMoneda(det.salario_base)}</td>
                        <td className="mono-text">{formatearMoneda(det.comisiones)}</td>
                        <td className="mono-text font-bold">{formatearMoneda(det.total_neto)}</td>
                        <td>
                          <div className="progreso-wrapper">
                            <div className="progreso-bar-bg">
                              <div
                                className="progreso-bar-fill"
                                style={{ width: `${Math.min(progreso, 100)}%` }}
                              />
                            </div>
                            <span className="progreso-text">
                              {formatearMoneda(det.total_pagado)} ({Math.round(progreso)}%)
                            </span>
                          </div>
                        </td>
                        <td className="mono-text text-soft">{formatearMoneda(restante)}</td>
                        <td>
                          <span className={`estado-liquidación ${det.estado}`}>
                            {det.estado?.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div className="acciones-nomina">
                            {det.estado !== "pagado" && nominaGeneral.estado === "abierto" && (
                              <button
                                className="btn-nomina-abonar"
                                onClick={() => abrirAbonarModal(det)}
                              >
                                💵 Abonar
                              </button>
                            )}
                            <button
                              className="btn-nomina-ver"
                              onClick={() => abrirAbonosHistorialModal(det)}
                            >
                              👁 Pagos
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </main>

      {/* MODAL REGISTRAR ABONO */}
      {mostrarAbonarModal && detalleParaAbonar && (
        <div className="profe-modal-overlay" onClick={() => setMostrarAbonarModal(false)}>
          <div className="profe-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="profe-modal-header">
              <h2>Registrar Abono</h2>
              <button className="profe-modal-close" onClick={() => setMostrarAbonarModal(false)}>×</button>
            </div>
            <form onSubmit={guardarAbono}>
              <div className="profe-modal-body">
                <p style={{ margin: 0, color: "#94a3b8", fontSize: "14px" }}>
                  Registrando pago de nómina para <strong>{detalleParaAbonar.nombre}</strong>.
                </p>

                <div className="abono-info-valores">
                  <div>
                    <span>Total Neto:</span>
                    <strong>{formatearMoneda(detalleParaAbonar.total_neto)}</strong>
                  </div>
                  <div>
                    <span>Pagado actual:</span>
                    <strong style={{ color: "#39ff14" }}>{formatearMoneda(detalleParaAbonar.total_pagado)}</strong>
                  </div>
                  <div>
                    <span>Pendiente:</span>
                    <strong style={{ color: "#ff3c3c" }}>{formatearMoneda(detalleParaAbonar.total_neto - detalleParaAbonar.total_pagado)}</strong>
                  </div>
                </div>

                <div className="profe-modal-grid">
                  <div className="profe-modal-item" style={{ gridColumn: "span 2" }}>
                    <span className="profe-item-label">Monto a Pagar (COP)</span>
                    <input
                      type="number"
                      required
                      placeholder="Ingrese el valor a abonar"
                      value={montoAbonar}
                      onChange={(e) => setMontoAbonar(e.target.value)}
                      className="input-monto-abono"
                    />
                  </div>
                  
                  <div className="profe-modal-item">
                    <span className="profe-item-label">Método de Pago</span>
                    <select
                      value={metodoPago}
                      onChange={(e) => setMetodoPago(e.target.value)}
                      required
                    >
                      <option value="transferencia">Transferencia bancaria</option>
                      <option value="nequi">Nequi</option>
                      <option value="daviplata">Daviplata</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>

                  <div className="profe-modal-item">
                    <span className="profe-item-label">Referencia / Comprobante</span>
                    <input
                      type="text"
                      placeholder="Ej. N° de transacción"
                      value={referenciaPago}
                      onChange={(e) => setReferenciaPago(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="profe-modal-footer">
                <button
                  type="button"
                  className="profe-btn-cerrar"
                  onClick={() => setMostrarAbonarModal(false)}
                  style={{ marginRight: "10px" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-principal"
                  disabled={guardandoAbono}
                  style={{ width: "auto", minWidth: "140px", marginTop: 0 }}
                >
                  {guardandoAbono ? "Guardando..." : "Confirmar Pago"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL HISTORIAL DE ABONOS */}
      {mostrarAbonosModal && detalleParaAbonos && (
        <div className="profe-modal-overlay" onClick={() => setMostrarAbonosModal(false)}>
          <div className="profe-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "640px" }}>
            <div className="profe-modal-header">
              <h2>Historial de Abonos - {detalleParaAbonos.nombre}</h2>
              <button className="profe-modal-close" onClick={() => setMostrarAbonosModal(false)}>×</button>
            </div>
            <div className="profe-modal-body">
              <div className="abonos-resumen-cabecera">
                <div>
                  <span>Total Neto:</span>
                  <strong>{formatearMoneda(detalleParaAbonos.total_neto)}</strong>
                </div>
                <div>
                  <span>Total Liquidado:</span>
                  <strong style={{ color: "#39ff14" }}>{formatearMoneda(detalleParaAbonos.total_pagado)}</strong>
                </div>
                <div>
                  <span>Restante:</span>
                  <strong style={{ color: "#ff8c00" }}>{formatearMoneda(detalleParaAbonos.total_neto - detalleParaAbonos.total_pagado)}</strong>
                </div>
              </div>

              <div className="abonos-lista">
                {cargandoAbonos ? (
                  <div className="abonos-loading">Cargando abonos realizados...</div>
                ) : abonosHistorial.length === 0 ? (
                  <div className="abonos-vacio">No se han registrado abonos en este periodo.</div>
                ) : (
                  <table className="tabla-abonos-historial">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Monto</th>
                        <th>Método</th>
                        <th>Referencia</th>
                        <th>Registrado Por</th>
                        {nominaGeneral?.estado === "abierto" && <th>Acciones</th>}
                      </tr>
                    </thead>
                    <tbody>
                      {abonosHistorial.map((abono) => (
                        <tr key={abono.id}>
                          <td>{new Date(abono.fecha_pago).toLocaleDateString()}</td>
                          <td className="mono-text font-bold" style={{ color: "#39ff14" }}>
                            {formatearMoneda(abono.monto)}
                          </td>
                          <td style={{ textTransform: "capitalize" }}>{abono.metodo_pago}</td>
                          <td className="mono-text">{abono.referencia || "-"}</td>
                          <td>{abono.registrado_por_nombre || "Admin"}</td>
                          {nominaGeneral?.estado === "abierto" && (
                            <td>
                              <div className="acciones-nomina" style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                                <button 
                                  className="btn-nomina-abonar" 
                                  style={{ padding: "4px 8px", fontSize: "12px", minWidth: "auto" }}
                                  onClick={() => abrirEditarAbono(abono)}
                                >
                                  ✏️ Editar
                                </button>
                                <button 
                                  className="btn-nomina-ver" 
                                  style={{ padding: "4px 8px", fontSize: "12px", background: "rgba(255, 60, 60, 0.1)", color: "#ff3c3c", border: "1px solid rgba(255, 60, 60, 0.3)", minWidth: "auto" }}
                                  onClick={() => eliminarAbono(abono)}
                                >
                                  🗑️ Anular
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
            <div className="profe-modal-footer">
              <button
                type="button"
                className="profe-btn-cerrar"
                onClick={() => setMostrarAbonosModal(false)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL EDITAR ABONO */}
      {mostrarEditarAbonoModal && abonoAEditar && (
        <div className="profe-modal-overlay" onClick={() => setMostrarEditarAbonoModal(false)}>
          <div className="profe-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="profe-modal-header">
              <h2>Editar Abono</h2>
              <button className="profe-modal-close" onClick={() => setMostrarEditarAbonoModal(false)}>×</button>
            </div>
            <form onSubmit={guardarEdicionAbono}>
              <div className="profe-modal-body">
                <p style={{ margin: "0 0 15px 0", color: "#94a3b8", fontSize: "14px" }}>
                  Editando abono del {new Date(abonoAEditar.fecha_pago).toLocaleDateString()}
                </p>

                <div className="profe-modal-grid">
                  <div className="profe-modal-item" style={{ gridColumn: "span 2" }}>
                    <span className="profe-item-label">Monto (COP)</span>
                    <input
                      type="number"
                      required
                      placeholder="Ingrese el nuevo monto"
                      value={montoEditar}
                      onChange={(e) => setMontoEditar(e.target.value)}
                      className="input-monto-abono"
                    />
                  </div>
                  
                  <div className="profe-modal-item">
                    <span className="profe-item-label">Método de Pago</span>
                    <select
                      value={metodoPagoEditar}
                      onChange={(e) => setMetodoPagoEditar(e.target.value)}
                      required
                    >
                      <option value="transferencia">Transferencia bancaria</option>
                      <option value="nequi">Nequi</option>
                      <option value="daviplata">Daviplata</option>
                      <option value="efectivo">Efectivo</option>
                      <option value="otro">Otro</option>
                    </select>
                  </div>

                  <div className="profe-modal-item">
                    <span className="profe-item-label">Referencia / Comprobante</span>
                    <input
                      type="text"
                      placeholder="Ej. N° de transacción"
                      value={referenciaEditar}
                      onChange={(e) => setReferenciaEditar(e.target.value)}
                    />
                  </div>
                </div>
              </div>
              <div className="profe-modal-footer">
                <button
                  type="button"
                  className="profe-btn-cerrar"
                  onClick={() => setMostrarEditarAbonoModal(false)}
                  style={{ marginRight: "10px" }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-principal"
                  disabled={guardandoEdicionAbono}
                  style={{ width: "auto", minWidth: "140px", marginTop: 0 }}
                >
                  {guardandoEdicionAbono ? "Guardando..." : "Guardar Cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
