import { useState } from "react";
import "./ModalExpediente.css";
import { supabase } from "../../services/supabaseClient";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { CURSOS_BASE } from "../../data/cursosBase";

export default function ModalExpediente({ alumno, onClose, clases, onActualizado }) {
  const [seguimiento, setSeguimiento] = useState(alumno.observacion_profesor || "");
  const [guardando, setGuardando] = useState(false);
  const [generando, setGenerando] = useState(false);

  const curso = CURSOS_BASE.find(
    (c) =>
      String(c.id) === String(alumno.cursoId || alumno.curso) ||
      c.nombre.toLowerCase().includes(String(alumno.curso || "").toLowerCase())
  );

  const nombreCurso = curso?.nombre || alumno.curso || "Sin curso";
  let horas = Number(alumno.horas_acumuladas || 0);

  if (horas === 0) {
    horas = clases
      .filter((c) => c.estado === "completada")
      .filter((c) => (c.alumnos || []).some((a) => String(a.id) === String(alumno.id)))
      .reduce((acc, c) => acc + Number(c.duracionHoras || 1), 0);
  }

  let horasTotales = Number(curso?.horasTotales || 24);
  const horasPorModulo = Number(curso?.horasPorModulo || 16);
  const modulos = Number(curso?.modulos || 1);

  if (alumno?.duracion && !isNaN(Number(alumno.duracion))) {
    const meses = Number(alumno.duracion);
    const modalidad = (alumno.modalidad || "regular").toLowerCase();
    const clasesPorMes = curso?.modalidades?.[modalidad] || 4;
    const horasPorClase = (curso?.horasPorModulo / curso?.clasesPorModulo) || 2;
    const horasCalculadas = meses * clasesPorMes * horasPorClase;
    if (horasCalculadas > 0) {
      horasTotales = horasCalculadas;
    }
  }

  const moduloActual = horasTotales > 0
    ? Math.min(modulos, Math.max(1, Math.floor(horas / horasPorModulo) + 1))
    : 1;

  // Habilitar certificado si cumplió las horas de un módulo
  const puedeGenerarCertificado = horas >= horasPorModulo;

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      const alumnoIdDb = alumno.alumno_id || alumno.id;
      const { error } = await supabase
        .from("alumnos")
        .update({ observacion_profesor: seguimiento })
        .eq("id", alumnoIdDb);

      if (error) {
        console.error("No se pudo actualizar en tabla alumnos:", error);
      } else {
        onActualizado && onActualizado();
        onClose();
      }
    } catch (error) {
      console.error(error);
    } finally {
      setGuardando(false);
    }
  };

  const generarCertificadoPDF = async () => {
    setGenerando(true);
    try {
      const certificadoElement = document.getElementById("certificado-template");
      certificadoElement.style.display = "flex";
      
      const canvas = await html2canvas(certificadoElement, { scale: 2 });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "px",
        format: [canvas.width, canvas.height]
      });

      pdf.addImage(imgData, "PNG", 0, 0, canvas.width, canvas.height);
      pdf.save(`Certificado_${alumno.nombre.replace(/\s+/g, "_")}_Modulo_${moduloActual}.pdf`);
      
      certificadoElement.style.display = "none";
    } catch (err) {
      console.error("Error generando PDF", err);
      alert("Hubo un error al generar el certificado.");
    } finally {
      setGenerando(false);
    }
  };

  return (
    <div className="modal-overlay-pro">
      <div className="modal-content-pro modal-expediente">
        <button className="modal-close-pro" onClick={onClose}>×</button>
        <h2 className="modal-title">Expediente del Alumno</h2>

        <div className="expediente-grid">
          <div className="exp-info">
            <h3>{alumno.nombre}</h3>
            <p><strong>Curso:</strong> {nombreCurso}</p>
            <p><strong>Teléfono:</strong> {alumno.telefono || "No registrado"}</p>
            <p><strong>Email:</strong> {alumno.email || "No registrado"}</p>
          </div>
          
          <div className="exp-kpis">
            <div className="mini-kpi">
              <span>Horas</span>
              <strong>{horas} / {horasTotales}</strong>
            </div>
            <div className="mini-kpi">
              <span>Módulo</span>
              <strong>{moduloActual} / {modulos}</strong>
            </div>
          </div>
        </div>

        <div className="seguimiento-section">
          <label>Observaciones / Seguimiento del Profesor</label>
          <textarea 
            rows="5"
            placeholder="Anota aquí el progreso del alumno, dificultades, fortalezas..."
            value={seguimiento}
            onChange={(e) => setSeguimiento(e.target.value)}
          />
        </div>

        <div className="modal-actions-expediente">
          <div className="left-actions">
            <button 
              className="btn-certificado" 
              onClick={generarCertificadoPDF}
              disabled={!puedeGenerarCertificado || generando}
            >
              {generando ? "Generando..." : "Generar Certificado"}
            </button>
            {!puedeGenerarCertificado && <small className="hint-cert">Requiere {horasPorModulo}h</small>}
          </div>

          <div className="right-actions">
            <button className="btn-secundario-pro" onClick={onClose}>Cancelar</button>
            <button className="btn-principal-pro" onClick={handleGuardar} disabled={guardando}>
              {guardando ? "Guardando..." : "Guardar Seguimiento"}
            </button>
          </div>
        </div>

        {/* Plantilla Oculta para el Certificado PDF */}
        <div id="certificado-template" className="certificado-template" style={{ display: 'none' }}>
          <div className="certificado-inner">
            <div className="cert-header">
              <h1>Certificado de Aprobación</h1>
              <p>Otorgado por la Academia</p>
            </div>
            <div className="cert-body">
              <p>Se certifica que el alumno:</p>
              <h2 className="cert-name">{alumno.nombre}</h2>
              <p>ha completado con éxito el <strong>Módulo {moduloActual}</strong> del programa</p>
              <h3 className="cert-course">{nombreCurso}</h3>
              <p className="cert-horas">con una dedicación total de {horas} horas lectivas.</p>
            </div>
            <div className="cert-footer">
              <div className="firma-box">
                <div className="firma-line"></div>
                <span>Dirección Académica</span>
              </div>
              <div className="firma-box">
                <div className="firma-line"></div>
                <span>Profesor</span>
              </div>
            </div>
            <div className="cert-fecha">
              Fecha de emisión: {new Date().toLocaleDateString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
