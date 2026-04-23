import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import "./ProfesoresPage.css";

function ProfesoresPage() {
  const navigate = useNavigate();
  const STORAGE_KEY = "profesores";
 const ESPECIALIDADES = [
  "produccion",
  "dj",
  "guitarra",
  "piano",
  "canto"
];

  const [profesores, setProfesores] = useState(() => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  });

  const [nombre, setNombre] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [telefono, setTelefono] = useState("");
const [especialidades, setEspecialidades] = useState([]);  const [modalidad, setModalidad] = useState("");
  const [tipoContrato, setTipoContrato] = useState("");
  const [comision, setComision] = useState("");
  const [estado, setEstado] = useState("activo");
  const [observaciones, setObservaciones] = useState("");

  const [editandoId, setEditandoId] = useState(null);
  const [profesorSeleccionado, setProfesorSeleccionado] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [salario, setSalario] = useState("");


  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profesores));
  }, [profesores]);


  useEffect(() => {
  if (tipoContrato === "comision") {
    setSalario("");
  }

  if (tipoContrato === "fijo" || tipoContrato === "prestacion") {
    setComision("");
  }
}, [tipoContrato]);
  const limpiarFormulario = () => {
    setNombre("");
    setTipoDocumento("");
    setNumeroDocumento("");
    setTelefono("");
    setEspecialidades([]);
    setModalidad("");
    setTipoContrato("");
    setComision("");
    setEstado("activo");
    setObservaciones("");
    setEditandoId(null);
  };

  const validarFormulario = () => {
    const nombreLimpio = nombre.trim();
    const documentoLimpio = numeroDocumento.trim();
    const telefonoLimpio = telefono.trim();
    

    if (!nombreLimpio) {
      alert("El nombre del profesor es obligatorio");
      return false;
    }

    if (!tipoDocumento) {
      alert("Selecciona el tipo de documento");
      return false;
    }

    if (!documentoLimpio) {
      alert("El número de documento es obligatorio");
      return false;
    }

    if (!telefonoLimpio) {
      alert("El teléfono es obligatorio");
      return false;
    }

    if (especialidades.length === 0) {
  alert("Selecciona al menos una especialidad");
  return false;
}

    if (!modalidad) {
      alert("Selecciona la modalidad");
      return false;
    }

    if (!tipoContrato) {
      alert("Selecciona el tipo de contrato");
      return false;
    }

   if (tipoContrato === "comision" || tipoContrato === "mixto") {
  const comisionNumero = Number(comision);

  if (
    Number.isNaN(comisionNumero) ||
    comisionNumero < 0 ||
    comisionNumero > 100
  ) {
    alert("La comisión debe estar entre 0 y 100");
    return false;
  }
}

    const duplicado = profesores.some((p) => {
      if (editandoId && p.id === editandoId) return false;
      return String(p.numeroDocumento) === documentoLimpio;
    });

    if (duplicado) {
      alert("Ya existe un profesor con ese número de documento");
      return false;
    }

    return true;
  };

  const agregarProfesor = () => {
    if (!validarFormulario()) return;

    const payload = {
      nombre: nombre.trim(),
      tipoDocumento,
      numeroDocumento: numeroDocumento.trim(),
      telefono: telefono.trim(),
      especialidades,
      modalidad,
      tipoContrato,
      comision: Number(comision),
      estado,
      observaciones: observaciones.trim(),
      updatedAt: new Date().toISOString(),
    };

    if (editandoId) {
      const actualizados = profesores.map((p) =>
        p.id === editandoId ? { ...p, ...payload } : p
      );
      setProfesores(actualizados);
      limpiarFormulario();
      return;
    }

    const nuevoProfesor = {
      id: Date.now(),
      createdAt: new Date().toISOString(),
      clasesAsignadas: 0,
      alumnosActivos: 0,
      email: `${payload.numeroDocumento}@profe.com`,
      password: payload.numeroDocumento,
      role: "profesor",
      salario: Number(salario) || 0,
      ...payload,
    };

    setProfesores([nuevoProfesor, ...profesores]);
    limpiarFormulario();
  };

  const editarProfesor = (profesor) => {
    setNombre(profesor.nombre || "");
    setTipoDocumento(profesor.tipoDocumento || "");
    setNumeroDocumento(profesor.numeroDocumento || "");
    setTelefono(profesor.telefono || "");
    setEspecialidades(profesor.especialidades || []);
    setModalidad(profesor.modalidad || "");
    setTipoContrato(profesor.tipoContrato || "");
    setComision(String(profesor.comision ?? ""));
    setEstado(profesor.estado || "activo");
    setObservaciones(profesor.observaciones || "");
    setEditandoId(profesor.id);
    window.scrollTo({ top: 0, behavior: "smooth" });
    setSalario(String(profesor.salario ?? ""));
  };

  const eliminarProfesor = (id) => {
    const profesor = profesores.find((p) => p.id === id);
    if (!profesor) return;

    const confirmar = window.confirm(
      `¿Seguro que deseas eliminar a ${profesor.nombre}?`
    );

    if (!confirmar) return;

    const filtrados = profesores.filter((p) => p.id !== id);
    setProfesores(filtrados);

    if (editandoId === id) {
      limpiarFormulario();
      setSalario("");
    }

    if (profesorSeleccionado?.id === id) {
      setProfesorSeleccionado(null);
    }
  };

  const profesoresFiltrados = useMemo(() => {
    const term = busqueda.trim().toLowerCase();

    if (!term) return profesores;

    return profesores.filter((p) => {
      return (
  p.nombre?.toLowerCase().includes(term) ||
  p.numeroDocumento?.toLowerCase().includes(term) ||
  p.especialidades?.some(e => e.toLowerCase().includes(term)) ||
  p.modalidad?.toLowerCase().includes(term) ||
  p.estado?.toLowerCase().includes(term)
);
    });
  }, [profesores, busqueda]);

  return (
    <div className="dashboard-layout">
      <Sidebar onLogout={handleLogout} />

      <main className="dashboard-main">
        <div className="profesores-header">
          <div>
            <h1>Profesores</h1>
            <p className="profesores-subtitle">
              Gestión base de profesores, modalidad, contrato y comisión.
            </p>
          </div>

          <div className="profesores-resumen">
            <div className="mini-card">
              <span>Total</span>
              <strong>{profesores.length}</strong>
            </div>
            <div className="mini-card">
              <span>Activos</span>
              <strong>
                {profesores.filter((p) => p.estado === "activo").length}
              </strong>
            </div>
          </div>
        </div>

        <div className="profesores-toolbar">
          <input
            type="text"
            placeholder="Buscar por nombre, documento o especialidad"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />

          <button
            type="button"
            className="btn-secundario"
            onClick={limpiarFormulario}
          >
            {editandoId ? "Cancelar edición" : "Limpiar"}
          </button>
        </div>

        <div className="form-profesores">
          <input
            placeholder="Nombre completo"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
          />

          <select
            value={tipoDocumento}
            onChange={(e) => setTipoDocumento(e.target.value)}
          >
            <option value="">Tipo documento</option>
            <option value="cedula">Cédula</option>
            <option value="ce">Cédula extranjería</option>
            <option value="ppt">PPT</option>
            <option value="nit">NIT</option>
          </select>

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
<div className="especialidades-select">
  {ESPECIALIDADES.map((esp) => {
    const isSelected = especialidades.includes(esp);

    return (
      <button
        type="button"
        key={esp}
        className={`chip-select ${isSelected ? "active" : ""}`}
        onClick={() => {
          if (isSelected) {
            setEspecialidades(especialidades.filter((e) => e !== esp));
          } else {
            setEspecialidades([...especialidades, esp]);
          }
        }}
      >
        {esp}
      </button>
    );
  })}
</div>
          <select
            value={modalidad}
            onChange={(e) => setModalidad(e.target.value)}
          >
            <option value="">Modalidad</option>
            <option value="presencial">Presencial</option>
            <option value="virtual">Virtual</option>
            <option value="mixta">Mixta</option>
          </select>

          <select
  value={tipoContrato}
  onChange={(e) => setTipoContrato(e.target.value)}
>
  <option value="">Tipo contrato</option>
  <option value="fijo">Fijo</option>
  <option value="prestacion">Prestación de servicios</option>
  <option value="comision">Solo comisión</option>
  <option value="mixto">Base + comisión</option>
</select>

{/* 👇 SALARIO VA AQUÍ AFUERA */}
{tipoContrato !== "comision" && (
  <input
    type="number"
    placeholder="Salario"
    value={salario}
    onChange={(e) => setSalario(e.target.value)}
  />
)}
{(tipoContrato === "comision" || tipoContrato === "mixto") && (
  <input
    type="number"
    min="0"
    max="100"
    placeholder="Comisión %"
    value={comision}
    onChange={(e) => setComision(e.target.value)}
  />
)}

          <select value={estado} onChange={(e) => setEstado(e.target.value)}>
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
            <option value="vacaciones">Vacaciones</option>
            <option value="suspendido">Suspendido</option>
          </select>

          <textarea
            placeholder="Observaciones"
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
          />

          <button
            type="button"
            className="btn-principal"
            onClick={agregarProfesor}
          >
            {editandoId ? "Guardar cambios" : "Agregar profesor"}
          </button>
        </div>

        <div className="tabla-container">
          <table className="tabla-profesores">
            <thead>
              <tr>
                <th>Profesor</th>
          
                <th>Modalidad</th>
                <th>Contrato</th>
                <th>Salario</th>
                <th>Comisión</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {profesoresFiltrados.map((p) => (
                <tr key={p.id}>
                  <td>
                    <div className="celda-principal">
                      <strong>{p.nombre}</strong>
                      <span>
                        {p.tipoDocumento} · {p.numeroDocumento}
                      </span>
                    </div>
                  </td>
                 
                  <td>{p.modalidad}</td>
                  <td>{p.tipoContrato}</td>
                   <td>${Number(p.salario || 0).toLocaleString()}</td>
                  <td>{p.comision}%</td>
                  <td>
                    <span className={`estado-chip ${p.estado}`}>
                      {p.estado}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-ver"
                      onClick={() => setProfesorSeleccionado(p)}
                    >
                      Ver
                    </button>
                    <button
                      className="btn-editar"
                      onClick={() => editarProfesor(p)}
                    >
                      Editar
                    </button>
                    <button
                      className="btn-eliminar"
                      onClick={() => eliminarProfesor(p.id)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}

              {profesoresFiltrados.length === 0 && (
                <tr>
                  <td colSpan="7" className="fila-vacia">
                    No hay profesores registrados.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="profesores-mobile">
          {profesoresFiltrados.map((p) => (
            <div key={p.id} className="profesor-card">
              <div className="card-header">
                <h3>{p.nombre}</h3>
                <span className={`estado-chip ${p.estado}`}>{p.estado}</span>
              </div>

              <div className="card-grid">
                
                <div className="card-item">
                  <span>Modalidad</span>
                  <strong>{p.modalidad}</strong>
                </div>
                <div className="card-item">
                  <span>Contrato</span>
                  <strong>{p.tipoContrato}</strong>
                </div>
                <div className="card-item">
                  <span>Comisión</span>
                  <strong>{p.comision}%</strong>
                </div>
              </div>

              <div className="card-actions">
                <button
                  className="btn-ver"
                  onClick={() => setProfesorSeleccionado(p)}
                >
                  Ver
                </button>
                <button
                  className="btn-editar"
                  onClick={() => editarProfesor(p)}
                >
                  Editar
                </button>
                <button
                  className="btn-eliminar"
                  onClick={() => eliminarProfesor(p.id)}
                >
                  Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>

        {profesorSeleccionado && (
          <div
            className="modal-overlay"
            onClick={() => setProfesorSeleccionado(null)}
          >
            <div className="modal-card" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{profesorSeleccionado.nombre}</h2>
                <div className="modal-icons">
                  <span>👨‍🏫</span>
                </div>
              </div>

              <div className="modal-grid">
                <div className="modal-item">
                  <span>Documento</span>
                  <strong>
                    {profesorSeleccionado.tipoDocumento} -{" "}
                    {profesorSeleccionado.numeroDocumento}
                  </strong>
                </div>

         

                <div className="modal-item">
                  <span>Teléfono</span>
                  <strong>{profesorSeleccionado.telefono}</strong>
                </div>

                <div className="modal-item">
                  <span>Especialidad</span>
                  <strong>
 <div className="chips">
  {profesorSeleccionado.especialidades?.map((e) => (
    <span className="chip" key={e}>
      {e.charAt(0).toUpperCase() + e.slice(1)}
    </span>
  ))}
</div>
</strong>
                </div>

                <div className="modal-item">
                  <span>Modalidad</span>
                  <strong>{profesorSeleccionado.modalidad}</strong>
                </div>

                <div className="modal-item">
                  <span>Contrato</span>
                  <strong>{profesorSeleccionado.tipoContrato}</strong>
                </div>

                <div className="modal-item">
                  <span>Comisión</span>
                  <strong>{profesorSeleccionado.comision}%</strong>
                </div>

                <div className="modal-item">
                  <span>Estado</span>
                  <strong>{profesorSeleccionado.estado}</strong>
                </div>

                <div className="modal-item">
                  <span>Observaciones</span>
                  <strong>{profesorSeleccionado.observaciones || "-"}</strong>
                </div>

                <div className="modal-item">
                  <span>Acceso profesor</span>
                  <strong>{profesorSeleccionado.email}</strong>
                </div>

                <div className="modal-item">
                  <span>Clave inicial</span>
                  <strong>{profesorSeleccionado.password}</strong>
                </div>
              </div>

              <button
                className="btn-cerrar"
                onClick={() => setProfesorSeleccionado(null)}
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

export default ProfesoresPage;