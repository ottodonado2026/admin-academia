import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { config } from "../config/institucion";
import "./AcademicoPage.css";

// Datos iniciales si el localStorage está vacío
const DEFAULT_GRADOS = [
  { id: 1, nombre: "Primero", nivel: "Primaria", orden: 1 },
  { id: 2, nombre: "Segundo", nivel: "Primaria", orden: 2 },
  { id: 3, nombre: "Sexto", nivel: "Bachillerato", orden: 6 }
];

const DEFAULT_GRUPOS = [
  { id: 1, grado_id: 1, nombre: "1A", jornada: "Mañana", cupo: 30, ocupado: 28 },
  { id: 2, grado_id: 1, nombre: "1B", jornada: "Tarde", cupo: 30, ocupado: 15 },
  { id: 3, grado_id: 2, nombre: "2A", jornada: "Mañana", cupo: 30, ocupado: 30 },
];

const DEFAULT_ASIGNATURAS = [
  { id: 1, grado_id: 1, nombre: "Matemáticas", intensidad: 5 },
  { id: 2, grado_id: 1, nombre: "Español", intensidad: 4 },
  { id: 3, grado_id: 2, nombre: "Ciencias Naturales", intensidad: 3 },
];

export default function AcademicoPage() {
  const [activeTab, setActiveTab] = useState("grados"); // grados | asignaturas
  
  // ESTADOS CON PERSISTENCIA EN LOCALSTORAGE PARA MODO DEMO
  const [grados, setGrados] = useState(() => JSON.parse(localStorage.getItem("demo_grados")) || DEFAULT_GRADOS);
  const [grupos, setGrupos] = useState(() => JSON.parse(localStorage.getItem("demo_grupos")) || DEFAULT_GRUPOS);
  const [asignaturas, setAsignaturas] = useState(() => JSON.parse(localStorage.getItem("demo_asignaturas")) || DEFAULT_ASIGNATURAS);

  useEffect(() => {
    localStorage.setItem("demo_grados", JSON.stringify(grados));
    localStorage.setItem("demo_grupos", JSON.stringify(grupos));
    localStorage.setItem("demo_asignaturas", JSON.stringify(asignaturas));
  }, [grados, grupos, asignaturas]);

  // ESTADOS PARA FORMULARIO GRADOS
  const [nuevoGrado, setNuevoGrado] = useState("");
  const [nuevoNivel, setNuevoNivel] = useState("Primaria");

  // ESTADOS PARA MODAL GRUPO
  const [showModalGrupo, setShowModalGrupo] = useState(false);
  const [gradoSeleccionado, setGradoSeleccionado] = useState(null);
  const [formGrupo, setFormGrupo] = useState({ nombre: "", jornada: "Mañana", cupo: 30 });

  // ESTADOS PARA MODAL ASIGNATURA
  const [showModalAsignatura, setShowModalAsignatura] = useState(false);
  const [formAsignatura, setFormAsignatura] = useState({ nombre: "", intensidad: 4 });


  // --- ACCIONES GRADOS ---
  const handleAddGrado = () => {
    if(!nuevoGrado.trim()) return;
    const newId = Date.now();
    setGrados([...grados, { id: newId, nombre: nuevoGrado.trim(), nivel: nuevoNivel, orden: newId }]);
    setNuevoGrado("");
  };

  const handleDeleteGrado = (id) => {
    if(window.confirm("¿Estás seguro de eliminar este grado? Se eliminarán también sus grupos y materias.")) {
      setGrados(grados.filter(g => g.id !== id));
      setGrupos(grupos.filter(g => g.grado_id !== id));
      setAsignaturas(asignaturas.filter(a => a.grado_id !== id));
    }
  };

  // --- ACCIONES GRUPOS ---
  const openModalGrupo = (grado) => {
    setGradoSeleccionado(grado);
    setFormGrupo({ nombre: "", jornada: "Mañana", cupo: 30 });
    setShowModalGrupo(true);
  };

  const handleAddGrupo = (e) => {
    e.preventDefault();
    if(!formGrupo.nombre.trim()) return;
    const newId = Date.now();
    setGrupos([...grupos, { 
      id: newId, 
      grado_id: gradoSeleccionado.id, 
      nombre: formGrupo.nombre.trim(), 
      jornada: formGrupo.jornada, 
      cupo: parseInt(formGrupo.cupo) || 30, 
      ocupado: 0 
    }]);
    setShowModalGrupo(false);
  };

  const handleDeleteGrupo = (id) => {
    if(window.confirm("¿Estás seguro de eliminar este grupo?")) {
      setGrupos(grupos.filter(g => g.id !== id));
    }
  };

  // --- ACCIONES ASIGNATURAS ---
  const openModalAsignatura = (grado) => {
    setGradoSeleccionado(grado);
    setFormAsignatura({ nombre: "", intensidad: 4 });
    setShowModalAsignatura(true);
  };

  const handleAddAsignatura = (e) => {
    e.preventDefault();
    if(!formAsignatura.nombre.trim()) return;
    const newId = Date.now();
    setAsignaturas([...asignaturas, { 
      id: newId, 
      grado_id: gradoSeleccionado.id, 
      nombre: formAsignatura.nombre.trim(), 
      intensidad: parseInt(formAsignatura.intensidad) || 4 
    }]);
    setShowModalAsignatura(false);
  };

  const handleDeleteAsignatura = (id) => {
    if(window.confirm("¿Estás seguro de eliminar esta asignatura?")) {
      setAsignaturas(asignaturas.filter(a => a.id !== id));
    }
  };


  return (
    <div className="dashboard-layout academico-page">
      <Sidebar />
      <main className="dashboard-main">
        <header className="academico-header">
          <div>
            <h1>Estructura Académica</h1>
            <p>Configura los grados, grupos, jornadas y plan de estudios de {config.nombre}</p>
          </div>
        </header>

        <div className="tabs-academico">
          <button 
            className={`tab-btn ${activeTab === "grados" ? "active" : ""}`}
            onClick={() => setActiveTab("grados")}
          >
            Grados y Grupos
          </button>
          <button 
            className={`tab-btn ${activeTab === "asignaturas" ? "active" : ""}`}
            onClick={() => setActiveTab("asignaturas")}
          >
            Malla Curricular (Materias)
          </button>
        </div>

        <div className="academico-content">
          {/* ======================= PESTAÑA GRADOS ======================= */}
          {activeTab === "grados" && (
            <div className="tab-pane-grados">
              
              <div className="form-group-inline">
                <input 
                  type="text" 
                  placeholder="Nombre del nuevo grado (Ej. Tercero)" 
                  value={nuevoGrado} 
                  onChange={(e) => setNuevoGrado(e.target.value)} 
                />
                <select value={nuevoNivel} onChange={(e) => setNuevoNivel(e.target.value)}>
                  <option value="Preescolar">Preescolar</option>
                  <option value="Primaria">Primaria</option>
                  <option value="Bachillerato">Bachillerato</option>
                </select>
                <button className="btn-primary" onClick={handleAddGrado}>+ Añadir Grado</button>
              </div>

              <div className="grid-cards">
                {grados.map(grado => {
                  const gruposDelGrado = grupos.filter(g => g.grado_id === grado.id);
                  return (
                    <div key={grado.id} className="academico-card">
                      <h3>
                        <span>
                          {grado.nombre} 
                          <span className="badge-tag" style={{marginLeft: "10px"}}>{grado.nivel}</span>
                        </span>
                        <button className="btn-icon-delete" onClick={() => handleDeleteGrado(grado.id)}>×</button>
                      </h3>
                      
                      <ul className="lista-subitems">
                        {gruposDelGrado.length === 0 && (
                          <li style={{color: "var(--text-muted)", fontSize: "13px", padding: "10px 0"}}>
                            No hay grupos en este grado.
                          </li>
                        )}
                        {gruposDelGrado.map(grupo => (
                          <li key={grupo.id} className="subitem">
                            <div className="subitem-info">
                              <strong>Grupo {grupo.nombre}</strong>
                              <small>Jornada {grupo.jornada}</small>
                            </div>
                            <div className="subitem-info" style={{alignItems: 'flex-end', gap: '4px'}}>
                              <span style={{color: grupo.ocupado >= grupo.cupo ? "#e11d48" : "var(--primary)", fontWeight: "600"}}>
                                {grupo.ocupado}/{grupo.cupo} <span style={{fontSize: '11px', color: 'var(--text-muted)', fontWeight: '400'}}>Cupos</span>
                              </span>
                              <button className="text-danger" onClick={() => handleDeleteGrupo(grupo.id)}>Eliminar</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                      
                      <button className="btn-agregar" onClick={() => openModalGrupo(grado)}>
                        + Añadir Grupo
                      </button>
                    </div>
                  )
                })}
              </div>

            </div>
          )}

          {/* ======================= PESTAÑA ASIGNATURAS ======================= */}
          {activeTab === "asignaturas" && (
            <div className="tab-pane-asignaturas">
               <p style={{marginBottom: "20px", color: "var(--text-muted)"}}>
                 Define las materias o asignaturas que se dictan en cada grado. Estas materias aparecerán luego al asignar carga académica a los profesores.
               </p>

               <div className="grid-cards">
                {grados.map(grado => {
                  const materias = asignaturas.filter(a => a.grado_id === grado.id);
                  return (
                    <div key={grado.id} className="academico-card">
                      <h3>{grado.nombre}</h3>
                      <ul className="lista-subitems">
                        {materias.length === 0 && (
                          <li style={{color: "var(--text-muted)", fontSize: "13px", padding: "10px 0"}}>
                            Sin asignaturas configuradas.
                          </li>
                        )}
                        {materias.map(mat => (
                          <li key={mat.id} className="subitem">
                            <div className="subitem-info">
                              <strong>{mat.nombre}</strong>
                            </div>
                            <div className="subitem-info" style={{alignItems: 'flex-end', gap: '4px'}}>
                              <small>{mat.intensidad} horas/sem</small>
                              <button className="text-danger" onClick={() => handleDeleteAsignatura(mat.id)}>Quitar</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                      <button className="btn-agregar" onClick={() => openModalAsignatura(grado)}>
                        + Añadir Materia
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ======================= MODALES ======================= */}

      {showModalGrupo && (
        <div className="modal-overlay" onClick={() => setShowModalGrupo(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Añadir Grupo a {gradoSeleccionado?.nombre}</h2>
              <button className="btn-close" onClick={() => setShowModalGrupo(false)}>×</button>
            </div>
            <form onSubmit={handleAddGrupo}>
              <div className="form-group">
                <label>Nombre del Grupo (Ej. A, B, 1A)</label>
                <input 
                  type="text" 
                  required 
                  value={formGrupo.nombre} 
                  onChange={(e) => setFormGrupo({...formGrupo, nombre: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Jornada</label>
                <select value={formGrupo.jornada} onChange={(e) => setFormGrupo({...formGrupo, jornada: e.target.value})}>
                  <option value="Mañana">Mañana</option>
                  <option value="Tarde">Tarde</option>
                  <option value="Única">Única</option>
                  <option value="Sabatina">Sabatina</option>
                </select>
              </div>
              <div className="form-group">
                <label>Cupo Máximo</label>
                <input 
                  type="number" 
                  min="1" 
                  required 
                  value={formGrupo.cupo} 
                  onChange={(e) => setFormGrupo({...formGrupo, cupo: e.target.value})} 
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-outline" onClick={() => setShowModalGrupo(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Guardar Grupo</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showModalAsignatura && (
        <div className="modal-overlay" onClick={() => setShowModalAsignatura(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Añadir Materia a {gradoSeleccionado?.nombre}</h2>
              <button className="btn-close" onClick={() => setShowModalAsignatura(false)}>×</button>
            </div>
            <form onSubmit={handleAddAsignatura}>
              <div className="form-group">
                <label>Nombre de la Asignatura</label>
                <input 
                  type="text" 
                  required 
                  placeholder="Ej. Matemáticas, Biología..."
                  value={formAsignatura.nombre} 
                  onChange={(e) => setFormAsignatura({...formAsignatura, nombre: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Intensidad Horaria (Horas por semana)</label>
                <input 
                  type="number" 
                  min="1" 
                  required 
                  value={formAsignatura.intensidad} 
                  onChange={(e) => setFormAsignatura({...formAsignatura, intensidad: e.target.value})} 
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-outline" onClick={() => setShowModalAsignatura(false)}>Cancelar</button>
                <button type="submit" className="btn-primary">Añadir Materia</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
