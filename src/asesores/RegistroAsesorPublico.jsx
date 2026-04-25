import { useMemo, useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "./AsesoresPanelPro.css";

import { generarIdAlumnoBonito, generarIdCurso } from "../utils/idGenerator";
import { supabase } from "../services/supabaseClient";


const LEADS_KEY = "leads";
const ASESORES_KEY = "asesores";
const ALUMNOS_KEY = "alumnos";
const CURSOS_KEY = "planesCursos";

const leerJSON = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key) || "[]");
  } catch {
    return [];
  }
};

const guardarJSON = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};



const generarIdUnico = (prefijo, items = [], key = "alumnoId") => {
  const numerosUsados = items
    .map((item) => item[key] || "")
    .filter((id) => id.startsWith(`${prefijo}-`))
    .map((id) => Number(id.replace(`${prefijo}-`, "")))
    .filter((num) => !Number.isNaN(num));

  const siguienteNumero = numerosUsados.length
    ? Math.max(...numerosUsados) + 1
    : 1;

  return `${prefijo}-${String(siguienteNumero).padStart(3, "0")}`;
};

const normalizarAlumnosGuardados = (data = []) => {
  const normalizados = [];

  data.forEach((alumno, index) => {
    let alumnoId = alumno.alumnoId;

    if (!alumnoId) {
      alumnoId = generarIdUnico("ALU", normalizados, "alumnoId");
    }

    normalizados.push({
      ...alumno,
      id: alumno.id ?? Date.now() + index,
      alumnoId,
      cursoId: alumno.cursoId || alumno.curso || "",
    });
  });

  return normalizados;
};

const obtenerCursosBase = () => {
  const baseCursos = [
    {
      nombre: "Producción musical",
      categoria: "produccion",
      modulos: 12,
      horasPorModulo: 16,
      horasTotales: 192,
      clasesPorModulo: 8,
      modalidades: { regular: 4, intensiva: 8, superintensiva: 16 },
      tipos: {
        personalizado: { precio: 890000, inicio: "1 semana" },
        semi: { precio: 550000, inicio: "1 mes" },
        grupal: { precio: 390000, inicio: "semestre" },
      },
    },
    {
      nombre: "DJ",
      categoria: "dj",
      modulos: 5,
      horasPorModulo: 16,
      horasTotales: 80,
      clasesPorModulo: 8,
      modalidades: { regular: 4, intensiva: 8, superintensiva: 16 },
      tipos: {
        personalizado: { precio: 890000, inicio: "1 semana" },
        semi: { precio: 550000, inicio: "1 mes" },
        grupal: { precio: 390000, inicio: "semestre" },
      },
    },
    {
      nombre: "Piano",
      categoria: "piano",
      modulos: 6,
      horasPorModulo: 16,
      horasTotales: 96,
      clasesPorModulo: 8,
      modalidades: { regular: 4, intensiva: 8, superintensiva: 16 },
      tipos: {
        personalizado: { precio: 690000, inicio: "1 semana" },
        semi: { precio: 490000, inicio: "1 mes" },
        grupal: { precio: 350000, inicio: "semestre" },
      },
    },
    {
      nombre: "Guitarra",
      categoria: "guitarra",
      modulos: 6,
      horasPorModulo: 16,
      horasTotales: 96,
      clasesPorModulo: 8,
      modalidades: { regular: 4, intensiva: 8, superintensiva: 16 },
      tipos: {
        personalizado: { precio: 690000, inicio: "1 semana" },
        semi: { precio: 490000, inicio: "1 mes" },
        grupal: { precio: 350000, inicio: "semestre" },
      },
    },
    {
      nombre: "Técnica vocal",
      categoria: "canto",
      modulos: 3,
      horasPorModulo: 16,
      horasTotales: 48,
      clasesPorModulo: 8,
      modalidades: { regular: 4, intensiva: 8, superintensiva: 16 },
      tipos: {
        personalizado: { precio: 690000, inicio: "1 semana" },
        semi: { precio: 490000, inicio: "1 mes" },
        grupal: { precio: 350000, inicio: "semestre" },
      },
    },
  ];

  const cursosConId = [];
  baseCursos.forEach((cursoItem) => {
    cursosConId.push({
      ...cursoItem,
      id: generarIdCurso(cursoItem.nombre, cursosConId),
    });
  });

  return cursosConId;
};


