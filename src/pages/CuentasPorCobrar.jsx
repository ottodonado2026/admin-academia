import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import "./CuentasPorCobrar.css";
import { supabase } from "../services/supabaseClient";

const STORAGE_PAGOS = "pagos";
const STORAGE_ALUMNOS = "alumnos";
const STORAGE_CUENTAS_MANUALES = "cuentasManuales";
const STORAGE_INGRESOS = "ingresos";

function CuentasPorCobrar() {
  const [pagos, setPagos] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [cuentasManuales, setCuentasManuales] = useState([]);

  const hoyISO = new Date().toISOString().split("T")[0];

  const [cliente, setCliente] = useState("");
  const [concepto, setConcepto] = useState("");
  const [monto, setMonto] = useState("");
  const [fechaRegistro, setFechaRegistro] = useState(hoyISO);
  const [modalidadManual, setModalidadManual] = useState("mensual");

  const [plazoManual, setPlazoManual] = useState(1);
const [cuentaManualSeleccionada, setCuentaManualSeleccionada] = useState(null);
const [montoAbono, setMontoAbono] = useState("");

const [voucherFile, setVoucherFile] = useState(null);
const [isUploading, setIsUploading] = useState(false);
const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);


const obtenerCuentasManuales = async () => {
  const { data, error } = await supabase
  .from("cuentas_manuales")
  .select(`
  *,
  abonos_cuentas_manuales:abonos_cuentas_manuales!abonos_cuentas_manuales_cuenta_id_fkey (
    id,
    monto,
    fecha
  )
`)
  .order("created_at", { ascending: false });

  if (error) {
    console.error("Error cargando cuentas manuales:", error);
    return;
  }

const cuentasAdaptadas = (data || []).map(c => ({
  ...c,
  pagos: (c.abonos_cuentas_manuales || []).map(a => ({
    id: a.id,
    monto: Number(a.monto),
    fecha: a.fecha
  }))
}));

setCuentasManuales(cuentasAdaptadas);

};

const subirVoucher = async () => {
  if (!voucherFile || !cuentaManualSeleccionada) return;
  setIsUploading(true);
  try {
    const fileName = `voucher_${cuentaManualSeleccionada.id}_${Date.now()}`;
    const { data, error } = await supabase.storage.from("vouchers").upload(fileName, voucherFile);
    if (error) {
      if (error.message.includes("Bucket not found")) {
        alert("El bucket 'vouchers' no existe en Supabase. Créalo público para poder subir archivos.");
      } else {
        throw error;
      }
    } else {
      alert("Comprobante subido correctamente");
      setVoucherFile(null);
    }
  } catch (error) {
    console.error("Error al subir voucher", error);
    alert("No se pudo subir el comprobante.");
  } finally {
    setIsUploading(false);
  }
};

const generarPdf = () => {
  setIsGeneratingPdf(true);
  setTimeout(() => {
    window.print();
    setIsGeneratingPdf(false);
  }, 500);
};

useEffect(() => {
  const fetchPagos = async () => {
    const { data, error } = await supabase
      .from("pagos")
      .select("*")
      .eq("eliminado", false);

    if (error) {
      console.error("Error cargando pagos:", error);
      setPagos([]);
      return;
    }


    const pagosConHistorial = await Promise.all(
      (data || []).map(async (p) => {
        const { data: historial, error: errorHistorial } = await supabase
          .from("historial_pagos")
          .select("*")
          .eq("pago_id", p.id)
          .eq("eliminado", false)
          .order("fecha_pago", { ascending: true });

        if (errorHistorial) {
          console.error("Error cargando historial:", errorHistorial);
        }

        const abonos = (historial || []).map((h) => ({
          id: h.id,
          monto: Number(h.monto || 0),
          fecha: h.fecha_pago || h.created_at,
          metodoPago: h.metodo_pago || "",
          referenciaPago: h.referencia_pago || "",
        }));

        const totalPagado = abonos.reduce(
          (acc, item) => acc + Number(item.monto || 0),
          0
        );

        return {
          ...p,
          alumnoId: p.alumno_id,
          alumnoDbId: p.alumno_db_id,
          fechaInicio: p.fecha_inicio,
          cuotaMensual: Number(p.cuota || 0),
          valorTotal: Number(p.valor_total || 0),
          montoPagado: totalPagado,
          saldoPendiente: Number(p.valor_total || 0) - totalPagado,
          modalidad: p.tipo_cuota || p.modalidad,
          tipoCuota: p.tipo_cuota || p.modalidad,
          plazo: Number(p.plazo || 0),
          pagos: abonos,
        };
      })
    );

    setPagos(pagosConHistorial);
  };

  fetchPagos();

  const interval = setInterval(fetchPagos, 5000);

  return () => clearInterval(interval);
}, []);

