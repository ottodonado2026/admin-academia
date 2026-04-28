import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";
import "./PagosPage.css";
import { METODOS_PAGO } from "../constants/metodosPago";

import { supabase } from "../services/supabaseClient";
import { generarIdCurso } from "../utils/idGenerator";



const HISTORIAL_COLLECTION = "historial_pagos";
const metodosPagoDisponibles = METODOS_PAGO;
const normalizarPlanesGuardados = (data = []) => {
  return data.map((plan) => ({
    ...plan,
    cursoId: plan.cursoId || plan.curso || "",
    alumnoDbId: plan.alumnoDbId ?? null,
  }));
};

const crearRegistroHistorialPago = ({
  pagoPlan,
  abono,
}) => {
  return {
    pagoId: pagoPlan.id,
    alumnoId: pagoPlan.alumnoId || "",
    alumnoDbId: pagoPlan.alumnoDbId || "",
    alumno: pagoPlan.alumno || "",
    curso: pagoPlan.curso || "",
    cursoId: pagoPlan.cursoId || "",
    monto: Number(abono.monto || 0),
    metodoPago: abono.metodoPago || "",
    referenciaPago: abono.referenciaPago || "",
    fechaPago: new Date().toISOString(),
createdAt: new Date().toISOString(),
  };
};



function PagosPage() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("auth");
    navigate("/");
  };

  const calcularTotales = (plan) => {
    const totalPagado = (plan.pagos || []).reduce(
      (acc, item) => acc + Number(item.monto || 0),
      0
    );

    const saldo = plan.valorTotal - totalPagado;

    return {
      totalPagado,
      saldo,
    };
  };

const [planes, setPlanes] = useState([]);

  const [alumno, setAlumno] = useState("");
  const [curso, setCurso] = useState("");
  const [valorCurso, setValorCurso] = useState("");
  const [alumnoId, setAlumnoId] = useState("");

  const [pagoSeleccionado, setPagoSeleccionado] = useState(null);
  const [nuevoAbono, setNuevoAbono] = useState("");
  const [metodoPago, setMetodoPago] = useState("");
  const [referenciaPago, setReferenciaPago] = useState("");
  const [modalidad, setModalidad] = useState("mensual");
  const [listaAlumnos, setListaAlumnos] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [valorEditando, setValorEditando] = useState("");

  const [pagosEliminados, setPagosEliminados] = useState([]);
const [mostrarPapeleraPagos, setMostrarPapeleraPagos] = useState(false);
const [cargandoPapelera, setCargandoPapelera] = useState(false);
 
  const [usuarioActual, setUsuarioActual] = useState(null);
  const puedeModificarPagos =
  usuarioActual?.rol === "gerente" ||
  usuarioActual?.rol === "contador";
  const alumnosDisponibles = listaAlumnos.filter((a) => {
  return !planes.some(
    (p) =>
      String(p.alumnoId) === String(a.alumnoId) ||
      String(p.alumnoDbId) === String(a.id)
  );
});
  
const fetchPagos = async () => {
  try {
    const { data, error } = await supabase
      .from("pagos")
.select("*")
.eq("eliminado", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error Supabase pagos:", error);
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
          console.error("Error cargando historial del pago:", errorHistorial);
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
          id: p.id,
          alumnoId: p.alumno_id,
          alumnoDbId: p.alumno_db_id,
          valorTotal: Number(p.valor_total),
          montoPagado: totalPagado,
          saldoPendiente: Number(p.valor_total || 0) - totalPagado,
          tipoCuota: p.tipo_cuota,
          fechaInicio: p.fecha_inicio,
          pagos: abonos,
          createdAt: p.created_at,
        };
      })
    );

    setPlanes(pagosConHistorial);
  } catch (error) {
    console.error("Error cargando pagos (catch):", error);
  }
};

useEffect(() => {
  fetchPagos();
}, []);
 