function RegistroAsesorPublico() {
  const navigate = useNavigate();
  const { asesorId } = useParams();

  const [alerta, setAlerta] = useState({
  visible: false,
  mensaje: "",
});

const [asesor, setAsesor] = useState(null);
const [loadingAsesor, setLoadingAsesor] = useState(true);

  const [cursos, setCursos] = useState([]);

  useEffect(() => {
  if (!asesorId) {
    setAsesor(null);
    setLoadingAsesor(false);
    return;
  }

  // 🔥 Simulación temporal del asesor
  setAsesor({
    id: asesorId,
    asesorId: asesorId,
    nombre: "Asesor",
  });

  setLoadingAsesor(false);
}, [asesorId]);



  const alumnos = normalizarAlumnosGuardados(leerJSON(ALUMNOS_KEY));



  const [form, setForm] = useState({
    nombre: "",
    telefono: "",
    email: "",
    tipoDocumento: "",
    numeroDocumento: "",
    cursoId: "",
    modalidad: "",
    tipoPrograma: "",
    notas: "",
    claseGratis: false,
  
  });

  useEffect(() => {
  const fetchCursos = async () => {
    try {
      const snapshot = await getDocs(collection(db, "cursos"));

      let data = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id,
      }));

      // 🔥 SI FIRESTORE ESTÁ VACÍO O INCOMPLETO → USAR BASE
  const cursosUnicos = data.filter(
  (curso, index, self) =>
    index === self.findIndex((c) => c.nombre === curso.nombre)
);

setCursos(cursosUnicos);

    } catch (error) {
     

      // 🔥 FALLBACK TOTAL
      setCursos(obtenerCursosBase());
    }
  };

  fetchCursos();
}, []);
  
  

  const cursoSeleccionado = useMemo(
    () => cursos.find((c) => c.id === form.cursoId) || null,
    [cursos, form.cursoId]
  );

  const precioBaseCurso =
    cursoSeleccionado?.tipos?.[form.tipoPrograma]?.precio || 0;

  const descuentoAplicado = Math.min(
    Math.max(Number(form.descuento) || 0, 0),
    100
  );

  const valorCalculado = precioBaseCurso
    ? Math.round(precioBaseCurso * (1 - descuentoAplicado / 100))
    : 0;

  const sincronizarAlumno = async (leadPayload) => {
    const alumnosActuales = normalizarAlumnosGuardados(leerJSON(ALUMNOS_KEY));

    const existente = alumnosActuales.find(
      (a) =>
        String(a.numeroDocumento || "") === String(leadPayload.numeroDocumento || "") &&
        String(a.cursoId || a.curso || "") === String(leadPayload.cursoId || "")
    );

    if (existente) return existente.alumnoId;

    const nuevoAlumno = {
      id: Date.now(),
    alumnoId: await generarIdAlumnoBonito(leadPayload.nombre),
      nombre: leadPayload.nombre,
      telefono: leadPayload.telefono || "",
      tipoDocumento: leadPayload.tipoDocumento || "",
      numeroDocumento: leadPayload.numeroDocumento || "",
      curso: leadPayload.cursoId,
      cursoId: leadPayload.cursoId,
      valor: Number(leadPayload.valor || 0),
      valorBase: Number(leadPayload.valorBase || 0),
      descuento: Number(leadPayload.descuento || 0),
      valorEditadoManual: Boolean(leadPayload.valorEditadoManual),
      modalidad: leadPayload.modalidad || "",
      tipo: leadPayload.tipoPrograma || "",
      duracion: leadPayload.duracion || "",
      estado: "activo",
      asesorId: leadPayload.asesorId,
      asesorNombre: leadPayload.asesorNombre,
      leadId: leadPayload.id,
      fechaRegistro: new Date().toISOString(),
    };

    guardarJSON(ALUMNOS_KEY, [...alumnosActuales, nuevoAlumno]);
    return nuevoAlumno.alumnoId;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
  console.log("FORM ACTUAL:", form); // 👈 AQUI

    if (!asesor) {
      alert("No se encontró el asesor.");
      return;
    }

   if (
  !form.nombre ||
  !form.telefono ||
  !form.cursoId ||
  (!form.claseGratis && !form.tipoPrograma)
) {
  alert("Completa los campos obligatorios.");
  return;
}

    const payload = {
      
      asesorId: asesor.id,
      asesorCodigo: asesor.asesorId || "",
      asesorNombre: asesor.nombre,
      asesorLink: `${window.location.origin}/registro-asesor/${asesor.id}`,
      nombre: form.nombre.trim(),
      telefono: form.telefono.trim(),
      email: form.email.trim(),
      tipoDocumento: form.tipoDocumento,
      numeroDocumento: form.numeroDocumento,

        edad: form.edad || "",
nombreAcudiente: form.nombreAcudiente || "",
telefonoAcudiente: form.telefonoAcudiente || "",

      cursoId: form.cursoId,
      cursoNombre: cursoSeleccionado?.nombre || "",
      duracion: "",
      modalidad: form.modalidad,
      tipoPrograma: form.tipoPrograma,
      tipoCliente: "nuevo",
     estado: "lead",
     claseGratis: Boolean(form.claseGratis),
      valor: Number(form.valor || valorCalculado || 0),
      valorBase: Number(precioBaseCurso || 0),
      descuento: Number(form.descuento || 0),
      valorEditadoManual: Boolean(form.valorEditadoManual),
      notas: form.notas
        ? [
            {
              id: crypto.randomUUID(),
              texto: form.notas.trim(),
              fecha: new Date().toISOString(),
              autor: "Registro público",
            },
          ]
        : [],
      alumnoId: null,
      createdAt: new Date().toISOString(),
    };

    if (payload.estado === "pagado") {
      payload.alumnoId = await sincronizarAlumno(payload);
    }

   try {
// 1️⃣ Guardar en Supabase primero
const { data, error } = await supabase
  .from("leads")
  .insert([
    {
      id: crypto.randomUUID(),
      nombre: payload.nombre,
      telefono: payload.telefono,
      email: payload.email || "sin-email@temp.com",

      curso_id: payload.cursoId,
      estado: payload.estado,
      valor: payload.valor,
      descuento: payload.descuento || 0,
      asesor_id: payload.asesorId,

      // 🔥 AGREGA ESTO
      tipo_cliente: payload.tipoCliente,
      modalidad: payload.modalidad,
      tipo_programa: payload.tipoPrograma,
     

      created_at: new Date().toISOString()
    }
  ])
  .select();

if (error) {
  console.error("Error Supabase:", error);
  throw error; // 🔥 importante
}




  navigate("/gracias");
} catch (error) {
  
  alert("No se pudo guardar el registro.");
}
  };
