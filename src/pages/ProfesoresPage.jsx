import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import "./ProfesoresPage.css";
import { supabase } from "../services/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { registrarAuditoria } from "../services/auditoriaService";

function generarIdProfesorAleatorio(profesoresExistentes) {
  let idCandidate = "";
  let isUnique = false;
  let attempts = 0;
  while (!isUnique && attempts < 1000) {
    idCandidate = String(Math.floor(1000 + Math.random() * 9000));
    isUnique = !profesoresExistentes.some(p => String(p.id) === idCandidate);
    attempts++;
  }
  return idCandidate || String(Date.now()).slice(-4);
}

function ProfesoresPage() {
  const navigate = useNavigate();
  const { user: usuarioActual, role: userRole } = useAuth();
  const STORAGE_KEY = "profesores";
 const ESPECIALIDADES = [
  "produccion",
  "dj",
  "guitarra",
  "piano",
  "canto"
];

  const [profesores, setProfesores] = useState([]);

  const [nombre, setNombre] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState("");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [telefono, setTelefono] = useState("");
  const [especialidades, setEspecialidades] = useState([]);  const [modalidad, setModalidad] = useState("");
  const [tipoContrato, setTipoContrato] = useState("");
  const [comision, setComision] = useState("");
  const [estado, setEstado] = useState("activo");
  const [observaciones, setObservaciones] = useState("");
  
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [editandoId, setEditandoId] = useState(null);
  const [profesorSeleccionado, setProfesorSeleccionado] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [salario, setSalario] = useState("");

  const [usuarioProfesor, setUsuarioProfesor] = useState(null);
const [clasesProfesor, setClasesProfesor] = useState([]);
const [cargandoClases, setCargandoClases] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profesores));
  }, [profesores]);


  useEffect(() => {
  const cargarClasesDelProfesor = async () => {
    setCargandoClases(true);

    try {
      const { data: authData } = await supabase.auth.getUser();
      const authUser = authData?.user || null;

      if (!authUser) {
        setCargandoClases(false);
        return;
      }

      const { data: profesorData, error: profesorError } = await supabase
        .from("profesores")
        .select("*")
        .eq("data->>email", authUser.email)
        .maybeSingle();

      if (profesorError) {
        console.error("Error cargando profesor actual:", profesorError);
        setCargandoClases(false);
        return;
      }

      if (!profesorData) {
        setCargandoClases(false);
        return;
      }

      const profesorActual = {
        id: profesorData.id,
        ...(profesorData.data || {}),
      };

      setUsuarioProfesor(profesorActual);

      const { data: clasesData, error: clasesError } = await supabase
        .from("clases")
        .select("*")
        .or(
          `profesor_db_id.eq.${profesorActual.id},profesor_id.eq.${profesorActual.id}`
        )
        .order("fecha", { ascending: false });

      if (clasesError) {
        console.error("Error cargando clases del profesor:", clasesError);
        setClasesProfesor([]);
        return;
      }

      setClasesProfesor(clasesData || []);
    } catch (error) {
      console.error("Error inesperado cargando clases del profesor:", error);
    } finally {
      setCargandoClases(false);
    }
  };

  cargarClasesDelProfesor();
}, []);