useEffect(() => {
  const fetchAlumnos = async () => {
    try {
      const { data, error } = await supabase
        .from("alumnos")
        .select("*");

      if (error) {
        console.error("Error cargando alumnos:", error);
        setListaAlumnos([]);
        return;
      }

      const adaptados = (data || []).map((a) => ({
        ...a,
        alumnoId: a.alumno_id,
        cursoId: a.curso_id,
        cursoNombre: a.curso_nombre,
      }));

      setListaAlumnos(adaptados);

    } catch (error) {
      console.error("Error cargando alumnos:", error);
      setListaAlumnos([]);
    }
  };

  fetchAlumnos();
}, []);


  useEffect(() => {
    if (!alumnoId) return;

    const seleccionado = listaAlumnos.find(
      (a) => String(a.alumnoId) === String(alumnoId)
    );

    if (seleccionado) {
      setAlumno(seleccionado.nombre);
      setCurso(seleccionado.cursoId || seleccionado.curso);
      setValorCurso(seleccionado.valor);
    }
  }, [alumnoId, listaAlumnos]);

  useEffect(() => {
  const obtenerUsuario = async () => {
    const { data } = await supabase.auth.getSession();
    const user = data?.session?.user;

    if (!user) return;

    const { data: usuarioDB } = await supabase
      .from("usuarios")
      .select("*")
      .eq("auth_uid", user.id)
      .single();

    setUsuarioActual({
      id: user.id,
      nombre: usuarioDB?.nombre || user.email,
      rol: usuarioDB?.role?.toLowerCase() || "usuario",
    });
  };

  obtenerUsuario();
}, []);

  const formatearPesos = (valor) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      minimumFractionDigits: 0,
    }).format(valor);


  const calcularCuota = (total, meses, modalidad) => {
    let cuota = 0;

    if (modalidad === "mensual") cuota = total / meses;
    if (modalidad === "quincenal") cuota = total / (meses * 2);
    if (modalidad === "semanal") cuota = total / (meses * 4);

    return Math.round(cuota);
  };

  const calcularEstado = (p, totalPagado) => {
  if (totalPagado >= Number(p.valorTotal || 0)) return "Pagado";
  if (!p.fechaInicio || !p.cuota) return "Pendiente";

  const hoy = new Date();
  const inicio = new Date(p.fechaInicio);

  if (Number.isNaN(inicio.getTime())) return "Pendiente";

  let cuotasVencidas = 1;

  if (p.tipoCuota === "mensual") {
    cuotasVencidas =
      (hoy.getFullYear() - inicio.getFullYear()) * 12 +
      (hoy.getMonth() - inicio.getMonth()) +
      1;
  } else if (p.tipoCuota === "quincenal") {
    const dias = Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24));
    cuotasVencidas = Math.floor(dias / 15) + 1;
  } else if (p.tipoCuota === "semanal") {
    const dias = Math.floor((hoy - inicio) / (1000 * 60 * 60 * 24));
    cuotasVencidas = Math.floor(dias / 7) + 1;
  }

  const totalCuotas = (() => {
    if (p.tipoCuota === "mensual") return Number(p.plazo || 0);
    if (p.tipoCuota === "quincenal") return Number(p.plazo || 0) * 2;
    if (p.tipoCuota === "semanal") return Number(p.plazo || 0) * 4;
    return Number(p.plazo || 0);
  })();

  cuotasVencidas = Math.min(cuotasVencidas, totalCuotas);

  const esperado = cuotasVencidas * Number(p.cuota || 0);

  if (totalPagado >= esperado) return "Al día";
  return "En mora";
};

  const buscarAlumnoSeleccionado = () => {
    return listaAlumnos.find((a) => String(a.alumnoId) === String(alumnoId));
  };

  const existePlanAlumno = (alumnoSeleccionado) => {
    return planes.find(
      (p) =>
        String(p.alumnoId) === String(alumnoSeleccionado.alumnoId) ||
        String(p.alumnoId) === String(alumnoSeleccionado.id) ||
        String(p.alumnoDbId) === String(alumnoSeleccionado.id)
    );
  };

  const agregarPago = async (e) => {
    e.preventDefault();

    if (!alumnoId) return alert("Selecciona un alumno");

    const alumnoSeleccionado = buscarAlumnoSeleccionado();

    if (!alumnoSeleccionado) {
      return alert("El alumno seleccionado no existe");
    }

    if (Number(valorCurso) <= 0) {
      return alert("El valor del curso debe ser mayor a 0");
    }

    const existente = existePlanAlumno(alumnoSeleccionado);

    if (existente) {
      alert("Este alumno ya tiene un pago registrado");
      return;
    }

    const nuevo = {
     
      alumnoId: alumnoSeleccionado.alumnoId,
      alumnoDbId: alumnoSeleccionado.id,
      alumno: alumnoSeleccionado.nombre,
      curso: alumnoSeleccionado.cursoNombre || "",
      cursoId: alumnoSeleccionado.cursoId || "",
      valorTotal: Number(valorCurso),
      montoPagado: 0,
      saldoPendiente: Number(valorCurso),
      plazo: Number(alumnoSeleccionado.duracion),
      cuota: calcularCuota(
        Number(valorCurso),
        Number(alumnoSeleccionado.duracion),
        modalidad
      ),
      tipoCuota: modalidad,
      fechaInicio: new Date().toISOString(),
      modalidad: modalidad,
      pagos: [],
      estado: "Pendiente",
    };

try {
  const { data: supabaseData, error } = await supabase
    .from("pagos")
    .insert([
      {
        alumno_id: nuevo.alumnoId,
        alumno_db_id: nuevo.alumnoDbId,
        alumno: nuevo.alumno,

        curso: nuevo.curso,
        curso_id: nuevo.cursoId,

        valor_total: nuevo.valorTotal,
        monto_pagado: nuevo.montoPagado,
        saldo_pendiente: nuevo.saldoPendiente,

        plazo: nuevo.plazo,
        cuota: nuevo.cuota,
        tipo_cuota: nuevo.tipoCuota,
        fecha_inicio: nuevo.fechaInicio,
        modalidad: nuevo.modalidad,

        pagos: [],
        estado: nuevo.estado,
        created_at: new Date().toISOString()
      }
    ])
    .select();

  if (error) {
    console.error("Error Supabase:", error);
    alert("Error guardando en Supabase");
    return;
  }

  const supabaseId = supabaseData?.[0]?.id;

  setPlanes((prev) => [
    ...prev,
    {
      ...nuevo,
      id: supabaseId,
    },
  ]);

} catch (error) {
  console.error("Error guardando pago:", error);
  alert("Error al guardar pago");
}

setAlumnoId("");
setAlumno("");
setCurso("");
setValorCurso("");
setModalidad("mensual");
};

