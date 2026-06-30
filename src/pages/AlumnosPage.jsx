import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";
import "./AlumnosPage.css";
import { useState, useEffect } from "react";
import CustomSelect from "../components/CustomSelect";
import { supabase } from "../services/supabaseClient";
import { useAuth } from "../context/AuthContext";

function AlumnosPage() {
  const navigate = useNavigate();
  const { user: usuarioActual, role: userRole } = useAuth();

  const handleLogout = () => {
    localStorage.removeItem("auth");
    navigate("/");
  };

  const [alumnos, setAlumnos] = useState([]);
  const [grados, setGrados] = useState([]);
  const [grupos, setGrupos] = useState([]);

  // Estados de formulario
  const [editandoId, setEditandoId] = useState(null);
  
  // Datos personales
  const [nombre, setNombre] = useState("");
  const [tipoDocumento, setTipoDocumento] = useState("ti");
  const [numeroDocumento, setNumeroDocumento] = useState("");
  const [edad, setEdad] = useState("");
  const [telefono, setTelefono] = useState("");
  const [email, setEmail] = useState("");
  
  // Datos escolares
  const [gradoId, setGradoId] = useState("");
  const [grupoId, setGrupoId] = useState("");
  
  // Financiero
  const [valorMatricula, setValorMatricula] = useState("");
  const [valorMensualidad, setValorMensualidad] = useState("");
  const [diaCortePago, setDiaCortePago] = useState("5");
  
  // Acudiente
  const [nombreAcudiente, setNombreAcudiente] = useState("");
  const [telefonoAcudiente, setTelefonoAcudiente] = useState("");
  const [parentescoAcudiente, setParentescoAcudiente] = useState("");
  
  // Médico
  const [tipoSangre, setTipoSangre] = useState("");
  const [alergias, setAlergias] = useState("");
  const [contactoEmergencia, setContactoEmergencia] = useState("");
  
  const [estado, setEstado] = useState("activo");
  const [activeTab, setActiveTab] = useState("registro");
  
  const [alumnoSeleccionado, setAlumnoSeleccionado] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const resAlumnos = await supabase.from("alumnos").select("*").order('created_at', { ascending: false });
      if (resAlumnos.data) setAlumnos(resAlumnos.data);
    } catch (e) {
      console.error("Error fetching alumnos:", e);
    }

    // Sincronizar grados y grupos con lo que el usuario guardó en AcademicoPage (localStorage)
    const DEFAULT_GRADOS = [
      { id: 1, nombre: "Primero" },
      { id: 2, nombre: "Segundo" }
    ];
    const DEFAULT_GRUPOS = [
      { id: 1, grado_id: 1, nombre: "1A" },
      { id: 2, grado_id: 2, nombre: "2A" }
    ];

    const localGrados = JSON.parse(localStorage.getItem("demo_grados")) || DEFAULT_GRADOS;
    const localGrupos = JSON.parse(localStorage.getItem("demo_grupos")) || DEFAULT_GRUPOS;
    
    setGrados(localGrados);
    setGrupos(localGrupos);
  };

  const calcularMora = (diaCorte, ultimoMesPagado) => {
    if (!ultimoMesPagado) return "En Mora"; // Nunca ha pagado
    
    const hoy = new Date();
    const diaActual = hoy.getDate();
    const mesActual = hoy.getMonth() + 1; // 1-12
    const anoActual = hoy.getFullYear();
    
    const fechaUltimoPago = new Date(ultimoMesPagado);
    const mesUltimoPago = fechaUltimoPago.getMonth() + 1;
    const anoUltimoPago = fechaUltimoPago.getFullYear();
    
    // Si pagó el mes actual o uno futuro, está al día
    if (anoUltimoPago > anoActual || (anoUltimoPago === anoActual && mesUltimoPago >= mesActual)) {
      return "Al Día";
    }
    
    // Si el último mes pagado fue el anterior, depende del día de corte
    if (anoUltimoPago === anoActual && mesUltimoPago === mesActual - 1) {
      if (diaActual > (diaCorte || 5)) return "En Mora";
      return "Al Día";
    }
    
    // Si debe 2 o más meses
    return "En Mora";
  };

  const formatearMoneda = (valor) => {
    if (!valor) return "";
    const soloNumeros = valor.toString().replace(/\D/g, "");
    return Number(soloNumeros).toLocaleString("es-CO");
  };

  const limpiarFormulario = () => {
    setNombre(""); setTipoDocumento("ti"); setNumeroDocumento(""); setEdad("");
    setTelefono(""); setEmail(""); setGradoId(""); setGrupoId("");
    setValorMatricula(""); setValorMensualidad(""); setDiaCortePago("5");
    setNombreAcudiente(""); setTelefonoAcudiente(""); setParentescoAcudiente("");
    setTipoSangre(""); setAlergias(""); setContactoEmergencia("");
    setEstado("activo"); setEditandoId(null);
  };

  const agregarAlumno = async () => {
    if (userRole === "consulta") {
      alert("🔒 Seguridad: Tu cuenta tiene permisos de solo consulta.");
      return;
    }

    if (!nombre || !gradoId || !grupoId) {
      alert("Por favor completa el Nombre, Grado y Grupo como mínimo.");
      return;
    }

    const alumnoData = {
      nombre,
      tipo_documento: tipoDocumento,
      numero_documento: numeroDocumento,
      edad: edad,
      telefono: telefono,
      email: email || "sin-email@temp.com",
      
      grado_id: gradoId,
      grupo_id: grupoId,
      
      valor_matricula: Number(valorMatricula.toString().replace(/\D/g, "") || 0),
      valor_mensualidad: Number(valorMensualidad.toString().replace(/\D/g, "") || 0),
      dia_corte_pago: Number(diaCortePago || 5),
      
      nombre_acudiente: nombreAcudiente,
      telefono_acudiente: telefonoAcudiente,
      parentesco_acudiente: parentescoAcudiente,
      
      tipo_sangre: tipoSangre,
      alergias: alergias,
      contacto_emergencia: contactoEmergencia,
      estado
    };

    try {
      if (editandoId !== null) {
        const { error } = await supabase.from("alumnos").update(alumnoData).eq("id", editandoId);
        if (error) throw error;
      } else {
        // Al matricular, asumimos que paga su primer mes o está al día temporalmente
        alumnoData.ultimo_mes_pagado = new Date().toISOString().split('T')[0]; 
        
        const { error } = await supabase.from("alumnos").insert([alumnoData]);
        if (error) throw error;
      }

      fetchData();
      limpiarFormulario();
    } catch (error) {
      console.error("Error guardando alumno:", error);
      alert("Error guardando alumno: " + error.message);
    }
  };

  const editarAlumno = (a) => {
    setNombre(a.nombre || "");
    setTipoDocumento(a.tipo_documento || "ti");
    setNumeroDocumento(a.numero_documento || "");
    setEdad(a.edad || "");
    setTelefono(a.telefono || "");
    setEmail(a.email === "sin-email@temp.com" ? "" : a.email);
    
    setGradoId(a.grado_id || "");
    setGrupoId(a.grupo_id || "");
    
    setValorMatricula(a.valor_matricula ? String(a.valor_matricula) : "");
    setValorMensualidad(a.valor_mensualidad ? String(a.valor_mensualidad) : "");
    setDiaCortePago(a.dia_corte_pago ? String(a.dia_corte_pago) : "5");
    
    setNombreAcudiente(a.nombre_acudiente || "");
    setTelefonoAcudiente(a.telefono_acudiente || "");
    setParentescoAcudiente(a.parentesco_acudiente || "");
    
    setTipoSangre(a.tipo_sangre || "");
    setAlergias(a.alergias || "");
    setContactoEmergencia(a.contacto_emergencia || "");
    
    setEstado(a.estado || "activo");
    setEditandoId(a.id);
    setActiveTab("registro");
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const eliminarAlumno = async (id) => {
    if (userRole === "consulta" || !["owner", "gerente", "admin", "super_admin"].includes(userRole)) {
      alert("No tienes permiso para eliminar alumnos.");
      return;
    }
    if (!window.confirm("¿Estás seguro de retirar o eliminar este alumno del colegio?")) return;
    
    try {
      await supabase.from("alumnos").delete().eq("id", id);
      fetchData();
    } catch (error) {
      console.error("Error eliminando:", error);
    }
  };

  return (
    <div className="dashboard-layout alumnos-page">
      <Sidebar onLogout={handleLogout} />

      <main className="dashboard-main">
        <div className="page-header-tabs">
          <h1>Alumnos Matriculados</h1>
          <div className="alumnos-tabs">
            <button 
              className={`tab-btn ${activeTab === 'registro' ? 'active' : ''}`} 
              onClick={() => setActiveTab('registro')}
            >
              Matrícula / Registro
            </button>
            <button 
              className={`tab-btn ${activeTab === 'lista' ? 'active' : ''}`} 
              onClick={() => setActiveTab('lista')}
            >
              Listado de Alumnos
            </button>
          </div>
        </div>

        {activeTab === 'registro' && (
        <div className="colegio-form-container">
          <h3>{editandoId ? "Editar Estudiante" : "Nueva Matrícula"}</h3>
          
          <div className="form-grid">
            <div className="form-section">
              <h4>Datos Personales</h4>
              <input placeholder="Nombre completo" value={nombre} onChange={e => setNombre(e.target.value)} />
              <CustomSelect
                value={tipoDocumento}
                onChange={e => setTipoDocumento(e.target.value)}
                placeholder="Tipo Doc."
                options={[{value:"ti",label:"T. Identidad"},{value:"cedula",label:"Cédula"},{value:"rc",label:"Registro Civil"},{value:"extranjeria",label:"C. Extranjería"}]}
              />
              <input placeholder="No. Documento" value={numeroDocumento} onChange={e => setNumeroDocumento(e.target.value)} />
              <input placeholder="Edad" type="number" value={edad} onChange={e => setEdad(e.target.value)} />
              <input placeholder="Teléfono" value={telefono} onChange={e => setTelefono(e.target.value)} />
              <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>

            <div className="form-section">
              <h4>Académico & Financiero</h4>
              <CustomSelect
                value={gradoId}
                onChange={e => setGradoId(e.target.value)}
                placeholder="Seleccionar Grado"
                options={grados.map(g => ({value: g.id, label: g.nombre}))}
              />
              <CustomSelect
                value={grupoId}
                onChange={e => setGrupoId(e.target.value)}
                placeholder="Seleccionar Grupo"
                options={grupos.filter(g => g.grado_id === gradoId).map(g => ({value: g.id, label: g.nombre}))}
              />
              <CustomSelect
                value={estado}
                onChange={e => setEstado(e.target.value)}
                placeholder="Estado"
                options={[{value:"activo",label:"Activo"},{value:"retirado",label:"Retirado"},{value:"graduado",label:"Graduado"}]}
              />
              
              <div className="financiero-box">
                <input 
                  placeholder="Valor Matrícula $" 
                  value={formatearMoneda(valorMatricula)}
                  onChange={e => setValorMatricula(e.target.value)}
                />
                <input 
                  placeholder="Mensualidad (Pensión) $" 
                  value={formatearMoneda(valorMensualidad)}
                  onChange={e => setValorMensualidad(e.target.value)}
                />
                <input 
                  placeholder="Día límite pago mensual (1-31)" 
                  type="number" min="1" max="31"
                  value={diaCortePago}
                  onChange={e => setDiaCortePago(e.target.value)}
                />
              </div>
            </div>

            <div className="form-section">
              <h4>Acudiente & Salud</h4>
              <input placeholder="Nombre Acudiente" value={nombreAcudiente} onChange={e => setNombreAcudiente(e.target.value)} />
              <input placeholder="Parentesco (Ej. Madre)" value={parentescoAcudiente} onChange={e => setParentescoAcudiente(e.target.value)} />
              <input placeholder="Teléfono Acudiente" value={telefonoAcudiente} onChange={e => setTelefonoAcudiente(e.target.value)} />
              
              <input placeholder="Tipo de Sangre" value={tipoSangre} onChange={e => setTipoSangre(e.target.value)} />
              <input placeholder="Alergias" value={alergias} onChange={e => setAlergias(e.target.value)} />
              <input placeholder="Contacto Emergencia" value={contactoEmergencia} onChange={e => setContactoEmergencia(e.target.value)} />
            </div>
          </div>

          <div className="form-actions">
            {editandoId && <button type="button" className="btn-outline" onClick={limpiarFormulario}>Cancelar Edición</button>}
            <button type="button" className="btn-primary" onClick={agregarAlumno}>{editandoId ? "Guardar Cambios" : "Matricular Alumno"}</button>
          </div>
        </div>
        )}

        {activeTab === 'lista' && (
        <div className="tabla-container">
          <table className="tabla-pagos">
            <thead>
              <tr>
                <th>Estudiante</th>
                <th>Grado / Grupo</th>
                <th>Acudiente</th>
                <th>Mensualidad</th>
                <th>Estado Financiero</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody className="tabla-desktop">
              {alumnos.map((a) => {
                const grado = grados.find(g => g.id === a.grado_id)?.nombre || "-";
                const grupo = grupos.find(g => g.id === a.grupo_id)?.nombre || "-";
                const estadoMora = calcularMora(a.dia_corte_pago, a.ultimo_mes_pagado);
                
                return (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.nombre}</strong><br/>
                      <small style={{color: '#64748B'}}>{a.tipo_documento.toUpperCase()} {a.numero_documento}</small>
                    </td>
                    <td>{grado}<br/><small style={{color: '#64748B'}}>Grupo {grupo}</small></td>
                    <td>
                      {a.nombre_acudiente || "-"}<br/>
                      <small style={{color: '#64748B'}}>{a.telefono_acudiente}</small>
                    </td>
                    <td>
                      <span className="badge-precio">${Number(a.valor_mensualidad || 0).toLocaleString()}</span>
                    </td>
                    <td>
                      <span className={`badge-estado ${estadoMora === 'En Mora' ? 'danger' : 'success'}`}>
                        {estadoMora}
                      </span>
                    </td>
                    <td>
                      <div className="acciones-grupo">
                        <button className="btn-ver" onClick={() => setAlumnoSeleccionado(a)}>Ver</button>
                        <button className="btn-editar" onClick={() => editarAlumno(a)}>Editar</button>
                        {userRole === "owner" && (
                          <button className="btn-eliminar btn-icon" onClick={() => eliminarAlumno(a.id)}>🗑</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              
              {alumnos.length === 0 && (
                <tr>
                  <td colSpan="6" style={{textAlign: 'center', padding: '40px', color: '#64748B'}}>
                    No hay estudiantes matriculados en el sistema. Utiliza el formulario superior para crear la primera matrícula.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        )}

        {/* MODAL DE EXPEDIENTE */}
        {alumnoSeleccionado && (
          <div className="modal-overlay" onClick={() => setAlumnoSeleccionado(null)}>
            <div className="modal-content expediente-modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Expediente Académico</h2>
                <button className="btn-close" onClick={() => setAlumnoSeleccionado(null)}>×</button>
              </div>
              <div className="modal-body-scroll">
                <h3>{alumnoSeleccionado.nombre}</h3>
                
                <div className="expediente-grid">
                  <div className="exp-section">
                    <h4>Identificación</h4>
                    <p><strong>Documento:</strong> {alumnoSeleccionado.numero_documento} ({alumnoSeleccionado.tipo_documento.toUpperCase()})</p>
                    <p><strong>Edad:</strong> {alumnoSeleccionado.edad || "-"}</p>
                    <p><strong>Teléfono:</strong> {alumnoSeleccionado.telefono || "-"}</p>
                    <p><strong>Estado:</strong> <span style={{textTransform:'capitalize'}}>{alumnoSeleccionado.estado}</span></p>
                  </div>
                  
                  <div className="exp-section">
                    <h4>Académico & Financiero</h4>
                    <p><strong>Grado:</strong> {grados.find(g => g.id === alumnoSeleccionado.grado_id)?.nombre || "-"}</p>
                    <p><strong>Grupo:</strong> {grupos.find(g => g.id === alumnoSeleccionado.grupo_id)?.nombre || "-"}</p>
                    <p><strong>Matrícula:</strong> ${Number(alumnoSeleccionado.valor_matricula || 0).toLocaleString()}</p>
                    <p><strong>Pensión:</strong> ${Number(alumnoSeleccionado.valor_mensualidad || 0).toLocaleString()}</p>
                    <p><strong>Día de corte:</strong> {alumnoSeleccionado.dia_corte_pago || 5} de cada mes</p>
                  </div>

                  <div className="exp-section full-width">
                    <h4>Acudiente y Salud</h4>
                    <div style={{display: 'flex', gap: '20px', flexWrap: 'wrap'}}>
                      <div style={{flex:1, minWidth:'200px'}}>
                        <p><strong>Nombre:</strong> {alumnoSeleccionado.nombre_acudiente || "-"}</p>
                        <p><strong>Parentesco:</strong> {alumnoSeleccionado.parentesco_acudiente || "-"}</p>
                        <p><strong>Teléfono:</strong> {alumnoSeleccionado.telefono_acudiente || "-"}</p>
                      </div>
                      <div style={{flex:1, minWidth:'200px'}}>
                        <p><strong>Tipo Sangre:</strong> {alumnoSeleccionado.tipo_sangre || "-"}</p>
                        <p><strong>Alergias:</strong> {alumnoSeleccionado.alergias || "-"}</p>
                        <p><strong>Emergencia:</strong> {alumnoSeleccionado.contacto_emergencia || "-"}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn-outline" onClick={() => setAlumnoSeleccionado(null)}>Cerrar</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default AlumnosPage;