import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { useNavigate } from "react-router-dom";
import "./IngresosPage.css";
import { supabase } from "../services/supabaseClient";

const STORAGE_KEY = "ingresos";

function IngresosPage() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("auth");
    navigate("/");
  };

 const [ingresos, setIngresos] = useState([]);

  const [tipo, setTipo] = useState("");
  const [categoria, setCategoria] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState("");
  const [referencia, setReferencia] = useState("");
  const [editandoId, setEditandoId] = useState(null);
  const [filtroActivo, setFiltroActivo] = useState("hoy");
  const [mesSeleccionado, setMesSeleccionado] = useState("");
  const [anioSeleccionado, setAnioSeleccionado] = useState("");
  const [editData, setEditData] = useState({});


 useEffect(() => {
  const fetchIngresos = async () => {
    const { data, error } = await supabase
      .from("ingresos")
      .select("*")
      .order("fecha", { ascending: false });

    if (!error) setIngresos(data);
  };

  fetchIngresos();
}, []);



  const editarIngreso = (ingreso) => {
  setEditandoId(ingreso.id);
  setEditData({ ...ingreso });
};

  const guardarEdicion = () => {
  const actualizados = ingresos.map((i) =>
    i.id === editandoId ? { ...editData } : i
  );

  setIngresos(actualizados);
  setEditandoId(null);
};

const filtrarIngresos = () => {
  const ahora = new Date();

  return ingresos.filter((i) => {
    const fecha = new Date(i.fecha);

    if (filtroActivo === "hoy") {
      return fecha.toDateString() === ahora.toDateString();
    }

    if (filtroActivo === "semana") {
      const inicioSemana = new Date(ahora);
      inicioSemana.setDate(ahora.getDate() - ahora.getDay());
      return fecha >= inicioSemana;
    }

    if (filtroActivo === "mes" && mesSeleccionado !== "") {
      return fecha.getMonth() === Number(mesSeleccionado);
    }

    if (filtroActivo === "anio" && anioSeleccionado !== "") {
      return fecha.getFullYear() === Number(anioSeleccionado);
    }

    return true;
  });
};