useEffect(() => {
  const interval = setInterval(() => {
    clasesProfesor.forEach(async (clase) => {
      if (clase.estado !== "en_curso") return;

      if (!clase.fecha || !clase.hora_fin) return;

      const ahora = new Date();

      const fechaFinClase = new Date(
        `${clase.fecha}T${clase.hora_fin}`
      );

      if (ahora >= fechaFinClase) {
        await finalizarClase(clase, "automatico");
      }
    });
  }, 30000);

  return () => clearInterval(interval);
}, [clasesProfesor]);

  useEffect(() => {
  const cargarProfesores = async () => {
    const { data, error } = await supabase
      .from("profesores")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error cargando profesores:", error);
      return;
    }

    const formateados = data.map(p => ({
      id: p.id,
      ...p.data
    }));

    setProfesores(formateados);

    // Auto-migración en segundo plano de profesores legacy a Supabase Auth
    try {
      const { data: usuariosList } = await supabase
        .from("usuarios")
        .select("email")
        .eq("role", "profesor");

      const emailsConAuth = new Set((usuariosList || []).map(u => u.email?.toLowerCase()));

      for (const p of data) {
        const pData = p.data || {};
        const email = pData.email || `${pData.numeroDocumento}@profe.com`;
        
        if (!emailsConAuth.has(email.toLowerCase())) {
          console.log("Migrando profesor heredado a Supabase Auth:", email);
          const password = pData.password || pData.numeroDocumento || "12345678";
          
          await supabase.functions.invoke("crear-coordinador-academico", {
            body: {
              nombre: pData.nombre || "Profesor",
              email: email,
              password: password,
              role: "profesor",
              tipo_documento: pData.tipoDocumento || "CC",
              numero_documento: pData.numeroDocumento || "",
              telefono: pData.telefono || "",
              estado: pData.estado || "activo",
              observaciones: "Migrado automáticamente por el sistema",
            }
          });
        }
      }
    } catch (e) {
      console.error("Error en migración automática de profesores:", e);
    }
  };

  cargarProfesores();
}, []);
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
    setPassword("");
    setConfirmPassword("");
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

    if (!editandoId) {
      if (!password || password.length < 6) {
        alert("La contraseña es obligatoria y debe tener al menos 6 caracteres");
        return false;
      }
      if (password !== confirmPassword) {
        alert("Las contraseñas no coinciden");
        return false;
      }
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

  const agregarProfesor = async () => {
    const puedeEditarProf = ["owner", "admin", "coordinador_academico"].includes(userRole);
    if (!puedeEditarProf) {
      alert("No tienes permiso para agregar o editar profesores.");
      return;
    }

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
      
      const profAEditar = profesores.find(p => p.id === editandoId);
      if (profAEditar) {
        const nuevoPayload = {
          ...profAEditar,
          ...payload,
        };
        
        const { error } = await supabase
          .from("profesores")
          .update({
            data: nuevoPayload
          })
          .eq("id", editandoId);
        
        if (error) {
          console.error("Error actualizando profesor en Supabase:", error);
          alert("Error al actualizar profesor en la base de datos");
          return;
        }

        await registrarAuditoria("editar", "profesores", editandoId, {
          cambios: payload
        }, usuarioActual);
      }

      setProfesores(actualizados);
      limpiarFormulario();
      return;
    }

    // Iniciar creación del profesor en Supabase Auth y public.usuarios
    const passwordTemporal = password || payload.numeroDocumento;
    const normalizedName = String(payload.nombre)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
    const emailProfe = `${normalizedName}@caribbeanacademy.com`;

    // Invocar la Edge Function para registrar la cuenta de Auth
    const { data: funcData, error: funcError } = await supabase.functions.invoke(
      "crear-coordinador-academico",
      {
        body: {
          nombre: payload.nombre,
          email: emailProfe,
          password: passwordTemporal,
          role: "profesor",
          tipo_documento: payload.tipoDocumento || "CC",
          numero_documento: payload.numeroDocumento,
          telefono: payload.telefono,
          estado: payload.estado || "activo",
          observaciones: payload.observaciones || "",
        }
      }
    );

    if (funcError || funcData?.error) {
      console.error("Error Edge Function:", funcError || funcData?.error);
      alert("Error registrando profesor en Supabase Auth: " + (funcError?.message || funcData?.error));
      return;
    }

    const authUserId = funcData.user.id;
    const randomId = generarIdProfesorAleatorio(profesores);

    const nuevoProfesor = {
      id: randomId, // 4 dígitos aleatorios
      auth_uid: authUserId, // ID de Auth vinculado
      createdAt: new Date().toISOString(),
      clasesAsignadas: 0,
      alumnosActivos: 0,
      email: emailProfe,
      password: passwordTemporal,
      role: "profesor",
      salario: Number(salario) || 0,
      ...payload,
    };

    // guardar perfil en la tabla profesores en Supabase
    const { error } = await supabase
      .from("profesores")
      .insert([
        {
          id: String(nuevoProfesor.id),
          data: nuevoProfesor
        }
      ]);

    if (error) {
      console.error("Error Supabase (profesor):", error);
      alert("Error guardando el perfil del profesor");
      return;
    }

    await registrarAuditoria("crear", "profesores", randomId, {
      nombre: nuevoProfesor.nombre,
      email: nuevoProfesor.email,
      estado: nuevoProfesor.estado
    }, usuarioActual);

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

  const eliminarProfesor = async (id) => {
    const puedeEliminarProf = ["owner", "coordinador_academico"].includes(userRole);
    if (!puedeEliminarProf) {
      alert("No tienes permiso para eliminar profesores. Solo el Gerente (owner) o Coordinadores Académicos pueden realizar esta acción.");
      return;
    }

    const profesor = profesores.find((p) => p.id === id);
    if (!profesor) return;

    const confirmar = window.confirm(
      `¿Seguro que deseas eliminar a ${profesor.nombre}?`
    );

    if (!confirmar) return;

    const filtrados = profesores.filter((p) => p.id !== id);

    // Eliminar de Supabase profesores
    const { error } = await supabase
      .from("profesores")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error al eliminar profesor de Supabase:", error);
      alert("Error al eliminar el profesor");
      return;
    }

    await registrarAuditoria("eliminar", "profesores", id, {
      nombre: profesor.nombre,
      email: profesor.email
    }, usuarioActual);

    setProfesores(filtrados);

    if (editandoId === id) {
      limpiarFormulario();
      setSalario("");
    }

    if (profesorSeleccionado?.id === id) {
      setProfesorSeleccionado(null);
    }
  };

  const refrescarClasesProfesor = async () => {
  if (!usuarioProfesor?.id) return;

  const { data, error } = await supabase
    .from("clases")
    .select("*")
    .or(
      `profesor_db_id.eq.${usuarioProfesor.id},profesor_id.eq.${usuarioProfesor.id}`
    )
    .order("fecha", { ascending: false });

  if (error) {
    console.error("Error refrescando clases:", error);
    return;
  }

  setClasesProfesor(data || []);
};