useEffect(() => {
  obtenerCuentasManuales();
}, []);

  const guardarPagos = (data) => {
    localStorage.setItem(STORAGE_PAGOS, JSON.stringify(data));
    setPagos(data);
  };

 const guardarCuentasManuales = (data) => {
  setCuentasManuales(data);
};

  const formatearMonto = (valor) =>
    `$${Number(valor || 0).toLocaleString("es-CO")}`;

 const formatearFecha = (fecha) => {
  if (!fecha) return "-";
  const date = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

  const normalizarTelefonoWhatsapp = (telefono = "") => {
    const soloNumeros = String(telefono).replace(/\D/g, "");

    if (!soloNumeros) return "";
    if (soloNumeros.startsWith("57")) return soloNumeros;
    if (soloNumeros.length === 10) return `57${soloNumeros}`;

    return soloNumeros;
  };

  const obtenerTelefonoAlumno = (cuenta) => {
    if (cuenta.telefono) return cuenta.telefono;

    const alumnoRelacionado = alumnos.find(
      (a) =>
        String(a.alumnoId) === String(cuenta.alumnoId) ||
        String(a.id) === String(cuenta.alumnoDbId) ||
        String(a.nombre).trim().toLowerCase() ===
          String(cuenta.cliente).trim().toLowerCase()
    );

    return alumnoRelacionado?.telefono || "";
  };

  const sumarDias = (fecha, dias) => {
    const nueva = new Date(fecha);
    nueva.setDate(nueva.getDate() + dias);
    return nueva;
  };

  const sumarMeses = (fecha, meses) => {
    const nueva = new Date(fecha);
    nueva.setMonth(nueva.getMonth() + meses);
    return nueva;
  };

  const obtenerIntervaloPago = (modalidad) => {
    if (modalidad === "semanal") return { tipo: "dias", valor: 7 };
    if (modalidad === "quincenal") return { tipo: "dias", valor: 15 };
    return { tipo: "meses", valor: 1 };
  };

  const obtenerFechaCuota = (fechaInicio, modalidad, numeroCuota) => {
    const base = new Date(fechaInicio);
    if (Number.isNaN(base.getTime())) return null;

    const intervalo = obtenerIntervaloPago(modalidad);

    if (intervalo.tipo === "dias") {
      return sumarDias(base, intervalo.valor * (numeroCuota - 1));
    }

    return sumarMeses(base, numeroCuota - 1);
  };

const calcularCuotasExigibles = (plan) => {
  if (!plan.fechaInicio || !plan.cuotaMensual) return 0;

  const fechaInicio = new Date(plan.fechaInicio);
  if (Number.isNaN(fechaInicio.getTime())) return 0;

  const hoy = new Date();

  // 🔥 unificar modalidad correctamente
  const tipo = plan.tipoCuota || plan.modalidad || "mensual";

  let contador = 0;
  let cursor = new Date(fechaInicio);

  while (cursor <= hoy && contador < 1000) {
    contador += 1;

    if (tipo === "semanal") {
      cursor.setDate(cursor.getDate() + 7);
    } else if (tipo === "quincenal") {
      cursor.setDate(cursor.getDate() + 15);
    } else {
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  return contador;
};

const calcularCuotaManual = (valor, modalidad, plazo = 1) => {
  const montoBase = Number(valor || 0);
  const meses = Number(plazo || 1);

  if (montoBase <= 0) return 0;

  let totalCuotas = meses;

  if (modalidad === "quincenal") totalCuotas = meses * 2;
  if (modalidad === "semanal") totalCuotas = meses * 4;

  return Math.round(montoBase / totalCuotas);
};

  const generarFechasPagoManual = (cuenta) => {
  const fechas = [];

  const fechaInicio = new Date(cuenta.fecha);
  const plazo = Number(cuenta.plazo || 1);
  const modalidad = cuenta.modalidad || "mensual";

  let cursor = new Date(fechaInicio);

  let totalCuotas = plazo;

if (modalidad === "quincenal") totalCuotas = plazo * 2;
if (modalidad === "semanal") totalCuotas = plazo * 4;

for (let i = 0; i < totalCuotas; i++) {
    fechas.push(new Date(cursor));

    if (modalidad === "semanal") {
      cursor.setDate(cursor.getDate() + 7);
    } else if (modalidad === "quincenal") {
      cursor.setDate(cursor.getDate() + 15);
    } else {
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  return fechas;
};

const calcularEstadoCuotas = (cuenta) => {
  const fechas = generarFechasPagoManual(cuenta);
  const cuota = calcularCuotaManual(
  cuenta.monto,
  cuenta.modalidad,
  cuenta.plazo
);

  let pagos = [...(cuenta.pagos || [])]
  .map(p => ({ ...p, monto: Number(p.monto) }))
  .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  let resultado = [];

let totalAsignado = 0;

for (let i = 0; i < fechas.length; i++) {
  let cuotaActual = cuota;

  // 🔥 AJUSTE EN LA ÚLTIMA CUOTA
  if (i === fechas.length - 1) {
    cuotaActual = Number(cuenta.monto) - totalAsignado;
  }

  let restanteCuota = cuotaActual;
  let pagado = 0;

  while (pagos.length > 0 && restanteCuota > 0) {
    let pago = pagos[0];

    if (pago.monto <= restanteCuota) {
      pagado += pago.monto;
      restanteCuota -= pago.monto;
      pagos.shift();
    } else {
      pagado += restanteCuota;
      pago.monto -= restanteCuota;
      restanteCuota = 0;
    }
  }

  totalAsignado += cuotaActual;

  resultado.push({
    fecha: fechas[i],
    pagado,
    cuota: cuotaActual,
    estado:
      pagado >= cuotaActual
        ? "Pagado"
        : pagado > 0
        ? "Parcial"
        : "Pendiente",
  });
}

  return resultado;
};

  const construirMensajeCobro = (cuenta) => {
    const montoTexto = formatearMonto(cuenta.montoExigible || cuenta.monto);
    const fechaTexto = cuenta.fechaPago ? formatearFecha(cuenta.fechaPago) : "-";
    const diasMoraTexto =
      cuenta.diasMora > 0
        ? `${cuenta.diasMora} día(s) en mora`
        : "pago pendiente";

    return `Hola ${cuenta.cliente}, esperamos que te encuentres muy bien.

Te escribimos de manera cordial para recordarte que registras una obligación de pago correspondiente a ${cuenta.concepto}.

Detalle del cobro:
• Valor de la cuota: ${montoTexto}
• Fecha de pago: ${fechaTexto}
• Estado: ${diasMoraTexto}

Agradecemos tu pronta gestión para mantener tu proceso al día. Si ya realizaste el pago, por favor compártenos el soporte para actualizar el registro.

Quedamos atentos.
Muchas gracias por tu atención.`;
  };

  const cobrarPorWhatsapp = (cuenta) => {
    const telefono = normalizarTelefonoWhatsapp(obtenerTelefonoAlumno(cuenta));

    if (!telefono) {
      alert(
        "Este cliente no tiene un número de WhatsApp registrado en la sesión de alumnos."
      );
      return;
    }

    const mensaje = construirMensajeCobro(cuenta);
    const url = `https://wa.me/${telefono}?text=${encodeURIComponent(mensaje)}`;

    window.open(url, "_blank", "noopener,noreferrer");
  };

  const cuentasAutomaticas = useMemo(() => {
    const hoy = new Date();

    return pagos
      .map((p) => {
        const totalPagado = (p.pagos || []).reduce(
          (acc, item) => acc + Number(item.monto || 0),
          0
        );

        const cuota = Number(p.cuotaMensual || 0);
        const valorTotal = Number(p.valorTotal || 0);
        const saldoPendiente = Math.max(0, valorTotal - totalPagado);

        if (!cuota || !p.fechaInicio || saldoPendiente <= 0) return null;

        const cuotasExigibles = calcularCuotasExigibles(p);
        const valorExigible = Math.min(valorTotal, cuotasExigibles * cuota);
        const valorVencido = Math.max(0, valorExigible - totalPagado);

        const cuotasPagadasCompletas = Math.floor(totalPagado / cuota);
        const numeroSiguienteCuota = cuotasPagadasCompletas + 1;
        const fechaPago = obtenerFechaCuota(
          p.fechaInicio,
          p.modalidad,
          numeroSiguienteCuota
        );

        let diasMora = 0;
        if (fechaPago && hoy > fechaPago && valorVencido > 0) {
          const diffMs = hoy.getTime() - fechaPago.getTime();
          diasMora = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        }

        let estadoCuenta = "Pendiente";
        if (valorVencido > 0 && diasMora > 0) estadoCuenta = "En mora";
        else if (valorVencido > 0) estadoCuenta = "Pendiente";
        else return null;

        return {
          id: `pago-${p.id}`,
          pagoId: p.id,
          source: "pago",
          cliente: p.alumno || "Sin nombre",
          alumnoId: p.alumnoId || "",
          alumnoDbId: p.alumnoDbId ?? "",
          concepto: p.cursoId || p.curso || "Sin concepto",
          telefono: obtenerTelefonoAlumno({
            alumnoId: p.alumnoId,
            alumnoDbId: p.alumnoDbId,
            cliente: p.alumno,
          }),
          estado: estadoCuenta,
          modalidad: p.modalidad || "-",
          totalCurso: valorTotal,
          valorCuota: cuota,
          montoExigible: Math.min(valorVencido || cuota, saldoPendiente),
          montoVencido: valorVencido,
          saldoPendiente,
          diasMora,
          fechaPago,
          plazo: p.plazo || 0,
          monto: Math.min(valorVencido || cuota, saldoPendiente),
        };
      })
      .filter(Boolean);
  }, [pagos, alumnos]);

  const cuentas = useMemo(() => {
    const manualesNormalizadas = cuentasManuales.map((c) => {
 const cuotaManual = calcularCuotaManual(c.monto, c.modalidad, c.plazo);

  const pagos = c.pagos || [];

  const totalPagado = pagos.reduce(
    (acc, p) => acc + Number(p.monto || 0),
    0
  );

  const saldoPendiente = Number(c.monto || 0) - totalPagado;

  const cuotas = calcularEstadoCuotas(c);

  const hoy = new Date();
hoy.setHours(0, 0, 0, 0);

const hayMora = cuotas.some((cuota) => {
  const fechaCuota = new Date(cuota.fecha);
  fechaCuota.setHours(0, 0, 0, 0);

  return fechaCuota < hoy && cuota.estado !== "Pagado";
});

  let estadoCalculado = "Pendiente";

  if (saldoPendiente <= 0) {
    estadoCalculado = "Pagado";
  } else if (hayMora) {
    estadoCalculado = "En mora";
  } else if (totalPagado > 0) {
    estadoCalculado = "Al día";
  }

  return {
    ...c,
    source: "manual",
    totalCurso: null,
    valorCuota: cuotaManual,
    montoExigible: Math.max(saldoPendiente, 0),
montoVencido: Math.max(saldoPendiente, 0),
    saldoPendiente,
    diasMora: hayMora ? 1 : 0, // opcional luego lo mejoramos
    fechaPago: c.fecha || null,
    modalidad: c.modalidad || "mensual",
    monto: Number(c.monto || 0),

    // 🔥 ESTE ES EL CAMBIO CLAVE
    estado: estadoCalculado,
  };
});

    return [...cuentasAutomaticas, ...manualesNormalizadas];
  }, [cuentasAutomaticas, cuentasManuales]);

  const limpiarFormulario = () => {
    setCliente("");
    setConcepto("");
    setMonto("");
    setFechaRegistro(hoyISO);
    setModalidadManual("mensual");
  };

 const agregarCuenta = async () => {
  if (!cliente || !concepto || !monto || !fechaRegistro) return;

  const { error } = await supabase.from("cuentas_manuales").insert([
  {
    cliente: cliente.trim(),
    concepto: concepto.trim(),
    monto: Number(monto),
    fecha: new Date(`${fechaRegistro}T00:00:00`).toISOString(),
    estado: "Pendiente",
    telefono: "",
    modalidad: modalidadManual,
    plazo: Number(plazoManual || 1),
  },
]);

  if (error) {
    console.error("Error guardando cuenta manual:", error);
    return;
  }

  // limpiar formulario
  setCliente("");
  setConcepto("");
  setMonto("");
  setFechaRegistro("");
  setModalidadManual("mensual");
  setPlazoManual(1);

  // 🔥 recargar desde supabase (IMPORTANTE)
  obtenerCuentasManuales();
};

  const registrarIngreso = (cuenta, montoPagado) => {
    const ingresos = JSON.parse(localStorage.getItem(STORAGE_INGRESOS) || "[]");

    const nuevoIngreso = {
      id: Date.now(),
      tipo: "Cuenta por cobrar",
      categoria: "Cobro",
      descripcion: cuenta.concepto,
      monto: montoPagado,
      metodo: "Pendiente",
      fecha: new Date().toISOString(),
    };

    localStorage.setItem(
      STORAGE_INGRESOS,
      JSON.stringify([nuevoIngreso, ...ingresos])
    );
  };

  const recalcularEstadoPlan = (planActualizado) => {
    const totalPagado = (planActualizado.pagos || []).reduce(
      (acc, item) => acc + Number(item.monto || 0),
      0
    );

    if (totalPagado >= Number(planActualizado.valorTotal || 0)) {
      return "Pagado";
    }

    const cuotasExigibles = calcularCuotasExigibles(planActualizado);
    const valorExigible = Math.min(
      Number(planActualizado.valorTotal || 0),
      cuotasExigibles * Number(planActualizado.cuotaMensual || 0)
    );

    if (totalPagado >= valorExigible) {
      return "Al día";
    }

    if (totalPagado <= 0) {
      return "Pendiente";
    }

    return "En mora";
  };

  const marcarPagado = async (cuenta) => {
    const montoAPagar = Number(cuenta.montoExigible || cuenta.monto || 0);

    if (montoAPagar <= 0) {
      alert("No hay un valor pendiente para registrar.");
      return;
    }

    registrarIngreso(cuenta, montoAPagar);

    if (cuenta.source === "pago") {
      const pagosActualizados = pagos.map((p) => {
        if (p.id !== cuenta.pagoId) return p;

        const nuevosPagos = [
          ...(p.pagos || []),
          {
            monto: montoAPagar,
            fecha: new Date().toISOString(),
            metodoPago: "Cuenta por cobrar",
            referenciaPago: `CC-${Date.now()}`,
          },
        ];

        const totalPagado = nuevosPagos.reduce(
          (acc, item) => acc + Number(item.monto || 0),
          0
        );

        const saldoPendiente = Math.max(
          0,
          Number(p.valorTotal || 0) - totalPagado
        );

        const planActualizado = {
          ...p,
          pagos: nuevosPagos,
          montoPagado: totalPagado,
          saldoPendiente,
        };

        return {
          ...planActualizado,
          estado: recalcularEstadoPlan(planActualizado),
        };
      });

    // 🔥 GUARDAR EN SUPABASE (REAL)
await supabase
  .from("pagos")
  .update({
    pagos: pagosActualizados.find(p => p.id === cuenta.pagoId)?.pagos,
    updated_at: new Date().toISOString(),
  })
  .eq("id", cuenta.pagoId);

// 🔥 RECARGAR DESDE SUPABASE
const { data } = await supabase.from("pagos").select("*");

const adaptados = (data || []).map((p) => ({
  ...p,
  alumnoId: p.alumno_id,
  alumnoDbId: p.alumno_db_id,
  fechaInicio: p.fecha_inicio,
  cuotaMensual: p.cuota,
  valorTotal: p.valor_total,
}));

setPagos(adaptados);
return;
    }

    const actualizadas = cuentasManuales.map((c) =>
      c.id === cuenta.id
        ? {
            ...c,
            estado: "Pagado",
          }
        : c
    );

    guardarCuentasManuales(actualizadas);
  };

const registrarAbonoManual = async (cuenta, montoAbono) => {
  if (!montoAbono || Number(montoAbono) <= 0) return;

  const montoNumero = Number(montoAbono);

  const pagosActuales = cuenta.pagos || [];

  const totalPagadoActual = pagosActuales.reduce(
    (acc, p) => acc + Number(p.monto || 0),
    0
  );

  const saldoPendiente = Number(cuenta.monto) - totalPagadoActual;

  if (montoNumero > saldoPendiente) {
    alert(
      `No puedes pagar más de lo que debes.\nSaldo pendiente: ${formatearMonto(saldoPendiente)}`
    );
    return;
  }

  const { error } = await supabase
    .from("abonos_cuentas_manuales")
    .insert([
  {
    cuenta_id: cuenta.id,
    monto: montoNumero,
    fecha: new Date().toISOString(),
  },
]);

  if (error) {
    console.error("Error guardando abono:", error);
    return;
  }

  await obtenerCuentasManuales();

  const { data } = await supabase
    .from("cuentas_manuales")
    .select(`
      *,
      abonos_cuentas_manuales (
        id,
        monto,
        fecha
      )
    `)
    .eq("id", cuenta.id)
    .single();

  if (data) {
    setCuentaManualSeleccionada({
      ...data,
      pagos: (data.abonos_cuentas_manuales || []).map(a => ({
        id: a.id,
        monto: Number(a.monto),
        fecha: a.fecha
      }))
    });
  }
};

 const eliminarCuenta = async (cuenta) => {
  if (cuenta.source === "pago") {
    alert("Esta cuenta viene de pagos.");
    return;
  }

  const { error } = await supabase
    .from("cuentas_manuales")
    .delete()
    .eq("id", cuenta.id);

  if (error) {
    console.error("Error eliminando:", error);
    return;
  }

  await obtenerCuentasManuales();
  setCuentaManualSeleccionada(null);
};

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main">
        <h1>Cuentas por cobrar</h1>

        <div className="form-ingresos">
          <input
            placeholder="Cliente"
            value={cliente}
            onChange={(e) => setCliente(e.target.value)}
          />

          <input
            placeholder="Concepto"
            value={concepto}
            onChange={(e) => setConcepto(e.target.value)}
          />

          <input
            placeholder="Monto"
            type="number"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
          />

          <input
            type="date"
            value={fechaRegistro}
            onChange={(e) => setFechaRegistro(e.target.value)}
            title="Fecha de registro"
          />

          <select
            value={modalidadManual}
            onChange={(e) => setModalidadManual(e.target.value)}
            title="Modalidad de pago"
          >
            <option value="semanal">Semanal</option>
            <option value="quincenal">Quincenal</option>
            <option value="mensual">Mensual</option>
          </select>

          <select
  value={plazoManual}
  onChange={(e) => setPlazoManual(e.target.value)}
  title="Plazo en meses"
>
  <option value={1}>1 mes</option>
  <option value={2}>2 meses</option>
  <option value={3}>3 meses</option>
  <option value={4}>4 meses</option>
  <option value={5}>5 meses</option>
  <option value={6}>6 meses</option>
  <option value={12}>12 meses</option>
</select>

          <button className="btn-agregar" onClick={agregarCuenta}>
            + Agregar cuenta
          </button>
        </div>

        <div className="tabla-wrapper">
          <table className="tabla-ingresos">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Concepto</th>
                <th>Total curso</th>
                <th>Cuota</th>
                <th>Fecha pago</th>
                <th>Días mora</th>
                <th>Modalidad</th>
                <th>Exigible</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {cuentas.map((c) => (
            <tr
  key={c.id}
  className={c.estado === "En mora" ? "en-mora" : ""}
>
                <td data-label="Cliente">{c.cliente}</td>

<td data-label="Concepto">{c.concepto}</td>

<td data-label="Total curso">
  {c.source === "manual" ? "-" : formatearMonto(c.totalCurso)}
</td>

<td data-label="Cuota">
  {formatearMonto(c.valorCuota)}
</td>

<td data-label="Fecha pago" className="col-fecha">
  {formatearFecha(c.fechaPago)}
</td>

<td data-label="Días mora" className="col-dias">
  {c.diasMora > 0 ? `${c.diasMora} días` : "-"}
</td>

<td data-label="Modalidad" className="col-modalidad">
  {c.modalidad || "-"}
</td>

<td data-label="Exigible" className="col-exigible">
  {formatearMonto(c.montoExigible || c.monto)}

  {c.source === "manual" && c.saldoPendiente > 0 && (
    <small style={{ display: "block", color: "#888" }}>
      Saldo total
    </small>
  )}

  {c.source === "pago" && c.montoVencido > 0 && (
    <small style={{ display: "block", color: "#ff4d4d" }}>
      En mora
    </small>
  )}
</td>

<td data-label="Estado" className="col-estado">
  {c.estado === "En mora" && (
    <span className="estado-badge estado-mora">🔴 En mora</span>
  )}
  {c.estado === "Pendiente" && (
    <span className="estado-badge estado-pendiente">🟡 Pendiente</span>
  )}
  {c.estado === "Al día" && (
    <span className="estado-badge estado-dia">🟢 Al día</span>
  )}
  {c.estado === "Pagado" && (
    <span className="estado-badge estado-dia">🟢 Pagado</span>
  )}
</td>

<td data-label="Acciones" className="acciones-cuenta">
  {c.source === "manual" && (
  <button
    className="btn-ver"
    onClick={() => {
      const cuentaOriginal = cuentasManuales.find(cm => cm.id === c.id);
      setCuentaManualSeleccionada(cuentaOriginal);
    }}
  >
    Ver
  </button>
)}

  {c.source !== "manual" &&
    (c.estado === "Pendiente" || c.estado === "En mora") && (
      <button className="btn-cobrar" onClick={() => cobrarPorWhatsapp(c)}>
        <span>💰</span> Cobrar
      </button>
    )}
</td>

                </tr>
              ))}

              {cuentas.length === 0 && (
                <tr>
                  <td colSpan="10">No hay cuentas por cobrar registradas.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>

{cuentaManualSeleccionada && (
  <div className="modal-overlay">
    <div
      className="modal-card-cc"
      onClick={(e) => e.stopPropagation()}
    >

      {/* HEADER */}
      <div className="modal-header-cc">
        <div>
          <h2>{cuentaManualSeleccionada.cliente}</h2>
          <p className="modal-subtitle">
            {cuentaManualSeleccionada.concepto}
          </p>
        </div>
      </div>

      {/* GRID */}
      <div className="modal-grid-cc">
        <div className="modal-item-cc">
          <span>Monto total</span>
          <strong>{formatearMonto(cuentaManualSeleccionada.monto)}</strong>
        </div>

        <div className="modal-item-cc">
          <span>Modalidad</span>
          <strong>{cuentaManualSeleccionada.modalidad}</strong>
        </div>

        <div className="modal-item-cc">
          <span>Plazo</span>
          <strong>{cuentaManualSeleccionada.plazo} mes(es)</strong>
        </div>

        <div className="modal-item-cc">
          <span>Cuota</span>
          <strong>
            {formatearMonto(
              calcularCuotaManual(
  cuentaManualSeleccionada.monto,
  cuentaManualSeleccionada.modalidad,
  cuentaManualSeleccionada.plazo
)
            )}
          </strong>
        </div>
      </div>

      {/* FECHAS */}
      <div className="modal-fechas-cc">
        <h4>Próximas fechas de pago</h4>

       
<div className="fechas-lista">
  {calcularEstadoCuotas(cuentaManualSeleccionada).map((item, i) => (
    <div key={i} className="fecha-item">

      <div className="fecha-info">
        <span>{formatearFecha(item.fecha)}</span>
      </div>

      <div className="fecha-datos">
        <span>
  {formatearMonto(item.pagado)} / {formatearMonto(item.cuota)}

  {item.pagado < item.cuota && (
    <small style={{ marginLeft: "8px", color: "#ff4d4d" }}>
      Falta: {formatearMonto(item.cuota - item.pagado)}
    </small>
  )}
</span>

        <span
          className={
            item.estado === "Pagado"
              ? "badge-pagado"
              : item.estado === "Parcial"
              ? "badge-parcial"
              : "badge-pendiente"
          }
        >
          {item.estado}
        </span>
      </div>

    </div>
  ))}
</div>

      </div>

      {/* REGISTRAR ABONO */}
<div className="modal-abono-cc">

  <h4>Registrar abono</h4>

  <input
    type="number"
    placeholder="Monto del abono"
    value={montoAbono}
    onChange={(e) => setMontoAbono(e.target.value)}
    className="input-abono"
  />

  <div style={{ marginTop: '15px' }}>
    <h4 style={{ fontSize: '0.9rem', marginBottom: '8px' }}>Adjuntar Comprobante</h4>
    <input 
      type="file" 
      accept="image/*,.pdf" 
      onChange={(e) => setVoucherFile(e.target.files[0])} 
      style={{ display: 'block', marginBottom: '10px', fontSize: '0.85rem' }}
    />
    <button 
      className="btn-secundario" 
      onClick={subirVoucher} 
      disabled={!voucherFile || isUploading}
      style={{ padding: '6px 12px', fontSize: '0.85rem' }}
    >
      {isUploading ? "Subiendo..." : "Subir comprobante"}
    </button>
  </div>

</div>

      {/* BOTONES */}
     <div className="modal-actions-cc">

  {/* FILA 1 */}
  <div className="acciones-row">
    <button
      className="btn-success"
      onClick={() => {
        if (!montoAbono || Number(montoAbono) <= 0) return;

        registrarAbonoManual(cuentaManualSeleccionada, montoAbono);
        setMontoAbono("");
      }}
    >
      Registrar abono
    </button>

    <button
      className="btn-neutral"
      onClick={generarPdf}
      disabled={isGeneratingPdf}
    >
      📄 PDF
    </button>

    <button
      className="btn-warning"
      onClick={() => cobrarPorWhatsapp(cuentaManualSeleccionada)}
    >
      💰 Cobrar
    </button>
  </div>

  {/* FILA 2 */}
  <button
    className="btn-danger"
    onClick={() => {
      eliminarCuenta(cuentaManualSeleccionada);
      setCuentaManualSeleccionada(null);
    }}
  >
    Eliminar
  </button>

  <button
    className="btn-neutral"
    onClick={() => setCuentaManualSeleccionada(null)}
  >
    Cerrar
  </button>

</div>
    </div>
  </div>
)}
    
    </div>
  );
}

export default CuentasPorCobrar;