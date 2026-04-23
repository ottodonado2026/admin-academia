import "./Sidebar.css";
import { NavLink } from "react-router-dom";
import { useState } from "react";
import { useEffect } from "react";


function Sidebar({ onLogout }) {
  const [open, setOpen] = useState(false);
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
  const data = JSON.parse(localStorage.getItem("solicitudesCambios") || "[]");
  const count = data.filter(s => s.estado === "pendiente").length;
  setPendientes(count);
}, []);

  return (
    <>
  {open && <div className="overlay" onClick={() => setOpen(false)} />}
      {/* 🔥 TOP BAR MOBILE */}
      <div className="topbar-mobile">
        <button onClick={() => setOpen(!open)}>☰</button>
        <h2>CSA Admin</h2>
      </div>

      <aside className={`sidebar ${open ? "open" : ""}`}>
        {/* TOP */}
      <div className="sidebar-content">
          <div className="sidebar-brand">
            <div className="brand-badge">CSA</div>

            <div>
              <h2>CSA Admin</h2>
              <p>Academia electrónica</p>
            </div>
          </div>

<div className="sidebar-user-card">
  <div className="user-avatar">A</div>

<span className="user-status">
  <span className="status-dot"></span>
  Activo
</span>
</div>

          {/* MENÚ */}
          <nav className="sidebar-nav">
  <NavLink to="/dashboard">Dashboard</NavLink>
  <NavLink to="/alumnos">Alumnos</NavLink>
  <NavLink to="/profesores">Profesores</NavLink>
 <NavLink to="/asesores">Asesores</NavLink>
<NavLink to="/asesores-admin">Registro asesores</NavLink>
<NavLink to="/solicitudes">
  Solicitudes {pendientes > 0 && <span className="badge">{pendientes}</span>}
</NavLink>
  <NavLink to="/pagos">Pagos</NavLink>
  <NavLink to="/historial-pagos">Historial de pagos</NavLink>
  <NavLink to="/ingresos">Ingresos</NavLink>
  <NavLink to="/egresos">Egresos</NavLink>
  <NavLink to="/cuentas">Cuentas por cobrar</NavLink>
  <NavLink to="/balance">Balance General</NavLink>
</nav>
        </div>

        {/* BOTTOM */}
        <button onClick={onLogout} className="logout-btn">
  ⏻ Cerrar sesión
</button>

      </aside>
    </>
  );
}

export default Sidebar;