const iniciarClase = async (clase) => {
  const { error } = await supabase
    .from("clases")
    .update({
      estado: "en_curso",
      inicio_en: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", clase.id);

  if (error) {
    console.error("Error iniciando clase:", error);
    alert("No se pudo iniciar la clase.");
    return;
  }

  await refrescarClasesProfesor();
};

const finalizarClase = async (clase, finalizadaPor = "profesor") => {
  const { error } = await supabase
    .from("clases")
    .update({
      estado: "finalizada",
      finalizo_en: new Date().toISOString(),
      finalizada_por: finalizadaPor,
      profesor_finalizo_id: usuarioProfesor?.id || null,
      profesor_finalizo_nombre: usuarioProfesor?.nombre || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", clase.id);

  if (error) {
    console.error("Error finalizando clase:", error);
    alert("No se pudo finalizar la clase.");
    return;
  }

  await refrescarClasesProfesor();
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

        <div className="tabla-container" style={{ marginBottom: "24px" }}>
  <h2>Mis clases asignadas</h2>

  {cargandoClases && <p>Cargando clases...</p>}

  {!cargandoClases && clasesProfesor.length === 0 && (
    <p>No tienes clases asignadas todavía.</p>
  )}

 {!cargandoClases && clasesProfesor.length > 0 && (
  <>
    <table className="tabla-profesores">
      <thead>
        <tr>
          <th>Clase</th>
          <th>Fecha</th>
          <th>Horario</th>
          <th>Alumno</th>
          <th>Estado</th>
          <th>Acción</th>
        </tr>
      </thead>

      <tbody>
        {clasesProfesor.map((clase) => (
          <tr key={clase.id}>
            <td>
              <div className="celda-principal">
                <strong>{clase.curso}</strong>
                <span>{clase.formato_clase}</span>
              </div>
            </td>

            <td>{clase.fecha}</td>

            <td>
              {clase.hora} - {clase.hora_fin || "Sin hora fin"}
            </td>

            <td>{clase.alumno_nombre}</td>

            <td>
              <span className={`estado-chip ${clase.estado}`}>
                {clase.estado}
              </span>
            </td>

            <td>
              {clase.estado === "programada" && (
                <button
                  type="button"
                  className="btn-editar"
                  onClick={() => iniciarClase(clase)}
                >
                  Iniciar clase
                </button>
              )}

              {clase.estado === "en_curso" && (
                <button
                  type="button"
                  className="btn-eliminar"
                  onClick={() => finalizarClase(clase, "profesor")}
                >
                  Finalizar clase
                </button>
              )}

              {clase.estado === "finalizada" && (
                <span>Finalizada</span>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>


  <div className="clases-profesor-mobile">
  {clasesProfesor.map((clase) => (
    <div key={clase.id} className="clase-profesor-card">
      <div className="clase-profesor-card-head">
        <div>
          <h3>{clase.curso}</h3>
          <span>{clase.formato_clase || "Clase"}</span>
        </div>

        <span className={`estado-chip ${clase.estado}`}>
          {clase.estado}
        </span>
      </div>

      <div className="clase-profesor-grid">
        <div>
          <span>Fecha</span>
          <strong>{clase.fecha}</strong>
        </div>

        <div>
          <span>Horario</span>
          <strong>
            {clase.hora} - {clase.hora_fin || "Sin hora fin"}
          </strong>
        </div>

        <div>
          <span>Alumno</span>
          <strong>{clase.alumno_nombre}</strong>
        </div>
      </div>

      <div className="clase-profesor-actions">
        {clase.estado === "programada" && (
          <button
            type="button"
            className="btn-editar"
            onClick={() => iniciarClase(clase)}
          >
            Iniciar clase
          </button>
        )}

        {clase.estado === "en_curso" && (
          <button
            type="button"
            className="btn-eliminar"
            onClick={() => finalizarClase(clase, "profesor")}
          >
            Finalizar clase
          </button>
        )}

        {clase.estado === "finalizada" && (
          <span className="clase-finalizada-text">Clase finalizada</span>
        )}
      </div>
    </div>
  ))}
</div>
  </>
)}
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

        {["owner", "admin", "coordinador_academico"].includes(userRole) && (
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

            {!editandoId && (
              <>
                <input
                  type="password"
                  placeholder="Contraseña de acceso"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <input
                  type="password"
                  placeholder="Confirmar contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </>
            )}

            <input
              placeholder="Teléfono"
              value={telefono}
              onChange={(e) => setTelefono(e.target.value)}
            />

            <input
              placeholder="Salario base por hora (ej. 15000)"
              value={salario}
              onChange={(e) => setSalario(e.target.value)}
            />

            <select
              value={modalidad}
              onChange={(e) => setModalidad(e.target.value)}
            >
              <option value="">Modalidad</option>
              <option value="presencial">Presencial</option>
              <option value="virtual">Virtual</option>
              <option value="hibrida">Híbrida</option>
            </select>

            <select
              value={tipoContrato}
              onChange={(e) => setTipoContrato(e.target.value)}
            >
              <option value="">Tipo de contrato</option>
              <option value="prestacion">Prestación de servicios</option>
              <option value="nomina">Nómina</option>
              <option value="horas">Por horas</option>
            </select>

            <input
              placeholder="Porcentaje de comisión (ej. 10)"
              value={comision}
              onChange={(e) => setComision(e.target.value)}
            />

            <select value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="activo">Activo</option>
              <option value="inactivo">Inactivo</option>
            </select>

            <textarea
              placeholder="Observaciones internas"
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              style={{ gridColumn: "span 2", minHeight: "80px" }}
            />

            <div className="especialidades-container" style={{ gridColumn: "span 2" }}>
              <label>Especialidades (materias que dicta):</label>
              <div className="especialidades-grid">
                {ESPECIALIDADES.map((esp) => (
                  <label key={esp} className="chk-label">
                    <input
                      type="checkbox"
                      checked={especialidades.includes(esp)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEspecialidades([...especialidades, esp]);
                        } else {
                          setEspecialidades(especialidades.filter((item) => item !== esp));
                        }
                      }}
                    />
                    {esp.toUpperCase()}
                  </label>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={agregarProfesor}
              className="btn-guardar"
              style={{ gridColumn: "span 2" }}
            >
              {editandoId ? "Guardar cambios" : "Agregar profesor"}
            </button>
          </div>
        )}

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
                    {["owner", "admin", "coordinador_academico"].includes(userRole) && (
                      <button
                        className="btn-editar"
                        onClick={() => editarProfesor(p)}
                      >
                        Editar
                      </button>
                    )}
                    {["owner", "coordinador_academico"].includes(userRole) && (
                      <button
                        className="btn-eliminar"
                        onClick={() => eliminarProfesor(p.id)}
                      >
                        Eliminar
                      </button>
                    )}
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
                 {["owner", "admin", "coordinador_academico"].includes(userRole) && (
                   <button
                     className="btn-editar"
                     onClick={() => editarProfesor(p)}
                   >
                     Editar
                   </button>
                 )}
                 {["owner", "coordinador_academico"].includes(userRole) && (
                   <button
                     className="btn-eliminar"
                     onClick={() => eliminarProfesor(p.id)}
                   >
                     Eliminar
                   </button>
                 )}
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