if (loadingAsesor) {
  return (
    <div className="asesor-auth-page">
      <div className="asesor-auth-card">
        <h1>Cargando...</h1>
        <p>Estamos preparando tu formulario.</p>
      </div>
    </div>
  );
}

  if (!asesor) {
    return (
      <div className="asesor-auth-page">
        <div className="asesor-auth-card">
          <h1>Asesor no encontrado</h1>
          <p>El link no es válido o el asesor no existe.</p>
        </div>
      </div>
    );
  }



  return (
    <div className="asesor-auth-page">
      <div className="lead-modal-card" style={{ maxWidth: 900 }}>
        <div className="lead-modal-head">
          <div>
            <span className="hero-kicker">Registro público</span>
            <h3>Formulario de inscripción</h3>
            <p>Asesor asignado: {asesor.nombre}</p>
          </div>
        </div>
     
        <form onSubmit={handleSubmit} className="lead-form-pro">
          <div className="field-group">
            <label>Nombre</label>
            <input
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              required
            />
          </div>

          <div className="field-group">
            <label>Teléfono</label>
            <input
              value={form.telefono}
              onChange={(e) => setForm({ ...form, telefono: e.target.value })}
              required
            />
          </div>

          <div className="field-group">
            <label>Email</label>
            <input
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="field-group">
            <label>Tipo documento</label>
            <select
              value={form.tipoDocumento}
              onChange={(e) => setForm({ ...form, tipoDocumento: e.target.value })}
            >
              <option value="">Seleccionar</option>
               <option value="ti">Tarjeta de identidad</option>
              <option value="cedula">Cédula</option>
               <option value="extranjeria">Cédula extranjería</option>
             
              <option value="nit">NIT</option>
              <option value="ppt">PPT</option>
             
            </select>
          </div>

          <div className="field-group">
            <label>Número documento</label>
            <input
              value={form.numeroDocumento}
              onChange={(e) => setForm({ ...form, numeroDocumento: e.target.value })}
            />
          </div>
          {form.tipoDocumento === "ti" && (
  <>
    <div className="field-group">
      <label>Edad</label>
      <input
        type="number"
        value={form.edad}
        onChange={(e) =>
          setForm({ ...form, edad: e.target.value })
        }
        placeholder="Edad"
        required
      />
    </div>

    <div className="field-group">
      <label>Nombre del acudiente</label>
      <input
        value={form.nombreAcudiente}
        onChange={(e) =>
          setForm({ ...form, nombreAcudiente: e.target.value })
        }
        placeholder="Nombre del acudiente"
        required
      />
    </div>

    <div className="field-group">
      <label>Número del acudiente</label>
      <input
        value={form.telefonoAcudiente}
        onChange={(e) =>
          setForm({ ...form, telefonoAcudiente: e.target.value })
        }
        placeholder="Teléfono del acudiente"
        required
      />
    </div>

    <div className="field-group field-group-full checkbox-wrap">
      <label className="checkbox-row">
        <input
          type="checkbox"
          checked={form.aceptaTerminos}
          onChange={(e) =>
            setForm({ ...form, aceptaTerminos: e.target.checked })
          }
          required
        />
        Acepto términos y condiciones
      </label>
    </div>
  </>
)}

          <div className="field-group">
            <label>Curso</label>
            <select
              value={form.cursoId}
              onChange={(e) => setForm({ ...form, cursoId: e.target.value })}
            >
              <option value="">Seleccionar curso</option>
              {cursos.map((curso) => (
                <option key={curso.id} value={curso.id}>
                  {curso.nombre}
                </option>
              ))}
            </select>

          </div>
          <div className="field-group field-group-full">
  <label className="checkbox-row">
  <input
  type="checkbox"
  checked={form.claseGratis}
  onChange={(e) =>
    setForm({
      ...form,
      claseGratis: e.target.checked,
      tipoPrograma: e.target.checked ? "" : form.tipoPrograma, // 👈 CLAVE
    })
  }
/>
    Quiero tomar primero una clase gratis
  </label>
</div>

        

        
{!form.claseGratis && (
  <>
    <div className="field-group">
      <label>Modalidad</label>
      <select
        value={form.modalidad}
        onChange={(e) => setForm({ ...form, modalidad: e.target.value })}
      >
        <option value="">Seleccionar</option>
        <option value="presencial">Presencial</option>
        <option value="virtual">Virtual</option>
      </select>
    </div>

    <div className="field-group">
      <label>Tipo de clase</label>
      <select
        value={form.tipoPrograma}
        onChange={(e) =>
          setForm({
            ...form,
            tipoPrograma: e.target.value,
            valor: String(
              cursoSeleccionado?.tipos?.[e.target.value]?.precio || ""
            ),
            valorEditadoManual: false,
          })
        }
      >
        <option value="">Seleccionar</option>
        <option value="personalizado">Personalizado</option>
        <option value="semi">Semi-personalizado</option>
        <option value="grupal">Grupal</option>
      </select>
    </div>
  </>
)}

         

          <div className="field-group field-group-full">
            <label>Notas</label>
            <textarea
              rows="4"
              value={form.notas}
              onChange={(e) => setForm({ ...form, notas: e.target.value })}
            />
          </div>


          <div className="field-group field-group-full action-row">
            <button type="submit" className="primary-btn-pro">
              Enviar inscripción
            </button>
          </div>
        </form>
      </div>
    </div>
  );
  {alerta.visible && (
  <div className="alerta-overlay">
    <div className="alerta-box">
      <h3>✅ ¡Registro exitoso!</h3>
      <p>{alerta.mensaje}</p>

      <button
        onClick={() => {
          setAlerta({ visible: false, mensaje: "" });
          navigate("/gracias"); // 🔥 aquí conectamos con la siguiente parte
        }}
      >
        Continuar
      </button>
    </div>
  </div>
)}
}

export default RegistroAsesorPublico;