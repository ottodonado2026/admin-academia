import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";
import "./AlumnosPage.css";
import { db } from "../firebase";
import { getDocs, collection, addDoc, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { useState, useEffect, useMemo } from "react";
import CustomSelect from "../components/CustomSelect";

import { generarIdAlumnoBonito, generarIdCurso } from "../utils/idGenerator";
import { supabase } from "../services/supabaseClient";




function AlumnosPage() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("auth");
    navigate("/");
  };
const [alumnos, setAlumnos] = useState([]);

useEffect(() => {
  const fetchAlumnos = async () => {
    const snapshot = await getDocs(collection(db, "alumnos"));

    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    setAlumnos(data);
  };

  fetchAlumnos();
}, []);

  const [nombre, setNombre] = useState("");
  const [curso, setCurso] = useState("");
  const [valor, setValor] = useState("");
  const [descuento, setDescuento] = useState("");
  const [valorEditadoManual, setValorEditadoManual] = useState(false);
  const [modalidad, setModalidad] = useState("");
  const [tipo, setTipo] = useState("");
  const [duracion, setDuracion] = useState("");
  const [estado, setEstado] = useState("activo");

  const [editandoId, setEditandoId] = useState(null);
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null);
  const [planesCursos, setPlanesCursos] = useState([]);
  const [planesPagos, setPlanesPagos] = useState([]);
  const [edad, setEdad] = useState("");
const [nombreAcudiente, setNombreAcudiente] = useState("");
const [telefonoAcudiente, setTelefonoAcudiente] = useState("");

  const tipoLabels = {
  personalizado: "Personalizado",
  semi: "Semi-personalizado",
  grupal: "Grupal",
};

  useEffect(() => {
   
  }, [alumnos]);

 useEffect(() => {
  const fetchPagos = async () => {
    try {
      const snapshot = await getDocs(collection(db, "pagos"));

      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setPlanesPagos(data);

    } catch (error) {
      console.error("Error cargando pagos en alumnos:", error);
    }
  };

  fetchPagos();
}, []);