const eliminarPago = async (id) => {
  

  // 🔒 CONTROL DE PERMISOS
  if (!usuarioActual || !["gerente", "contador"].includes(usuarioActual.rol)) {
  alert("No tienes permisos para eliminar pagos");
  return;
}
  const pago = planes.find((p) => p.id === id);

  if (!pago) {
    alert("Pago no encontrado");
    return;
  }

  if (!window.confirm("¿Eliminar este pago?")) return;

  // 🔥 1. GUARDAR AUDITORÍA
  const { error: errorAuditoria } = await supabase
    .from("auditoria_pagos")
    .insert([
      {
        pago_id: pago.id,
        alumno: pago.alumno,
        alumno_id: pago.alumnoId,
        curso: pago.curso,

        valor_total: pago.valorTotal,
        monto_pagado: pago.montoPagado,

        eliminado_por: usuarioActual.nombre,
        usuario_id: usuarioActual.id,
        rol: usuarioActual.rol,

        accion: "DELETE",
        created_at: new Date().toISOString(),
      },
    ]);

  if (errorAuditoria) {
    console.error("Error auditoría:", errorAuditoria);
    alert("Error registrando auditoría");
    return;
  }

  // 🔥 2. ELIMINAR EN SUPABASE
 const { error } = await supabase
  .from("pagos")
  .update({
    eliminado: true,
    updated_at: new Date().toISOString(),
  })
  .eq("id", id);

  if (error) {
    console.error("Error eliminando:", error);
    alert("Error eliminando en base de datos");
    return;
  }

  // 🔥 3. ACTUALIZAR UI
  setPlanes((prev) => prev.filter((p) => p.id !== id));
};

  const editarPago = (pago) => {
    setAlumnoId(pago.alumnoId || "");
    setModalidad(pago.modalidad);
  };

  const recalcularPago = (pago, nuevaModalidad) => {
    return {
      ...pago,
      modalidad: nuevaModalidad,
      cuotaMensual: calcularCuota(pago.valorTotal, pago.plazo, nuevaModalidad),
    };
  };

  const cambiarModalidad = async (id, nuevaModalidad) => {
    const actualizados = planes.map((p) =>
      p.id === id ? recalcularPago(p, nuevaModalidad) : p
    );

   setPlanes(actualizados);
await fetchPagos();
  };
  


