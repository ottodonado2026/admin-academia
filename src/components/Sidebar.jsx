import "./Sidebar.css";
import logo from "../assets/logo.png"; 
import { NavLink } from "react-router-dom";
import { useState } from "react";
import { useEffect } from "react";
import { supabase } from "../services/supabaseClient";

function Sidebar({ onLogout }) {
  const [open, setOpen] = useState(false);
  const [pendientes, setPendientes] = useState(0);

  useEffect(() => {
  const data = JSON.parse(localStorage.getItem("solicitudesCambios") || "[]");
  const count = data.filter(s => s.estado === "pendiente").length;
  setPendientes(count);


}, []);


useEffect(() => {
  const getUserData = async () => {
    const { data } = await supabase.auth.getUser();

    const user = data.user;

    if (!user) return;

    const { data: usuario } = await supabase
      .from("usuarios")
      .select("nombre, role")
      .eq("auth_uid", user.id)
      .single();

    if (!usuario) return;

    const roleLabels = {
      owner: "Gerente",
      contador: "Contador",
      coordinador: "Coordinador",
    };

    setNombre(usuario.nombre);
    setRoleLabel(roleLabels[usuario.role] || "Usuario");
  };

  getUserData();
}, []);

const [nombre, setNombre] = useState("");
const [roleLabel, setRoleLabel] = useState("");


  return (
    <>
  {open && <div className="overlay" onClick={() => setOpen(false)} />}
      {/* 🔥 TOP BAR MOBILE */}
      <div className="topbar-mobile">
        <button onClick={() => setOpen(!open)}>☰</button>
       <h4>{roleLabel}</h4>
      </div>

      <aside className={`sidebar ${open ? "open" : ""}`}>
        {/* TOP */}


      <div className="sidebar-content">
          <div className="sidebar-brand">
          <img src={logo} alt="logo" className="sidebar-logo" />

        </div>


            <div className="sidebar-user-card">

              <div className="user-info">
               <strong>{nombre}</strong>

                <span className="user-status">
                  <span className="status-dot"></span>
                  {roleLabel}
                </span>
              </div>

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