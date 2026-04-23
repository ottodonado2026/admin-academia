import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar";
import "./CuentasPorCobrar.css";

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

  useEffect(() => {
    try {
      const pagosGuardados = JSON.parse(
        localStorage.getItem(STORAGE_PAGOS) || "[]"
      );
      const alumnosGuardados = JSON.parse(
        localStorage.getItem(STORAGE_ALUMNOS) || "[]"
      );
      const manualesGuardadas = JSON.parse(
        localStorage.getItem(STORAGE_CUENTAS_MANUALES) || "[]"
      );

      setPagos(Array.isArray(pagosGuardados) ? pagosGuardados : []);
      setAlumnos(Array.isArray(alumnosGuardados) ? alumnosGuardados : []);
      setCuentasManuales(
        Array.isArray(manualesGuardadas) ? manualesGuardadas : []
      );
    } catch (error) {
      console.error("Error al cargar cuentas por cobrar:", error);
      setPagos([]);
      setAlumnos([]);
      setCuentasManuales([]);
    }
  }, []);

  const guardarPagos = (data) => {
    localStorage.setItem(STORAGE_PAGOS, JSON.stringify(data));
    setPagos(data);
  };

  const guardarCuentasManuales = (data) => {
    localStorage.setItem(STORAGE_CUENTAS_MANUALES, JSON.stringify(data));
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
    let contador = 0;
    let cursor = new Date(fechaInicio);

    while (cursor <= hoy && contador < 1000) {
      contador += 1;

      if (plan.modalidad === "semanal") {
        cursor = sumarDias(cursor, 7);
      } else if (plan.modalidad === "quincenal") {
        cursor = sumarDias(cursor, 15);
      } else {
        cursor = sumarMeses(cursor, 1);
      }
    }

    return contador;
  };

  const calcularCuotaManual = (valor, modalidad) => {
    const montoBase = Number(valor || 0);
    if (montoBase <= 0) return 0;

    if (modalidad === "semanal") return Math.round(montoBase / 4);
    if (modalidad === "quincenal") return Math.round(montoBase / 2);
    return Math.round(montoBase);
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
      const cuotaManual = calcularCuotaManual(c.monto, c.modalidad);

      return {
        ...c,
        source: "manual",
        totalCurso: null,
        valorCuota: cuotaManual,
        montoExigible: Number(c.monto || 0),
        montoVencido: Number(c.monto || 0),
        saldoPendiente: Number(c.monto || 0),
        diasMora: 0,
        fechaPago: c.fecha || null,
        modalidad: c.modalidad || "mensual",
        monto: Number(c.monto || 0),
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

  const agregarCuenta = () => {
    if (
      !cliente.trim() ||
      !concepto.trim() ||
      !monto ||
      !fechaRegistro ||
      !modalidadManual
    ) {
      return;
    }

    const nueva = {
      id: `manual-${Date.now()}`,
      cliente: cliente.trim(),
      concepto: concepto.trim(),
      monto: Number(monto),
      fecha: new Date(`${fechaRegistro}T00:00:00`).toISOString(),
      estado: "Pendiente",
      telefono: "",
      modalidad: modalidadManual,
    };

    guardarCuentasManuales([nueva, ...cuentasManuales]);
    limpiarFormulario();
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

  const marcarPagado = (cuenta) => {
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

      guardarPagos(pagosActualizados);
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

  const eliminarCuenta = (cuenta) => {
    if (cuenta.source === "pago") {
      alert(
        "Esta cuenta proviene de la sesión de pagos. Debes gestionarla desde Pagos."
      );
      return;
    }

    const filtradas = cuentasManuales.filter((c) => c.id !== cuenta.id);
    guardarCuentasManuales(filtradas);
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
                  <td>{c.cliente}</td>
                  <td>{c.concepto}</td>
                  <td>{c.source === "manual" ? "-" : formatearMonto(c.totalCurso)}</td>
                  <td>{formatearMonto(c.valorCuota)}</td>
                 <td className="col-fecha">{formatearFecha(c.fechaPago)}</td>
<td className="col-dias">{c.diasMora > 0 ? `${c.diasMora} días` : "-"}</td>
<td className="col-modalidad">{c.modalidad || "-"}</td>
<td className="col-exigible">{formatearMonto(c.montoExigible || c.monto)}</td>
<td className="col-estado">
                    {c.estado === "En mora" && (
                      <span className="estado-badge estado-mora">
                        🔴 En mora
                      </span>
                    )}
                    {c.estado === "Pendiente" && (
                      <span className="estado-badge estado-pendiente">
                        🟡 Pendiente
                      </span>
                    )}
                    {c.estado === "Al día" && (
                      <span className="estado-badge estado-dia">🟢 Al día</span>
                    )}
                    {c.estado === "Pagado" && (
                      <span className="estado-badge estado-dia">🟢 Pagado</span>
                    )}
                  </td>
                  <td className="acciones-cuenta">
                    {c.source === "manual" &&
                      (c.estado === "Pendiente" || c.estado === "En mora") && (
                        <button
                          className="btn-editar"
                          onClick={() => marcarPagado(c)}
                        >
                          Marcar pagado
                        </button>
                      )}

                    {(c.estado === "Pendiente" || c.estado === "En mora") && (
                      <button
                        className="btn-cobrar"
                        onClick={() => cobrarPorWhatsapp(c)}
                      >
                        <span>💰</span> Cobrar
                      </button>
                    )}

                    {c.source === "manual" && (
                      <button
                        className="btn-eliminar"
                        onClick={() => eliminarCuenta(c)}
                      >
                        Eliminar
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
    </div>
  );
}

export default CuentasPorCobrar;