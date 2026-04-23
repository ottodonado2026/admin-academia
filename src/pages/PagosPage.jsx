import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";
import "./PagosPage.css";
import { METODOS_PAGO } from "../constants/metodosPago";
import { addDoc, collection, getDocs, updateDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";



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
    fechaPago: serverTimestamp(),
    createdAt: serverTimestamp(),
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

  const alumnosDisponibles = listaAlumnos.filter((a) => {
  return !planes.some(
    (p) =>
      String(p.alumnoId) === String(a.alumnoId) ||
      String(p.alumnoDbId) === String(a.id)
  );
});
  
useEffect(() => {
  const fetchPagos = async () => {
    try {
      const snapshot = await getDocs(collection(db, "pagos"));

      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setPlanes(data);

    } catch (error) {
      console.error("Error cargando pagos:", error);
    }
  };

  fetchPagos();
}, []);

  useEffect(() => {
  const fetchAlumnos = async () => {
    try {
      const snapshot = await getDocs(collection(db, "alumnos"));

      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setListaAlumnos(data);
    } catch (error) {
      console.error("Error cargando alumnos en pagos:", error);
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
  const docRef = await addDoc(collection(db, "pagos"), {
    ...nuevo,
    createdAt: new Date().toISOString()
  });

  // 🔥 AGREGAR ESTO
  setPlanes((prev) => [
    ...prev,
    {
      ...nuevo,
      id: docRef.id,
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

  const eliminarPago = (id) => {
    if (!window.confirm("¿Eliminar este registro?")) return;
    setPlanes(planes.filter((p) => p.id !== id));
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

  const cambiarModalidad = (id, nuevaModalidad) => {
    const actualizados = planes.map((p) =>
      p.id === id ? recalcularPago(p, nuevaModalidad) : p
    );

    setPlanes(actualizados);
  };
  
const agregarAbonoModal = async () => {
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
    await updateDoc(doc(db, "pagos", pagoActualizado.id), {
      pagos: pagoActualizado.pagos,
      montoPagado: pagoActualizado.montoPagado,
      saldoPendiente: pagoActualizado.saldoPendiente,
      estado: pagoActualizado.estado,
    });

    await addDoc(
      collection(db, HISTORIAL_COLLECTION),
      crearRegistroHistorialPago({
        pagoPlan: pagoActualizado,
        abono: abonoNuevo,
      })
    );

    setPlanes(actualizados);

    const actualizado = actualizados.find(
      (p) => p.id === pagoSeleccionado.id
    );
    setPagoSeleccionado(actualizado);

    setNuevoAbono("");
    setMetodoPago("");
    setReferenciaPago("");
  } catch (error) {
    console.error("Error guardando abono e historial en Firebase:", error);
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

  const editarAbono = (index, nuevoValor) => {
    const actualizados = planes.map((p) => {
      if (p.id === pagoSeleccionado.id) {
        const nuevosPagos = [...p.pagos];
        nuevosPagos[index].monto = Number(nuevoValor);

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

    setPlanes(actualizados);

    const actualizado = actualizados.find((p) => p.id === pagoSeleccionado.id);
    setPagoSeleccionado(actualizado);
  };

  const eliminarAbono = (index) => {
    const actualizados = planes.map((p) => {
      if (p.id === pagoSeleccionado.id) {
        const nuevosPagos = p.pagos.filter((_, i) => i !== index);

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

    setPlanes(actualizados);

    const actualizado = actualizados.find((p) => p.id === pagoSeleccionado.id);
    setPagoSeleccionado(actualizado);
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
                  .map((p, i) => (
                    <tr key={i}>
                      <td>{new Date(p.fecha).toLocaleDateString()}</td>

                      <td>
                        {editIndex === i ? (
                          <input
                            type="number"
                            value={p.monto}
                            onChange={(e) => editarAbono(i, e.target.value)}
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
                        {editIndex === i ? (
                          <button
                            className="btn-guardar"
                            onClick={() => setEditIndex(null)}
                          >
                            ✔
                          </button>
                        ) : (
                          <button
                            className="btn-mini-editar"
                            onClick={() => setEditIndex(i)}
                          >
                            ✏️
                          </button>
                        )}

                        <button
                          className="btn-mini-eliminar"
                          onClick={() => eliminarAbono(i)}
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

      <main className="dashboard-main">
        <h1>Pagos</h1>

        <form onSubmit={agregarPago} className="form-pagos">
          <div className="form-row">
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
          </div>

          <div className="form-row">
            <select
              value={modalidad}
              onChange={(e) => setModalidad(e.target.value)}
            >
              <option value="mensual">Mensual</option>
              <option value="quincenal">Quincenal</option>
              <option value="semanal">Semanal</option>
            </select>

            <button type="submit">Agregar</button>

            <button
              type="button"
              className="btn-actualizar"
              onClick={actualizarCuota}
            >
              Actualizar
            </button>
          </div>
        </form>

       <div className="tabla-wrapper">
  <table className="tabla-pagos">
          <thead>
            <tr>
              <th>Alumno</th>
              <th>ID alumno</th>
          
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

                   <button
  className="btn-eliminar btn-icon"
  onClick={() => eliminarPago(p.id)}
>
  🗑
</button>
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