const agregarAbonoModal = async () => {
  if (!usuarioActual) {
    alert("Usuario no identificado");
    return;
  }
if (!["gerente", "contador"].includes(usuarioActual.rol)) {
  alert("No tienes permisos para registrar abonos");
  return;
}


  if (!nuevoAbono || Number(nuevoAbono) <= 0) {
    alert("El abono debe ser mayor a 0");
    return;
  }

  if (!metodoPago) {
    alert("Selecciona el tipo de transacción");
    return;
  }

  const abonoNuevo = {
    monto: Number(nuevoAbono),
    fecha: new Date().toISOString(),
    metodoPago,
    referenciaPago: referenciaPago.trim(),
  };
  const cursoIdSeguro =
  pagoSeleccionado.cursoId ||
  pagoSeleccionado.curso_id ||
  generarIdCurso(pagoSeleccionado.curso || "");

  const actualizados = planes.map((p) => {
    if (p.id === pagoSeleccionado.id) {
      const nuevosPagos = [...(p.pagos || []), abonoNuevo];

      const totalPagado = nuevosPagos.reduce(
        (acc, item) => acc + Number(item.monto || 0),
        0
      );

      if (totalPagado > Number(p.valorTotal || 0)) {
        alert("El abono excede el saldo pendiente");
        return p;
      }

      const saldo = Number(p.valorTotal || 0) - totalPagado;

      return {
        ...p,
        pagos: nuevosPagos,
        montoPagado: totalPagado,
        saldoPendiente: saldo,
        estado: calcularEstado(p, totalPagado),
      };
    }

    return p;
  });

  const pagoActualizado = actualizados.find(
    (p) => p.id === pagoSeleccionado.id
  );

  if (!pagoActualizado?.id) {
    alert("No se encontró el pago a actualizar");
    return;
  }

try {
 const { error: errorUpdate } = await supabase
  .from("pagos")
  .update({
  monto_pagado: pagoActualizado.montoPagado,
  saldo_pendiente: pagoActualizado.saldoPendiente,
  estado: pagoActualizado.estado,
  updated_at: new Date().toISOString(),
})
.eq("id", pagoActualizado.id);
  if (errorUpdate) {
    console.error("Error actualizando pago en Supabase:", errorUpdate);
    alert("No se pudo actualizar el pago en Supabase");
    return;
  }

  const { error: errorHistorial } = await supabase
    .from("historial_pagos")
    .insert([
      {
        pago_id: pagoActualizado.id,
        alumno_id: pagoActualizado.alumnoId,
        alumno_db_id: pagoActualizado.alumnoDbId,
        alumno: pagoActualizado.alumno,
        curso: pagoActualizado.curso,
       
        monto: abonoNuevo.monto,
        metodo_pago: abonoNuevo.metodoPago,
        referencia_pago: abonoNuevo.referenciaPago,
        fecha_pago: new Date().toISOString(),
        created_at: new Date().toISOString(),
        usuario_id: usuarioActual?.id,
      usuario_nombre: usuarioActual?.nombre,
      rol: usuarioActual?.rol,
     
      },
    ]);




 if (errorHistorial) {
  console.error("ERROR HISTORIAL COMPLETO:", errorHistorial);
  alert(errorHistorial.message);
  return;
}

 const { error } = await supabase
  .from("auditoria_abonos")
  .insert([
    {
      pago_id: pagoActualizado.id,
      alumno: pagoActualizado.alumno,
      alumno_id: pagoActualizado.alumnoId,
      curso: pagoActualizado.curso,

      monto: abonoNuevo.monto,
      metodo_pago: abonoNuevo.metodoPago,
      referencia_pago: abonoNuevo.referenciaPago,

      accion: "CREATE",

      usuario_id: usuarioActual?.id,
      usuario_nombre: usuarioActual?.nombre,
      rol: usuarioActual?.rol,
    },
  ]);

if (error) {
  console.error("ERROR AUDITORIA:", error);
}

  setPlanes(actualizados);
  await fetchPagos(); // recargar desde Supabase

    const actualizado = actualizados.find(
      (p) => p.id === pagoSeleccionado.id
    );
    setPagoSeleccionado(actualizado);

    setNuevoAbono("");
    setMetodoPago("");
    setReferenciaPago("");
  } catch (error) {
    console.error("Error guardando abono:", error);
    alert("No se pudo guardar el abono en Firebase");
  }
};
 

  const actualizarCuota = () => {
    if (!alumnoId) return alert("Selecciona un alumno");

    const pago = planes.find((p) => String(p.alumnoId) === String(alumnoId));

    if (!pago) return alert("Este alumno no tiene pago");

    cambiarModalidad(pago.id, modalidad);

    setAlumnoId("");
    setAlumno("");
    setCurso("");
    setValorCurso("");
    setModalidad("mensual");
  };


  const editarAbono = async (abonoId, nuevoValor) => {
      if (!usuarioActual) return;

if (!["gerente", "contador"].includes(usuarioActual.rol)) {
  alert("No tienes permisos para editar abonos");
  return;
}

  const pago = planes.find((p) => p.id === pagoSeleccionado.id);

  if (!pago) return;

  const abonoAnterior = pago.pagos.find(a => a.id === abonoId);

  if (!abonoAnterior) {
  alert("Abono no encontrado");
  return;
}

  const actualizados = planes.map((p) => {
    if (p.id === pagoSeleccionado.id) {
     
      const nuevosPagos = p.pagos.map(a =>
  a.id === abonoId ? { ...a, monto: Number(nuevoValor) } : a
);

      const totalPagado = nuevosPagos.reduce(
        (acc, item) => acc + item.monto,
        0
      );

      const saldo = p.valorTotal - totalPagado;

      return {
        ...p,
        pagos: nuevosPagos,
        montoPagado: totalPagado,
        saldoPendiente: saldo,
        estado: calcularEstado(p, totalPagado),
      };
    }
    return p;
  });

  const actualizado = actualizados.find(
    (p) => p.id === pagoSeleccionado.id
  );

  // 🔥 1. GUARDAR CAMBIO EN SUPABASE
 const { error: errorUpdate } = await supabase
  .from("pagos")
  .update({
    monto_pagado: actualizado.montoPagado,
    saldo_pendiente: actualizado.saldoPendiente,
    estado: actualizado.estado,
    updated_at: new Date().toISOString(),
  })
  .eq("id", actualizado.id);

  if (errorUpdate) {
    console.error("Error actualizando abono:", errorUpdate);
    alert("Error al editar el abono");
    return;
  }
  // 🔥 ACTUALIZAR HISTORIAL (CLAVE)
await supabase
  .from("historial_pagos")
  .update({
    monto: Number(nuevoValor),
  })
  .eq("id", abonoAnterior.id);

  // 🔥 2. AUDITORÍA
const { error } = await supabase
  .from("auditoria_abonos")
  .insert([
    {
      pago_id: actualizado.id,
      alumno: actualizado.alumno,
      alumno_id: actualizado.alumnoId,
      curso: actualizado.curso,

      monto: Number(nuevoValor),
      metodo_pago: abonoAnterior.metodoPago,
      referencia_pago: abonoAnterior.referenciaPago,

      accion: "UPDATE",

      usuario_id: usuarioActual?.id,
      usuario_nombre: usuarioActual?.nombre,
      rol: usuarioActual?.rol,
    },
  ]);

if (error) {
  console.error("ERROR AUDITORIA:", error);
}
 
  // 🔥 3. ACTUALIZAR UI
  setPlanes(actualizados);
  setPagoSeleccionado(actualizado);
};


