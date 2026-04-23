import { useEffect, useState, useRef } from "react";
import Sidebar from "../components/Sidebar";
import "./BalanceGeneral.css";

const meses = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
];

function BalanceGeneral() {
  const [ingresos, setIngresos] = useState([]);
  const [egresos, setEgresos] = useState([]);
  const [mesSeleccionado, setMesSeleccionado] = useState("");
  const [openSelect, setOpenSelect] = useState(false);
  const selectRef = useRef(null);

  useEffect(() => {
  const handleClickOutside = (event) => {
    if (selectRef.current && !selectRef.current.contains(event.target)) {
      setOpenSelect(false);
    }
  };

  document.addEventListener("mousedown", handleClickOutside);

  return () => {
    document.removeEventListener("mousedown", handleClickOutside);
  };
}, []);

  useEffect(() => {
    setIngresos(JSON.parse(localStorage.getItem("ingresos") || "[]"));
    setEgresos(JSON.parse(localStorage.getItem("egresos") || "[]"));
  }, []);

  // 🔥 FILTRO
  const filtrarPorMes = (data) => {
    if (mesSeleccionado === "") return data;

    return data.filter((item) => {
      const fecha = new Date(item.fecha);
      return fecha.getMonth() === Number(mesSeleccionado);
    });
  };

  const ingresosFiltrados = filtrarPorMes(ingresos);
  const egresosFiltrados = filtrarPorMes(egresos);

  const totalIngresos = ingresosFiltrados.reduce(
    (acc, i) => acc + Number(i.monto || 0),
    0
  );

  const totalEgresos = egresosFiltrados.reduce(
    (acc, e) => acc + Number(e.monto || 0),
    0
  );

  const patrimonio = totalIngresos - totalEgresos;

  const totalGeneral = totalIngresos + totalEgresos || 1;
  const porcentajeIngresos = (totalIngresos / totalGeneral) * 100;
  const porcentajeEgresos = (totalEgresos / totalGeneral) * 100;

  const pagos = JSON.parse(localStorage.getItem("pagos") || "[]");

const totalPorCobrar = pagos
  .filter(p => p.saldoPendiente > 0)
  .reduce((acc, p) => acc + Number(p.saldoPendiente), 0);


  const activos = totalIngresos + totalPorCobrar;

  

  return (
    <div className="dashboard-layout">
      <Sidebar />

      <main className="dashboard-main">
        <h1>Balance General</h1>

        {/* 🔥 CUSTOM SELECT */}
        <div className="balance-filtros">
        <div
  ref={selectRef}
  className={`custom-select ${openSelect ? "open" : ""}`}
>
  {/* 🔥 CAJA VISIBLE */}
  <div
    className="select-box"
    onClick={() => setOpenSelect(!openSelect)}
  >
    {mesSeleccionado === ""
      ? "Todos los meses"
      : meses[mesSeleccionado]}
  </div>

  {/* 🔥 OPCIONES */}
  <div className="options">

  <div
    onClick={() => {
      setMesSeleccionado("");
      setOpenSelect(false);
    }}
  >
    Todos los meses
  </div>

  {meses.map((mes, index) => (
    <div
      key={index}
      onClick={() => {
        setMesSeleccionado(index);
        setOpenSelect(false);
      }}
    >
      {mes}
    </div>
  ))}

</div>
          </div>
        </div>

        {/* KPI */}
        <div className="balance-kpis">
          <div className="kpi-card ingresos">
            <span>Ingresos</span>
            <strong>${totalIngresos.toLocaleString()}</strong>
          </div>

          <div className="kpi-card egresos">
            <span>Egresos</span>
            <strong>${totalEgresos.toLocaleString()}</strong>
          </div>

          <div className={`kpi-card resultado ${patrimonio >= 0 ? "positivo" : "negativo"}`}>
            <span>Resultado</span>
            <strong>${patrimonio.toLocaleString()}</strong>
            <small>{patrimonio >= 0 ? "📈 Ganancia" : "📉 Pérdida"}</small>
          </div>
        </div>

        {/* BARRA */}
        <div className="balance-bar">
          <div className="bar ingresos" style={{ width: `${porcentajeIngresos}%` }} />
          <div className="bar egresos" style={{ width: `${porcentajeEgresos}%` }} />
        </div>

        {/* CARDS */}
        <div className="balance-container">
          <div className="balance-card activos">
            <h3>Activos</h3>
            <p>${totalIngresos.toLocaleString()}</p>
          </div>

          <div className="balance-card pasivos">
            <h3>Pasivos</h3>
            <p>${totalEgresos.toLocaleString()}</p>
          </div>

          <div className={`balance-card patrimonio ${patrimonio >= 0 ? "positivo" : "negativo"}`}>
            <h3>Patrimonio</h3>
            <p>${patrimonio.toLocaleString()}</p>
          </div>

          <div className="balance-card cuentas">
  <h3>Cuentas por cobrar</h3>
  <p>${totalPorCobrar.toLocaleString()}</p>
</div>

        </div>
      </main>
    </div>
  );
}

export default BalanceGeneral;