useEffect(() => {
  const fetchCursos = async () => {
    try {
      const snapshot = await getDocs(collection(db, "cursos"));

      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setPlanesCursos(data);

    } catch (error) {
      console.error("Error cargando cursos:", error);
      setPlanesCursos([]);
    }
  };

  fetchCursos();
}, []);




  const cursoSeleccionado = useMemo(() => {
    return planesCursos.find((c) => c.id === curso) || null;
  }, [curso, planesCursos]);

  const inicioCurso = cursoSeleccionado?.tipos?.[tipo]?.inicio || "";
  const precioBaseCurso = cursoSeleccionado?.tipos?.[tipo]?.precio || 0;

  const descuentoAplicado = Math.min(
    Math.max(Number(descuento) || 0, 0),
    100
  );

  const valorCalculado = precioBaseCurso
    ? Math.round(precioBaseCurso * (1 - descuentoAplicado / 100))
    : 0;

  useEffect(() => {
    if (!curso || !tipo || planesCursos.length === 0) {
      if (editandoId === null) {
        setValor("");
        setValorEditadoManual(false);
      }
      return;
    }

    if (!valorEditadoManual) {
      setValor(String(valorCalculado));
    }
  }, [
    curso,
    tipo,
    planesCursos,
    descuento,
    valorCalculado,
    valorEditadoManual,
    editandoId,
  ]);

 const obtenerNombreCurso = (cursoId, cursoNombre) => {
  if (cursoNombre) return cursoNombre;

  const encontrado = planesCursos.find((c) => c.id === cursoId);
  return encontrado?.nombre || cursoId;
};
  const sumarDias = (fecha, dias) => {
    const nuevaFecha = new Date(fecha);
    nuevaFecha.setDate(nuevaFecha.getDate() + dias);
    return nuevaFecha;
  };

  const sumarMeses = (fecha, meses) => {
    const nuevaFecha = new Date(fecha);
    nuevaFecha.setMonth(nuevaFecha.getMonth() + meses);
    return nuevaFecha;
  };

  const formatearFechaPago = (fecha) => {
    return fecha.toLocaleDateString("es-CO", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const obtenerProximoPagoTexto = (alumno) => {
    const plan = planesPagos.find(
      (p) =>
        String(p.alumnoId) === String(alumno.alumnoId) ||
        String(p.alumnoId) === String(alumno.id) ||
        String(p.alumnoDbId) === String(alumno.id)
    );

    if (!plan) return "Sin plan de pago";
    if (plan.estado === "Pagado") return "Pago completado";
    if (!plan.fechaInicio || !plan.modalidad) return "Fecha no disponible";

    const fechaInicio = new Date(plan.fechaInicio);
    if (Number.isNaN(fechaInicio.getTime())) return "Fecha no disponible";

    let proximaFecha = new Date(fechaInicio);
    const hoy = new Date();

    while (proximaFecha <= hoy) {
      if (plan.modalidad === "semanal") {
        proximaFecha = sumarDias(proximaFecha, 7);
      } else if (plan.modalidad === "quincenal") {
        proximaFecha = sumarDias(proximaFecha, 15);
      } else {
        proximaFecha = sumarMeses(proximaFecha, 1);
      }
    }

    return formatearFechaPago(proximaFecha);
  };

  const limpiarFormulario = () => {
    setNombre("");
    setCurso("");
    setValor("");
    setDescuento("");
    setValorEditadoManual(false);
    setModalidad("");
    setTipo("");
    setDuracion("");
    setTelefono("");
    setTipoDocumento("");
    setEstado("activo");
    setEditandoId(null);
    setNumeroDocumento("");
  };

  const agregarAlumno = async () => {
  if (!nombre || !curso || !valor || !tipo) {
    alert("Completa los campos obligatorios");
    return;
  }


if (editandoId !== null) {
  try {
    const alumnoRef = doc(db, "alumnos", editandoId);


    const cursoIdBonito = generarIdCurso(
  cursoSeleccionado?.nombre || ""
);
   await updateDoc(alumnoRef, {
  nombre,
  curso,
  cursoId: cursoIdBonito,
cursoNombre: cursoSeleccionado?.nombre || "",
      valor: Number(valor),
      valorBase: Number(precioBaseCurso || 0),
      descuento: Number(descuento) || 0,
      valorEditadoManual,
      modalidad,
      tipo,
      duracion,
      estado,
      telefono,
      tipoDocumento,
      numeroDocumento,
    });

    // 🔥 refrescar desde Firebase
    const snapshot = await getDocs(collection(db, "alumnos"));
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    setAlumnos(data);

    limpiarFormulario();

  } catch (error) {
    console.error("Error editando alumno:", error);
  }

  return;
}


const cursoIdBonito = generarIdCurso(
  cursoSeleccionado?.nombre || ""
);
  // 🟢 CREAR EN FIREBASE
  const nuevo = {
    alumnoId: await generarIdAlumnoBonito(nombre),
    nombre,
    telefono,
    email,
    tipoDocumento,
    numeroDocumento,
    edad,
  nombreAcudiente,
  telefonoAcudiente,
   cursoId: cursoIdBonito,
cursoNombre: cursoSeleccionado?.nombre || "",
    valor: Number(valor),
    valorBase: Number(precioBaseCurso || 0),
    descuento: Number(descuento) || 0,
    valorEditadoManual,
    modalidad,
   tipoPrograma: tipo,
    duracion,
    estado,
  };

  try {
    const docRef = await addDoc(collection(db, "alumnos"), nuevo);

    await updateDoc(docRef, {
      id: docRef.id,
    });
   const { error: errorSupabaseAlumno } = await supabase
  .from("alumnos")
  .insert([
    {
      alumno_id: nuevo.alumnoId,
      nombre: nuevo.nombre,
      telefono: nuevo.telefono || "",

      email: email && email.trim() !== ""
        ? email
        : "sin-email@temp.com",
        asesor_id: null,
      tipo_documento: nuevo.tipoDocumento || "",
      numero_documento: nuevo.numeroDocumento || "",
      edad: nuevo.edad || "",
      nombre_acudiente: nuevo.nombreAcudiente || "",
      telefono_acudiente: nuevo.telefonoAcudiente || "",
      curso_id: nuevo.cursoId || "",
      curso_nombre: nuevo.cursoNombre || "",
      valor: Number(nuevo.valor || 0),
      valor_base: Number(nuevo.valorBase || 0),
      descuento: Number(nuevo.descuento || 0),
      modalidad: nuevo.modalidad || "",
      tipo_programa: nuevo.tipoPrograma || "",
      duracion: nuevo.duracion || "",
      estado: nuevo.estado || "activo",
      created_at: new Date().toISOString(),
    },
  ]);

if (errorSupabaseAlumno) {
 console.error("Error guardando alumno en Supabase:", errorSupabaseAlumno);
alert("Error Supabase: " + errorSupabaseAlumno.message);
}

    // 🔥 refrescar desde Firebase
    const snapshot = await getDocs(collection(db, "alumnos"));
    const data = snapshot.docs.map((doc) => {
  const curso = doc.data();

  return {
    ...curso,
    id: curso.id || generarIdCurso(curso.nombre),
  };
});

    setAlumnos(data);

    limpiarFormulario();

  } catch (error) {
    console.error("Error creando alumno:", error);
  }
};


const eliminarAlumno = async (id) => {
  if (!window.confirm("¿Eliminar este alumno?")) return;

  try {
    await deleteDoc(doc(db, "alumnos", id));

    const snapshot = await getDocs(collection(db, "alumnos"));
    const data = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    setAlumnos(data);

  } catch (error) {
    console.error("Error eliminando alumno:", error);
  }
};



  const editarAlumno = (alumno) => {
    setNombre(alumno.nombre || "");
    setCurso(alumno.cursoId || alumno.curso || "");
    setValor(String(alumno.valor ?? ""));
    setDescuento(String(alumno.descuento ?? ""));
    setValorEditadoManual(Boolean(alumno.valorEditadoManual));
    setModalidad(alumno.modalidad || "");
    setTipo(alumno.tipoPrograma || "");
    setDuracion(alumno.duracion || "");
    setEstado(alumno.estado || "activo");
    setEditandoId(alumno.id);
    setTelefono(alumno.telefono || "");
    setTipoDocumento(alumno.tipoDocumento || "");
    setNumeroDocumento(alumno.numeroDocumento || "");
  };

  return (
    <div className="dashboard-layout alumnos-page">
      <Sidebar onLogout={handleLogout} />

      <main className="dashboard-main">
        <h1>Alumnos</h1>

        <div className="alumnos-form">
          <input
            placeholder="Nombre del alumno"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />

         <CustomSelect
  value={tipoDocumento}
  onChange={(e) => setTipoDocumento(e.target.value)}
  placeholder="Tipo documento"
  options={[
    { value: "cedula", label: "Cédula" },
    { value: "ti", label: "Tarjeta de identidad" },
    { value: "nit", label: "NIT" },
    { value: "ppt", label: "PPT" },
    { value: "extranjeria", label: "Cédula extranjería" },
  ]}
/>

          <input
            placeholder="Número de documento"
            value={numeroDocumento}
            onChange={(e) => setNumeroDocumento(e.target.value)}
          />

          <input
            placeholder="Teléfono"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
          />

<input
  placeholder="Email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>
<CustomSelect
  value={curso}
  onChange={(e) => setCurso(e.target.value)}
  placeholder="Seleccionar curso"
  options={planesCursos.map((c) => ({
    value: c.id,
    label: c.nombre,
  }))}
/>
<CustomSelect
  className="duracion-select"
  value={duracion}
  onChange={(e) => setDuracion(e.target.value)}
  placeholder="Duración"
  options={[...Array(12)].map((_, i) => ({
    value: i + 1,
    label: `${i + 1} mes${i + 1 > 1 ? "es" : ""}`,
  }))}
/>

<CustomSelect
  value={modalidad}
  onChange={(e) => setModalidad(e.target.value)}
  placeholder="Modalidad"
  options={[
    { value: "presencial", label: "Presencial" },
    { value: "virtual", label: "Virtual" },
  ]}
/>

<div className="tipo-row">
  <CustomSelect
    value={tipo}
    onChange={(e) => {
      setTipo(e.target.value);
      setValorEditadoManual(false);
    }}
    placeholder="Tipo"
    options={[
      { value: "personalizado", label: "Personalizado" },
      { value: "semi", label: "Semi-personalizado" },
      { value: "grupal", label: "Grupal" },
    ]}
  />

  <input
    type="number"
    placeholder="Precio"
    value={valor}
    onChange={(e) => {
      setValor(e.target.value);
      setValorEditadoManual(true);
    }}
    className="input-precio"
  />

  <input
    type="number"
    placeholder="% Desc"
    value={descuento}
    onChange={(e) => {
      setDescuento(e.target.value);
      setValorEditadoManual(false);
    }}
    className="input-descuento"
  />

  {curso && tipo && inicioCurso && (
    <div className="inicio-badge">🚀 {inicioCurso}</div>
  )}
</div>



          <button type="button" onClick={agregarAlumno}>
            {editandoId ? "Guardar cambios" : "Agregar alumno"}
          </button>
        </div>

        <div className="tabla-container">
          <table className="tabla-pagos">
            <thead>
              <tr>
                <th>Alumno</th>
                <th>ID alumno</th>
                <th>Curso</th>
      
                <th>Valor</th>
          
                
                <th>Duración</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody className="tabla-desktop">
              {alumnos.map((a) => (
                <tr key={a.id}>
                  <td>{a.nombre}</td>
                  <td>{a.alumnoId}</td>
                  <td>{obtenerNombreCurso(a.cursoId || a.curso)}</td>
                  
                  <td>${Number(a.valor || 0).toLocaleString()}</td>
                 
                 
                  <td>{a.duracion ? `${a.duracion} meses` : "-"}</td>
                  <td>{a.estado}</td>
              <td>
  <div className="acciones-grupo">
    <button
      className="btn-ver"
      onClick={() => setAlumnoSeleccionado(a)}
    >
      Ver
    </button>

    <button
      className="btn-editar"
      onClick={() => editarAlumno(a)}
    >
      Editar
    </button>

    <button
      className="btn-eliminar btn-icon"
      onClick={() => eliminarAlumno(a.id)}
      title="Eliminar"
      aria-label={`Eliminar alumno ${a.nombre}`}
    >
      🗑
    </button>
  </div>
</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="alumnos-mobile">
          {alumnos.map((a) => (
            <div key={a.id} className="alumno-card">
              <div className="card-header">
                <div>
                  <h3>{a.nombre}</h3>
                  <small className="alumno-id-mobile">{a.alumnoId}</small>
                </div>
                <span>{a.estado}</span>
              </div>

              <div className="card-body">
              <div className="card-grid">

  {/* FILA 1 */}
  <div className="card-item">
    <span>Curso</span>
    <strong>{obtenerNombreCurso(a.cursoId || a.curso)}</strong>
  </div>

  <div className="card-item">
    <span>Valor</span>
    <strong>${Number(a.valor || 0).toLocaleString()}</strong>
  </div>

  {/* FILA 2 */}
  <div className="card-item">
    <span>Modalidad</span>
    <strong>{a.modalidad || "-"}</strong>
  </div>

  <div className="card-item">
    <span>Tipo</span>
    <strong>{tipoLabels[a.tipoPrograma] || "-"}</strong>
  </div>

  {/* FILA 3 */}
  <div className="card-item">
    <span>Duración</span>
    <strong>{a.duracion ? `${a.duracion} meses` : "-"}</strong>
  </div>

  {/* 👇 OPCIONAL: para que no quede hueco */}
  <div className="card-item">
    <span>Estado</span>
    <strong>{a.estado}</strong>
  </div>

</div>
</div> 
              <div className="card-actions">
                <button
                  className="btn-ver"
                  onClick={() => setAlumnoSeleccionado(a)}
                >
                  Ver
                </button>
                <button className="btn-editar" onClick={() => editarAlumno(a)}>
                  Editar
                </button>
                <button
                  className="btn-eliminar"
                  onClick={() => eliminarAlumno(a.id)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>

        {alumnoSeleccionado && (
          <div
            className="modal-overlay"
            onClick={() => setAlumnoSeleccionado(null)}
          >
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <div className="modal-title-block">
                  <h2>{alumnoSeleccionado.nombre}</h2>
                  <p className="modal-alumno-id">
                    ID alumno: {alumnoSeleccionado.alumnoId}
                  </p>
                </div>

                <div className="modal-icons">
                  <span>🎧</span>
                </div>
              </div>

              <div className="modal-grid">
                <div className="modal-item">
                  <span>Curso</span>
                  <strong>
                    {obtenerNombreCurso(
  alumnoSeleccionado.cursoId,
  alumnoSeleccionado.cursoNombre
)}
                  </strong>
                </div>
                


                <div className="modal-item">
                  <span>ID curso</span>
                  <strong>
                    {alumnoSeleccionado.cursoId ||
                      alumnoSeleccionado.curso ||
                      "-"}
                  </strong>
                </div>

                <div className="modal-item">
                  <span>Próximo pago</span>
                  <strong>{obtenerProximoPagoTexto(alumnoSeleccionado)}</strong>
                </div>

                <div className="modal-item">
                  <span>Precio real</span>
                  <strong>
                    $
                    {Number(
                      alumnoSeleccionado.valorBase ||
                        alumnoSeleccionado.valor ||
                        0
                    ).toLocaleString()}
                  </strong>
                </div>

                <div className="modal-item">
                  <span>Descuento</span>
                  <strong>{Number(alumnoSeleccionado.descuento || 0)}%</strong>
                </div>

                {Number(alumnoSeleccionado.descuento || 0) > 0 && (
                  <div className="modal-item">
                    <span>Precio final</span>
                    <strong>
                      ${Number(alumnoSeleccionado.valor || 0).toLocaleString()}
                    </strong>
                  </div>
                )}

                <div className="modal-item">
                  <span>Cédula</span>
                  <strong>{alumnoSeleccionado.numeroDocumento || "-"}</strong>
                </div>

                <div className="modal-item">
                  <span>Estado</span>
                  <strong>{alumnoSeleccionado.estado || "-"}</strong>
                </div>

                <div className="modal-item">
                  <span>Modalidad</span>
                  <strong>{alumnoSeleccionado.modalidad || "-"}</strong>
                </div>

                <div className="modal-item">
                  <span>Tipo</span>
<strong>{alumnoSeleccionado.tipoPrograma || "-"}</strong>                </div>

                <div className="modal-item">
                  <span>Duración</span>
                  <strong>
                    {alumnoSeleccionado.duracion
                      ? `${alumnoSeleccionado.duracion} meses`
                      : "-"}
                  </strong>
                </div>

                <div className="modal-item">
                  <span>Teléfono</span>
                  <strong>{alumnoSeleccionado.telefono || "-"}</strong>
                </div>
{alumnoSeleccionado.tipoDocumento === "tarjeta_identidad" && (
  <>
    <div className="modal-info-card">
      <small>Edad</small>
      <strong>{alumnoSeleccionado.edad || "-"}</strong>
    </div>

    <div className="modal-info-card">
      <small>Acudiente</small>
      <strong>{alumnoSeleccionado.nombreAcudiente || "-"}</strong>
    </div>

    <div className="modal-info-card">
      <small>Teléfono acudiente</small>
      <strong>{alumnoSeleccionado.telefonoAcudiente || "-"}</strong>
    </div>
  </>
)}
              </div>

         



              <button
                className="btn-cerrar"
                onClick={() => setAlumnoSeleccionado(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AlumnosPage;