const agregarIngreso = async (e) => {
  e.preventDefault();

  if (!monto) {
    alert("El monto es obligatorio");
    return;
  }

  const nuevo = {
    tipo,
    categoria,
    descripcion,
    monto: Number(monto),
    metodo,
    referencia,
    fecha: new Date().toISOString(),
  };

  // 🔥 GUARDAR EN SUPABASE
  const { data, error } = await supabase
  .from("ingresos")
  .insert([nuevo])
  .select(); // 🔥 IMPORTANTE

  if (error) {
    console.error("ERROR COMPLETO:", error);
alert(error.message);
    alert("Error al guardar ingreso");
    return;
  }

  // 🔥 ACTUALIZAR UI
  if (data && data.length > 0) {
  setIngresos([data[0], ...ingresos]);
}

  setTipo("");
  setCategoria("");
  setDescripcion("");
  setMonto("");
  setMetodo("");
  setReferencia("");
};

  const eliminarIngreso = (id) => {
    if (!window.confirm("¿Eliminar ingreso?")) return;
    setIngresos(ingresos.filter((i) => i.id !== id));
  };

  return (
    <div className="dashboard-layout">
      <Sidebar onLogout={handleLogout} />

      <main className="dashboard-main">
       <div className="ingresos-header">
  <h1>Ingresos</h1>

  <div className="ingresos-filtros-top">
     <button type="button" className="btn-agregar-top" onClick={agregarIngreso}>
  + Agregar ingreso
</button>
    <button
  className={`btn-filtro ${filtroActivo === "hoy" ? "activo" : ""}`}
  onClick={() => setFiltroActivo("hoy")}
>
  Hoy
</button>

<button
  className={`btn-filtro ${filtroActivo === "semana" ? "activo" : ""}`}
  onClick={() => setFiltroActivo("semana")}
>
  Semana
</button>

<select
  className="filtro-select"
  value={mesSeleccionado}
  onChange={(e) => {
    setMesSeleccionado(e.target.value);
    setFiltroActivo("mes");
  }}
>
  <option value="">Mes</option>
  <option value="0">Enero</option>
  <option value="1">Febrero</option>
  <option value="2">Marzo</option>
  <option value="3">Abril</option>
  <option value="4">Mayo</option>
  <option value="5">Junio</option>
  <option value="6">Julio</option>
  <option value="7">Agosto</option>
  <option value="8">Septiembre</option>
  <option value="9">Octubre</option>
  <option value="10">Noviembre</option>
  <option value="11">Diciembre</option>
</select>

<select
  className="filtro-select"
  value={anioSeleccionado}
  onChange={(e) => {
    setAnioSeleccionado(e.target.value);
    setFiltroActivo("anio");
  }}
>
  <option value="">Año</option>
  <option value="2026">2026</option>
  <option value="2025">2025</option>
  <option value="2024">2024</option>
</select>
  </div>
</div>
<form className="form-ingresos" onSubmit={agregarIngreso}>
  
  <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
    <option value="">Tipo</option>
    <option value="alquiler">Alquiler</option>
    <option value="venta">Venta</option>
    <option value="otro">Otro</option>
  </select>

  <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
    <option value="">Categoría</option>
    <option value="servicios">Servicios</option>
    <option value="productos">Productos</option>
    <option value="equipos">Equipos</option>
    <option value="otros">Otros</option>
  </select>

  <input
    placeholder="Descripción"
    value={descripcion}
    onChange={(e) => setDescripcion(e.target.value)}
  />

  <input
    type="number"
    placeholder="Monto"
    value={monto}
    onChange={(e) => setMonto(e.target.value)}
  />

  <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
    <option value="">Método de pago</option>
    <option value="efectivo">Efectivo</option>
    <option value="nequi">Nequi</option>
    <option value="bancolombia">Bancolombia</option>
    <option value="davivienda">Davivienda</option>
    <option value="transferencia">Transferencia</option>
  </select>

  <input
    placeholder="Referencia (opcional)"
    value={referencia}
    onChange={(e) => setReferencia(e.target.value)}
  />

 

</form>

     {/* 🔥 LISTA */}
<table className="tabla-ingresos">
  <thead>
    <tr>
         <th>Tipo</th>
          <th>Categoría</th>
        <th>Descripción</th>
      <th>Monto</th>
      <th>Fecha</th>
      <th>Método</th>
       <th>Acciones</th>
    </tr>
  </thead>

 <tbody>
 {filtrarIngresos().map((i) => (
    <tr key={i.id}>

     <td>
  {editandoId === i.id ? (
    <select
      value={editData.tipo}
      onChange={(e) =>
        setEditData({ ...editData, tipo: e.target.value })
      }
    >
      <option value="">Tipo</option>
      <option value="alquiler">Alquiler</option>
      <option value="venta">Venta</option>
      <option value="otro">Otro</option>
    </select>
  ) : i.tipo}
</td>

    <td>
  {editandoId === i.id ? (
    <select
      value={editData.categoria}
      onChange={(e) =>
        setEditData({ ...editData, categoria: e.target.value })
      }
    >
      <option value="">Categoría</option>
      <option value="servicios">Servicios</option>
      <option value="productos">Productos</option>
      <option value="equipos">Equipos</option>
      <option value="otros">Otros</option>
    </select>
  ) : i.categoria}
</td>

      <td>
        {editandoId === i.id ? (
          <input value={editData.descripcion} onChange={(e) =>
            setEditData({ ...editData, descripcion: e.target.value })
          } />
        ) : i.descripcion}
      </td>

      <td>
        {editandoId === i.id ? (
          <input type="number" value={editData.monto} onChange={(e) =>
            setEditData({ ...editData, monto: Number(e.target.value) })
          } />
        ) : `$${i.monto.toLocaleString()}`}
      </td>

      <td>{new Date(i.fecha).toLocaleDateString()}</td>

     <td>
  {editandoId === i.id ? (
    <select
      value={editData.metodo}
      onChange={(e) =>
        setEditData({ ...editData, metodo: e.target.value })
      }
    >
      <option value="">Método de pago</option>
      <option value="efectivo">Efectivo</option>
      <option value="nequi">Nequi</option>
      <option value="bancolombia">Bancolombia</option>
      <option value="davivienda">Davivienda</option>
      <option value="transferencia">Transferencia</option>
    </select>
  ) : i.metodo}
</td>

      <td>
        {editandoId === i.id ? (
          <>
            <button className="btn-guardar" onClick={guardarEdicion}>
              ✔
            </button>
            <button className="btn-cancelar" onClick={() => setEditandoId(null)}>
              ✖
            </button>
          </>
        ) : (
          <>
            <button className="btn-editar" onClick={() => editarIngreso(i)}>
              Editar
            </button>
            <button className="btn-eliminar" onClick={() => eliminarIngreso(i.id)}>
              Eliminar
            </button>
          </>
        )}
      </td>

    </tr>
  ))}
</tbody>
</table>
    
       
      </main>
    </div>
  );
}

export default IngresosPage;