const eliminarAbono = async (abonoId)=> {
    if (!usuarioActual) return;

if (!["gerente", "contador"].includes(usuarioActual.rol)) {
  alert("No tienes permisos para eliminar abonos");
  return;
}

  const pago = planes.find((p) => p.id === pagoSeleccionado.id);
  if (!pago) return;

  // 🔥 1. OBTENER ABONO (PRIMERO)


const { data: abonoDB, error: errorFetch } = await supabase
  .from("historial_pagos")
  .select("*")
  .eq("id", abonoId)
  .single();

if (errorFetch || !abonoDB) {
  console.error("Error obteniendo abono real:", errorFetch);
  alert("No se pudo obtener el abono real");
  return;
}

const abonoEliminado = {
  id: abonoDB.id,
  monto: abonoDB.monto,
  metodoPago: abonoDB.metodo_pago,
  referenciaPago: abonoDB.referencia_pago,
};

  // 🔥 2. ACTUALIZAR EN MEMORIA
  const actualizados = planes.map((p) => {
    if (p.id === pagoSeleccionado.id) {
      const nuevosPagos = p.pagos.filter(a => a.id !== abonoId);

      const totalPagado = nuevosPagos.reduce(
        (acc, item) => acc + item.monto,
        0
      );

      const saldo = p.valorTotal - totalPagado;

      return {
        ...p,
        pagos: nuevosPagos,
        montoPagado: totalPagado,
        saldoPendiente: saldo,
        estado: calcularEstado(p, totalPagado),
      };
    }
    return p;
  });

  // 🔥 3. OBTENER ACTUALIZADO (DESPUÉS)
  const actualizado = actualizados.find(
    (p) => p.id === pagoSeleccionado.id
  );

  // 🔥 4. GUARDAR EN SUPABASE
  const { error: errorUpdate } = await supabase
  .from("pagos")
  .update({
    monto_pagado: actualizado.montoPagado,
    saldo_pendiente: actualizado.saldoPendiente,
    estado: actualizado.estado,
    updated_at: new Date().toISOString(),
  })
  .eq("id", actualizado.id);

  if (errorUpdate) {
    console.error("Error actualizando:", errorUpdate);
    alert("Error al actualizar");
    return;
  }

  // 🔥 5. HISTORIAL
await supabase
  .from("historial_pagos")
  .update({
    eliminado: true
  })
  .eq("id", abonoEliminado.id);



  // 🔥 6. AUDITORÍA (SOLO UNA VEZ)
const { error } = await supabase
  .from("auditoria_abonos")
  .insert([
    {
      pago_id: actualizado.id,
      alumno: actualizado.alumno,
      alumno_id: actualizado.alumnoId,
      curso: actualizado.curso,

      monto: abonoEliminado.monto,
      metodo_pago: abonoEliminado.metodoPago,
      referencia_pago: abonoEliminado.referenciaPago,

      accion: "DELETE",

      usuario_id: usuarioActual?.id,
      usuario_nombre: usuarioActual?.nombre,
      rol: usuarioActual?.rol,
    },
  ]);


if (error) {
  console.error("ERROR AUDITORIA:", error);
} 
  // 🔥 7. UI
  setPlanes(actualizados);
  setPagoSeleccionado(actualizado);
};



