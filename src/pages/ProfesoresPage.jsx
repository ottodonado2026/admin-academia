import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import "./ProfesoresPage.css";
// Reutilizamos los estilos base del colegio importando AlumnosPage.css
import "./AlumnosPage.css"; 
import { supabase } from "../services/supabaseClient";
import { useAuth } from "../context/AuthContext";
import { registrarAuditoria } from "../services/auditoriaService";
import CustomSelect from "../components/CustomSelect";

function ProfesoresPage() {
  const navigate = useNavigate();
  const { user: usuarioActual, role: userRole } = useAuth();
  
  const [activeTab, setActiveTab] = useState("registro");
  const [profesores, setProfesores] = useState([]);
  
  // Datos Personales
  const [nombre, setNombre] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState("cc");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  
  // Perfil Escolar
  const [temas, setTemas] = useState(""); 
  const [esquemaTrabajo, setEsquemaTrabajo] = useState("tiempo_completo");
  const [jornada, setJornada] = useState("completa");
  const [horasDadas, setHorasDadas] = useState("");
  const [estado, setEstado] = useState("activo");
  
  // Seguimiento & Vacaciones
  const [seguimiento, setSeguimiento] = useState("");
  const [vacacionesInicio, setVacacionesInicio] = useState("");
  const [vacacionesFin, setVacacionesFin] = useState("");
  
  const [password, setPassword] = useState("");

  const [editandoId, setEditandoId] = useState(null);
  const [profesorSeleccionado, setProfesorSeleccionado] = useState(null);

  const handleLogout = () => {
    localStorage.removeItem("auth");
    navigate("/");
  };

  useEffect(() => {
    cargarProfesores();
  }, []);

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
  };

  const limpiarFormulario = () => {
    setNombre(""); setTipoDocumento("cc"); setNumeroDocumento("");
    setTelefono(""); setEmail(""); setTemas(""); setEsquemaTrabajo("tiempo_completo");
    setJornada("completa"); setHorasDadas(""); setEstado("activo");
    setSeguimiento(""); setVacacionesInicio(""); setVacacionesFin("");
    setPassword(""); setEditandoId(null);
  };

  const agregarProfesor = async () => {
    const puedeEditarProf = ["owner", "admin", "coordinador_academico", "gerente", "super_admin"].includes(userRole);
    if (!puedeEditarProf) {
      alert("🔒 No tienes permiso para agregar o editar docentes.");
      return;
    }

    if (!editandoId && profesores.length >= 7) {
      alert("⚠️ Límite de docentes alcanzado. Actualmente solo puedes registrar 7 docentes.");
      return;
    }

    if (!nombre.trim() || !numeroDocumento.trim()) {
      alert("El nombre y número de documento son obligatorios.");
      return;
    }

    if (!editandoId && (!password || password.length < 6)) {
      alert("Debes asignar una contraseña inicial de al menos 6 caracteres.");
      return;
    }

    const payload = {
      nombre: nombre.trim(),
      tipoDocumento,
      numeroDocumento: numeroDocumento.trim(),
      telefono: telefono.trim(),
      email: email.trim(),
      temas: temas.trim(),
      esquemaTrabajo,
      jornada,
      horasDadas: Number(horasDadas) || 0,
      estado,
      seguimiento: seguimiento.trim(),
      vacacionesInicio,
      vacacionesFin,
      updatedAt: new Date().toISOString(),
    };

    try {
      if (editandoId) {
        // ACTUALIZAR
        const { error } = await supabase
          .from("profesores")
          .update({ data: payload })
          .eq("id", editandoId);
          
        if (error) throw error;
        await registrarAuditoria("editar", "docentes", editandoId, { cambios: payload }, usuarioActual);
      } else {
        // CREAR NUEVO
        const emailProfe = email.trim() || `${numeroDocumento.trim()}@colegio.com`;
        
        // Registrar en auth mediante edge function
        const { error: funcError } = await supabase.functions.invoke(
          "crear-coordinador-academico",
          {
            body: {
              nombre: payload.nombre,
              email: emailProfe,
              password: password,
              role: "profesor",
              tipo_documento: payload.tipoDocumento,
              numero_documento: payload.numeroDocumento,
              telefono: payload.telefono,
              estado: payload.estado,
              observaciones: "Creado por coordinador",
            }
          }
        );

        if (funcError) {
          throw new Error("Error creando credenciales: " + (funcError.message || ""));
        }

        const { data: userData } = await supabase
          .from("usuarios")
          .select("id")
          .eq("email", emailProfe)
          .maybeSingle();

        const newId = userData?.id || Date.now().toString();

        const { error: dbError } = await supabase
          .from("profesores")
          .insert([{ id: newId, data: payload }]);
          
        if (dbError) throw dbError;
        await registrarAuditoria("crear", "docentes", newId, { datos: payload }, usuarioActual);
      }

      cargarProfesores();
      limpiarFormulario();
      setActiveTab("lista");
    } catch (e) {
      console.error("Error:", e);
      alert("Error al guardar docente: " + e.message);
    }
  };

  const editarProfesor = (p) => {
    setNombre(p.nombre || "");
    setTipoDocumento(p.tipoDocumento || "cc");
    setNumeroDocumento(p.numeroDocumento || "");
    setTelefono(p.telefono || "");
    setEmail(p.email || "");
    setTemas(p.temas || "");
    setEsquemaTrabajo(p.esquemaTrabajo || "tiempo_completo");
    setJornada(p.jornada || "completa");
    setHorasDadas(p.horasDadas || "");
    setEstado(p.estado || "activo");
    setSeguimiento(p.seguimiento || "");
    setVacacionesInicio(p.vacacionesInicio || "");
    setVacacionesFin(p.vacacionesFin || "");
    
    setEditandoId(p.id);
    setActiveTab("registro");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const eliminarProfesor = async (id) => {
    const puedeEliminar = ["owner", "admin", "super_admin"].includes(userRole);
    if (!puedeEliminar) {
      alert("No tienes permiso para eliminar docentes.");
      return;
    }
    if (!window.confirm("¿Seguro que deseas eliminar a este docente? (Se requiere eliminar el usuario en Auth para limpieza total)")) return;

    try {
      await supabase.from("profesores").delete().eq("id", id);
      cargarProfesores();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="dashboard-layout docentes-page alumnos-page">
      <Sidebar onLogout={handleLogout} />

      <main className="dashboard-main">
        <div className="page-header-tabs">
          <div className="header-info">
            <h1>Staff Docente</h1>
            <span className="cupo-badge">
              {profesores.length} de 7 Docentes Activos
            </span>
          </div>
          <div className="alumnos-tabs">
            <button 
              className={`tab-btn ${activeTab === 'registro' ? 'active' : ''}`} 
              onClick={() => setActiveTab('registro')}
            >
              Registro Docente
            </button>
            <button 
              className={`tab-btn ${activeTab === 'lista' ? 'active' : ''}`} 
              onClick={() => setActiveTab('lista')}
            >
              Listado de Docentes
            </button>
          </div>
        </div>

        {activeTab === 'registro' && (
        <div className="colegio-form-container">
          <h3>{editandoId ? "Editar Docente" : "Registrar Nuevo Docente"}</h3>
          
          <div className="form-grid">
            <div className="form-section">
              <h4>Datos Personales</h4>
              <input placeholder="Nombre completo" value={nombre} onChange={e => setNombre(e.target.value)} />
              <CustomSelect
                value={tipoDocumento}
                onChange={e => setTipoDocumento(e.target.value)}
                placeholder="Tipo Doc."
                options={[{value:"cc",label:"Cédula"},{value:"ce",label:"C. Extranjería"},{value:"passport",label:"Pasaporte"}]}
              />
              <input placeholder="No. Documento" value={numeroDocumento} onChange={e => setNumeroDocumento(e.target.value)} />
              <input placeholder="Teléfono" value={telefono} onChange={e => setTelefono(e.target.value)} />
              <input placeholder="Email institucional o personal" value={email} onChange={e => setEmail(e.target.value)} />
              
              {!editandoId && (
                <input placeholder="Contraseña de Acceso" type="password" value={password} onChange={e => setPassword(e.target.value)} />
              )}
            </div>

            <div className="form-section">
              <h4>Perfil Académico</h4>
              <input placeholder="Asignaturas que domina (Ej. Matemáticas, Física)" value={temas} onChange={e => setTemas(e.target.value)} />
              <CustomSelect
                value={esquemaTrabajo}
                onChange={e => setEsquemaTrabajo(e.target.value)}
                placeholder="Esquema Trabajo"
                options={[
                  {value:"tiempo_completo",label:"Tiempo Completo"},
                  {value:"medio_tiempo",label:"Medio Tiempo"},
                  {value:"catedra",label:"Profesor Cátedra"}
                ]}
              />
              <CustomSelect
                value={jornada}
                onChange={e => setJornada(e.target.value)}
                placeholder="Jornada"
                options={[
                  {value:"manana",label:"Mañana"},
                  {value:"tarde",label:"Tarde"},
                  {value:"completa",label:"Completa (Única)"}
                ]}
              />
              <input type="number" placeholder="Horas dadas por semana" value={horasDadas} onChange={e => setHorasDadas(e.target.value)} />
              <CustomSelect
                value={estado}
                onChange={e => setEstado(e.target.value)}
                placeholder="Estado"
                options={[
                  {value:"activo",label:"Activo"},
                  {value:"permiso",label:"En Permiso / Incapacidad"},
                  {value:"retirado",label:"Retirado"}
                ]}
              />
            </div>

            <div className="form-section">
              <h4>Desempeño y Vacaciones</h4>
              <textarea 
                className="seguimiento-textarea"
                placeholder="Anotaciones de seguimiento o desempeño..." 
                value={seguimiento} 
                onChange={e => setSeguimiento(e.target.value)}
              />
              
              <div className="vacaciones-box">
                <label>Periodo de Vacaciones Programadas:</label>
                <div style={{display:'flex', gap:'10px'}}>
                  <input type="date" value={vacacionesInicio} onChange={e => setVacacionesInicio(e.target.value)} title="Inicio" />
                  <input type="date" value={vacacionesFin} onChange={e => setVacacionesFin(e.target.value)} title="Fin" />
                </div>
              </div>
            </div>
          </div>

          <div className="form-actions">
            {editandoId && <button type="button" className="btn-outline" onClick={limpiarFormulario}>Cancelar Edición</button>}
            <button 
              type="button" 
              className="btn-primary" 
              onClick={agregarProfesor}
              disabled={!editandoId && profesores.length >= 7}
            >
              {editandoId ? "Guardar Cambios" : "Crear Docente"}
            </button>
          </div>
        </div>
        )}

        {activeTab === 'lista' && (
        <div className="tabla-container">
          <table className="tabla-pagos">
            <thead>
              <tr>
                <th>Docente</th>
                <th>Temas</th>
                <th>Jornada</th>
                <th>Horas / sem</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody className="tabla-desktop">
              {profesores.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.nombre}</strong><br/>
                    <small style={{color: '#64748B'}}>{(p.tipoDocumento || "").toUpperCase()} {p.numeroDocumento}</small>
                  </td>
                  <td>{p.temas || "Sin asignar"}</td>
                  <td style={{textTransform:'capitalize'}}>{(p.jornada || "-").replace("_", " ")}</td>
                  <td>{p.horasDadas || 0} h</td>
                  <td>
                    <span className={`badge-estado ${p.estado === 'retirado' ? 'danger' : 'success'}`}>
                      {p.estado}
                    </span>
                  </td>
                  <td>
                    <div className="acciones-grupo">
                      <button className="btn-ver" onClick={() => setProfesorSeleccionado(p)}>Expediente</button>
                      <button className="btn-editar" onClick={() => editarProfesor(p)}>Editar</button>
                      {["owner", "admin", "super_admin"].includes(userRole) && (
                        <button className="btn-eliminar btn-icon" onClick={() => eliminarProfesor(p.id)}>🗑</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              
              {profesores.length === 0 && (
                <tr>
                  <td colSpan="6" style={{textAlign: 'center', padding: '40px', color: '#64748B'}}>
                    No hay docentes registrados. Tienes cupo para 7 docentes.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}

        {/* MODAL EXPEDIENTE DOCENTE */}
        {profesorSeleccionado && (
          <div className="modal-overlay" onClick={() => setProfesorSeleccionado(null)}>
            <div className="modal-content expediente-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Expediente del Docente</h2>
                <button className="btn-close" onClick={() => setProfesorSeleccionado(null)}>×</button>
              </div>
              <div className="modal-body-scroll" style={{padding: '0 20px 20px'}}>
                <h3 style={{marginTop: '10px'}}>{profesorSeleccionado.nombre}</h3>
                
                <div className="expediente-grid">
                  <div className="exp-section">
                    <h4>Datos Personales</h4>
                    <p><strong>Documento:</strong> {profesorSeleccionado.numeroDocumento} ({(profesorSeleccionado.tipoDocumento || "").toUpperCase()})</p>
                    <p><strong>Teléfono:</strong> {profesorSeleccionado.telefono || "-"}</p>
                    <p><strong>Email:</strong> {profesorSeleccionado.email || "-"}</p>
                    <p><strong>Estado:</strong> <span style={{textTransform:'capitalize'}}>{profesorSeleccionado.estado}</span></p>
                  </div>
                  
                  <div className="exp-section">
                    <h4>Perfil Laboral</h4>
                    <p><strong>Esquema:</strong> <span style={{textTransform:'capitalize'}}>{(profesorSeleccionado.esquemaTrabajo || "").replace("_", " ")}</span></p>
                    <p><strong>Jornada:</strong> <span style={{textTransform:'capitalize'}}>{(profesorSeleccionado.jornada || "-").replace("_", " ")}</span></p>
                    <p><strong>Temas/Asignaturas:</strong> {profesorSeleccionado.temas || "-"}</p>
                    <p><strong>Carga Horaria:</strong> {profesorSeleccionado.horasDadas || 0} horas semanales</p>
                  </div>

                  <div className="exp-section full-width">
                    <h4>Seguimiento y Vacaciones</h4>
                    <div style={{display: 'flex', gap: '20px', flexWrap: 'wrap'}}>
                      <div style={{flex:1, minWidth:'250px'}}>
                        <p><strong>Anotaciones de Desempeño:</strong></p>
                        <div style={{background: '#F1F5F9', padding: '10px', borderRadius: '8px', minHeight: '60px', marginTop: '5px'}}>
                          {profesorSeleccionado.seguimiento || "Sin observaciones."}
                        </div>
                      </div>
                      <div style={{flex:1, minWidth:'200px'}}>
                        <p><strong>Próximas Vacaciones:</strong></p>
                        <p><strong>Desde:</strong> {profesorSeleccionado.vacacionesInicio || "No definidas"}</p>
                        <p><strong>Hasta:</strong> {profesorSeleccionado.vacacionesFin || "No definidas"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default ProfesoresPage;