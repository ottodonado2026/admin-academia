import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar";
import "./EgresosPage.css";

function EgresosPage() {
  const STORAGE_KEY = "egresos";

  const [egresos, setEgresos] = useState(() => {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  });

  const [categoria, setCategoria] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState("");
  const [tipo, setTipo] = useState("gasto");
  useEffect(() => {
  setCategoria("");
}, [tipo]);
  

  const [openCat, setOpenCat] = useState(false);

  const [openMes, setOpenMes] = useState(false);
  const [mes, setMes] = useState("");

  const [openAnio, setOpenAnio] = useState(false);
  const [anio, setAnio] = useState("");
  const [editandoId, setEditandoId] = useState(null);
const [editData, setEditData] = useState({});

const categoriasPorTipo = {
  costo: ["profesor", "comision", "materiales", "operativo", "venta"],
  gasto: ["marketing", "nomina", "servicios", "arriendo", "otros"]
};

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(egresos));
  }, [egresos]);

  const agregarEgreso = (e) => {
  if (e) e.preventDefault();

    // 🔥 VALIDACIÓN PRO
if (!categoria) {
  alert("Selecciona una categoría");
  return;
}

if (!metodo) {
  alert("Selecciona un método de pago");
  return;
}

if (!tipo) {
  alert("Selecciona el tipo (costo o gasto)");
  return;
}

if (!monto || Number(monto) <= 0) {
  alert("El monto debe ser mayor a 0");
  return;
}
const descripcionLimpia = descripcion.trim();

    const nuevo = {
    id: Date.now(),
    tipo,
     categoria,
   descripcion: descripcionLimpia,
    monto: Number(monto),
    metodo,
    fecha: new Date().toISOString(),
    };

    setEgresos([nuevo, ...egresos]);

    setCategoria("");
    setDescripcion("");
    setMonto("");
    setMetodo("");
    setTipo("gasto");
  };

  const eliminarEgreso = (id) => {
    setEgresos(egresos.filter((e) => e.id !== id));
  };
  const guardarEdicion = () => {
  setEgresos(
    egresos.map((e) =>
      e.id === editandoId ? { ...e, ...editData } : e
    )
  );

  setEditandoId(null);
  setEditData({});
};

  return (
    <div className="dashboard-layout">
     <Sidebar />

<main className="dashboard-main">

  <div className="egresos-header">
  <h1>Egresos</h1>

  <div className="egresos-filtros-top">
     <button className="btn-agregar-top" onClick={agregarEgreso}>
  + Agregar Egreso
</button>
    <button className="btn-filtro">Hoy</button>
    <button className="btn-filtro">Semana</button>
    <button className="btn-filtro">Mes</button>
    <button className="btn-filtro">Año</button>

   
  </div>
</div>

<div className="egresos-top">

          {/* FORM */}
          <form className="form-egresos" onSubmit={agregarEgreso}>

            {/* CATEGORIA + BOTON */}
            <div className="columna">
  <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
    <option value="gasto">Gasto</option>
    <option value="costo">Costo</option>
  </select>
</div>
            <div className="columna-categoria">
  <div className="custom-select">
    <div className="select-box" onClick={() => setOpenCat(!openCat)}>
      {categoria || "Categoría"}
    </div>

    {openCat && (
      <ul className="select-options">
        {categoriasPorTipo[tipo].map((op) => (
          <li
            key={op}
            onClick={() => {
              setCategoria(op);
              setOpenCat(false);
            }}
          >
            {op.charAt(0).toUpperCase() + op.slice(1)}
          </li>
        ))}
      </ul>
    )}
  </div>
</div>


            {/* DESCRIPCIÓN + SEMANA */}
            <div className="columna">
              <input
                placeholder="Descripción"
                value={descripcion}
                onChange={(e) => setDescripcion(e.target.value)}
              />

            </div>

           {/* MONTO */}
<div className="columna">
  <input
    type="number"
    placeholder="Monto"
    value={monto}
    onChange={(e) => setMonto(e.target.value)}
  />
</div>

{/* METODO */}
<div className="columna">
  <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
    <option value="">Método de pago</option>
    <option value="efectivo">Efectivo</option>
    <option value="nequi">Nequi</option>
    <option value="transferencia">Transferencia</option>
  </select>
</div>


          </form>

        </div>

        {/* TABLA */}
        <table className="tabla-egresos">
          <thead>
            <tr>
              <th>Categoría</th>
              <th>Descripción</th>
              <th>Monto</th>
              <th>Método</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>

         <tbody>
  {egresos.map((e) => (
    <tr key={e.id}>
      
      {/* CATEGORIA */}
      <td>
        {editandoId === e.id ? (
   <select
  className="input-edit"
  value={editData.categoria || ""}
  onChange={(ev) =>
    setEditData({ ...editData, categoria: ev.target.value })
  }
>
  <option value="">Categoría</option>

  {categoriasPorTipo[editData.tipo || "gasto"].map((op) => (
    <option key={op} value={op}>
      {op.charAt(0).toUpperCase() + op.slice(1)}
    </option>
  ))}
</select>
        ) : (
          e.categoria
            ? e.categoria.charAt(0).toUpperCase() + e.categoria.slice(1)
            : "-"
        )}
      </td>

      {/* DESCRIPCION */}
      <td>
        {editandoId === e.id ? (
         <input
  className="input-edit"
  value={editData.descripcion}
  onChange={(ev) =>
    setEditData({ ...editData, descripcion: ev.target.value })
  }
/>
        ) : (
          e.descripcion || "-"
        )}
      </td>

      {/* MONTO */}
      <td style={{ color: "#ff3c3c" }}>
        {editandoId === e.id ? (
          <input
  className="input-edit"
  type="number"
  value={editData.monto}
  onChange={(ev) =>
    setEditData({ ...editData, monto: Number(ev.target.value) })
  }
/>
        ) : (
          `$${e.monto.toLocaleString()}`
        )}
      </td>

      {/* METODO */}
      <td>
        {editandoId === e.id ? (
       <select
  className="input-edit"
  value={editData.metodo}
  onChange={(ev) =>
    setEditData({ ...editData, metodo: ev.target.value })
  }
>
            <option value="">Método</option>
            <option value="efectivo">Efectivo</option>
            <option value="nequi">Nequi</option>
            <option value="transferencia">Transferencia</option>
          </select>
        ) : (
          e.metodo || "-"
        )}
      </td>

      {/* FECHA */}
      <td>{new Date(e.fecha).toLocaleDateString()}</td>

      {/* ACCIONES */}
      <td style={{ display: "flex", gap: "8px" }}>
        {editandoId === e.id ? (
          <>
            <button className="btn-guardar" onClick={guardarEdicion}>
              Guardar
            </button>
            <button
              className="btn-cancelar"
              onClick={() => setEditandoId(null)}
            >
              Cancelar
            </button>
          </>
        ) : (
          <>
            <button
              className="btn-editar"
              onClick={() => {
                setEditandoId(e.id);
                setEditData(e);
              }}
            >
              Editar
            </button>

            <button
              className="btn-eliminar"
              onClick={() => eliminarEgreso(e.id)}
            >
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

export default EgresosPage;