const fetchPagosEliminados = async () => {
  try {
    setCargandoPapelera(true);

    const { data, error } = await supabase
      .from("pagos")
      .select("*")
      .eq("eliminado", true)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error cargando pagos eliminados:", error);
      alert("No se pudieron cargar los pagos eliminados");
      return;
    }

    setPagosEliminados(data || []);
  } catch (error) {
    console.error("Error cargando papelera de pagos:", error);
  } finally {
    setCargandoPapelera(false);
  }
};

const restaurarPago = async (id) => {
  if (!usuarioActual || !["gerente", "contador"].includes(usuarioActual.rol)) {
    alert("No tienes permisos para restaurar pagos");
    return;
  }

  if (!window.confirm("¿Restaurar este pago?")) return;

  const { error } = await supabase
    .from("pagos")
    .update({
      eliminado: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Error restaurando pago:", error);
    alert("No se pudo restaurar el pago");
    return;
  }

  await fetchPagos();
  await fetchPagosEliminados();
};

  return (
   <div className="dashboard-layout pagos-page">
      <Sidebar onLogout={handleLogout} />

      {pagoSeleccionado && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>Historial de pagos</h2>

            <table>
              <tbody>
                {[...(pagoSeleccionado.pagos || [])]
                  .slice(-3)
                  .reverse()
                  .map((p) => (
                   <tr key={p.id}>
                      <td>{new Date(p.fecha).toLocaleDateString()}</td>

                      <td>
                        {editIndex === p.id ? (
                          <input
                            type="number"
                            value={valorEditando}
onChange={(e) => setValorEditando(e.target.value)}
                            className="input-editar"
                          />
                        ) : (
                          <span>{formatearPesos(p.monto)}</span>
                        )}
                      </td>

                      <td>
                        <span>{p.metodoPago || "-"}</span>
                      </td>

                      <td>
                        <span>{p.referenciaPago || "-"}</span>
                      </td>

                      <td className="acciones-modal">
                {editIndex === p.id? (
                          <button
                            className="btn-guardar"
                            onClick={() => {
                              editarAbono(p.id, valorEditando);
                              setEditIndex(null);
                              setValorEditando("");
                            }}
                          >
                            ✔
                          </button>
                        ) : (
                          <button
                            className="btn-mini-editar"
                           onClick={() => {
                              setEditIndex(p.id);
                              setValorEditando(p.monto);
                            }}
                          >
                            ✏️
                          </button>
                        )}

                        <button
                          className="btn-mini-eliminar"
                         onClick={() => eliminarAbono(p.id)}
                        >
                          ❌
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            <input
              type="number"
              placeholder="Nuevo abono"
              value={nuevoAbono}
              onChange={(e) => setNuevoAbono(e.target.value)}
            />

            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value)}
            >
              <option value="">Tipo de transacción</option>
              {metodosPagoDisponibles.map((metodo) => (
                <option key={metodo} value={metodo}>
                  {metodo}
                </option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Referencia de pago"
              value={referenciaPago}
              onChange={(e) => setReferenciaPago(e.target.value)}
            />

            <button onClick={agregarAbonoModal}>Agregar</button>

            <button onClick={() => setPagoSeleccionado(null)}>Cerrar</button>
          </div>
        </div>
      )}

      
{mostrarPapeleraPagos && (
  <div className="modal-overlay">
    <div className="modal-content modal-papelera">
      <h2>Papelera de pagos</h2>

      {cargandoPapelera ? (
        <p>Cargando pagos eliminados...</p>
      ) : pagosEliminados.length === 0 ? (
        <p>No hay pagos eliminados.</p>
      ) : (
        <div className="tabla-wrapper">
          <table className="tabla-papelera">
            <thead>
              <tr>
                <th>Alumno</th>
                <th>ID</th>
                <th>Curso</th>
                <th>Valor pagado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {pagosEliminados.map((pago) => (
                <tr key={pago.id}>
                  <td>{pago.alumno || "-"}</td>
                  <td>{pago.alumno_id || "-"}</td>
                  <td>{pago.curso || "-"}</td>
                  <td>{formatearPesos(Number(pago.monto_pagado || 0))}</td>
                  <td>
                    <button
                      className="btn-guardar btn-restaurar-papelera"
                      onClick={() => restaurarPago(pago.id)}
                    >
                      Restaurar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button onClick={() => setMostrarPapeleraPagos(false)}>
        Cerrar
      </button>
    </div>
  </div>
)}


      <main className="dashboard-main">
        <h1>Pagos</h1>

      <form onSubmit={agregarPago} className="form-pagos">

  {/* 🔵 FILA 1 */}
  <div className="form-row form-top-row">
    <select
      value={alumnoId}
      onChange={(e) => setAlumnoId(e.target.value)}
    >
      <option value="">Seleccionar alumno</option>
      {alumnosDisponibles.map((a) => (
        <option key={a.alumnoId || a.id} value={a.alumnoId || a.id}>
          {a.nombre} - {a.alumnoId || a.id}
        </option>
      ))}
    </select>

    <input placeholder="Curso ID" value={curso} readOnly />

    <input
      placeholder="Valor curso"
      type="number"
      value={valorCurso}
      readOnly
    />

    {/* 🔥 MOVIDO AQUÍ */}
    <select
      value={modalidad}
      onChange={(e) => setModalidad(e.target.value)}
    >
      <option value="mensual">Mensual</option>
      <option value="quincenal">Quincenal</option>
      <option value="semanal">Semanal</option>
    </select>


  </div>

  {/* 🔵 FILA 2 */}
  <div className="form-row form-bottom-row">
    <button type="submit">Agregar</button>

    <button
      type="button"
      className="btn-actualizar"
      onClick={actualizarCuota}
    >
      Actualizar
    </button>
      {puedeModificarPagos && (
    <button
      type="button"
      className="btn-ver-eliminados"
      onClick={async () => {
        setMostrarPapeleraPagos(true);
        await fetchPagosEliminados();
      }}
    >
      Ver pagos eliminados
    </button>
  )}
</div>


</form>
       <div className="tabla-wrapper">
  <table className="tabla-pagos">
          <thead>
            <tr>
              <th>Alumno</th>
              <th>ID</th>
          
              <th>Total</th>
              <th>Pagado</th>
              <th>Pendiente</th>
              <th>Cuota</th>
              <th>Plazo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody className="tabla-desktop">
            {planes.map((p) => {
              const { totalPagado, saldo } = calcularTotales(p);

              return (
                <tr key={p.id}>
                  <td>{p.alumno}</td>
                  <td>{p.alumnoId}</td>
                  
                  <td>{formatearPesos(p.valorTotal)}</td>
                  <td>{formatearPesos(totalPagado)}</td>
                  <td>{formatearPesos(saldo)}</td>
                  <td>{formatearPesos(p.cuota)} ({p.tipoCuota})</td>
                  <td>
                    {p.plazo} mes{p.plazo > 1 ? "es" : ""}
                  </td>
                  <td>
                    <span
                      className={`estado ${p.estado
                        .replace(" ", "-")
                        .toLowerCase()}`}
                    >
                      {p.estado}
                    </span>
                  </td>

                  <td className="acciones">
                    <button
                      className="btn-ver"
                      onClick={() => setPagoSeleccionado(p)}
                    >
                      Ver
                    </button>

                    <button
                      className="btn-editar"
                      onClick={() => editarPago(p)}
                    >
                      Editar
                    </button>
{puedeModificarPagos && (
  <button
    className="btn-eliminar btn-icon"
    onClick={() => eliminarPago(p.id)}
  >
    🗑
  </button>
)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>

        <div className="pagos-mobile">
          {planes.map((p) => {
            const { totalPagado, saldo } = calcularTotales(p);

            return (
              <div key={p.id} className="pago-card">
                <div className="card-header">
                  <h3>{p.alumno}</h3>
                  <span
                    className={`estado ${p.estado
                      .replace(" ", "-")
                      .toLowerCase()}`}
                  >
                    {p.estado}
                  </span>
                </div>

                <div className="card-grid">
                  <div className="card-item">
                    <span>ID alumno</span>
                    <strong>{p.alumnoId}</strong>
                  </div>

               

                  <div className="card-item">
                    <span>Total</span>
                    <strong>{formatearPesos(p.valorTotal)}</strong>
                  </div>

                  <div className="card-item">
                    <span>Pagado</span>
                    <strong>{formatearPesos(totalPagado)}</strong>
                  </div>

                  <div className="card-item">
                    <span>Pendiente</span>
                    <strong>{formatearPesos(saldo)}</strong>
                  </div>

                  <div className="card-item">
                    <span>Cuota</span>
                    <strong>{formatearPesos(p.cuotaMensual)}</strong>
                  </div>

                  <div className="card-item">
                    <span>Plazo</span>
                    <strong>{p.plazo} meses</strong>
                  </div>
                </div>

                <div className="card-actions">
                  <button
                    className="btn-ver"
                    onClick={() => setPagoSeleccionado(p)}
                  >
                    Ver pagos
                  </button>

                  <button
                    className="btn-editar"
                    onClick={() => editarPago(p)}
                  >
                    Editar
                  </button>

                <button
  className="btn-eliminar btn-icon"
  onClick={() => eliminarPago(p.id)}
>
  🗑
</button>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

export default PagosPage;