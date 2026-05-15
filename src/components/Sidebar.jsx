import "./Sidebar.css";
import logo from "../assets/logo.png";
import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";

let sidebarUserCache = null;

const roleLabels = {
  owner: "Gerente",
  admin: "Administrador",
  contador: "Contador",
  coordinador: "Coordinador",
  coordinador_academico: "Coordinador académico",
};

function Sidebar({ onLogout }) {
  const [open, setOpen] = useState(false);
  const [pendientes, setPendientes] = useState(0);

  const [nombre, setNombre] = useState(
    sidebarUserCache?.nombre || ""
  );

  const [role, setRole] = useState(
    sidebarUserCache?.role || ""
  );

  const roleLabel =
    roleLabels[role] || sidebarUserCache?.roleLabel || "Usuario";

  const esCoordinadorAcademico = role === "coordinador_academico";

  useEffect(() => {
    const data = JSON.parse(localStorage.getItem("solicitudesCambios") || "[]");
    const count = data.filter((s) => s.estado === "pendiente").length;
    setPendientes(count);
  }, []);

  useEffect(() => {
    let activo = true;

    const getUserData = async () => {
      try {
        const { data: authData } = await supabase.auth.getUser();
        const user = authData?.user;

        if (!user) return;

        const { data: usuario, error } = await supabase
          .from("usuarios")
          .select("nombre, role")
          .eq("auth_uid", user.id)
          .maybeSingle();

        if (error) {
          console.error("Error cargando usuario sidebar:", error);
          return;
        }

        const rolNormalizado = String(usuario?.role || "").toLowerCase();

        const datosSidebar = {
          nombre: usuario?.nombre || user.email || "Usuario",
          role: rolNormalizado,
          roleLabel: roleLabels[rolNormalizado] || usuario?.role || "Usuario",
        };

        sidebarUserCache = datosSidebar;

        if (!activo) return;

        setNombre(datosSidebar.nombre);
        setRole(datosSidebar.role);
      } catch (error) {
        console.error("Error cargando sidebar:", error);
      }
    };

    getUserData();

    return () => {
      activo = false;
    };
  }, []);

  const menuCoordinador = (
    <>
      <NavLink to="/asesores" onClick={() => setOpen(false)}>
        Asesores
      </NavLink>

      <NavLink to="/profesores" onClick={() => setOpen(false)}>
        Profesores
      </NavLink>

      <NavLink to="/asesores-admin" onClick={() => setOpen(false)}>
        Registro asesores
      </NavLink>

      <NavLink to="/registro-coordinadores" onClick={() => setOpen(false)}>
        Registro de coordinadores
      </NavLink>

      <NavLink to="/coordinador" onClick={() => setOpen(false)}>
      Agenda académica
      </NavLink>

      <NavLink to="/leads" onClick={() => setOpen(false)}>
        Leads
      </NavLink>
    </>
  );

  const menuAdmin = (
    <>
      <NavLink to="/dashboard" onClick={() => setOpen(false)}>
        Dashboard
      </NavLink>

      <NavLink to="/alumnos" onClick={() => setOpen(false)}>
        Alumnos
      </NavLink>

      <NavLink to="/coordinador" onClick={() => setOpen(false)}>
        Coordinador académico
      </NavLink>

      <NavLink to="/profesores" onClick={() => setOpen(false)}>
        Profesores
      </NavLink>

      <NavLink to="/asesores" onClick={() => setOpen(false)}>
        Asesores
      </NavLink>

      <NavLink to="/leads" onClick={() => setOpen(false)}>
        Leads
      </NavLink>

      <NavLink to="/asesores-admin" onClick={() => setOpen(false)}>
        Registro asesores
      </NavLink>

      <NavLink to="/registro-coordinadores" onClick={() => setOpen(false)}>
        Registro de coordinadores
      </NavLink>

      <NavLink to="/solicitudes" onClick={() => setOpen(false)}>
        Solicitudes {pendientes > 0 && <span className="badge">{pendientes}</span>}
      </NavLink>

      <NavLink to="/pagos" onClick={() => setOpen(false)}>
        Pagos
      </NavLink>

      <NavLink to="/historial-pagos" onClick={() => setOpen(false)}>
        Historial de pagos
      </NavLink>

      <NavLink to="/ingresos" onClick={() => setOpen(false)}>
        Ingresos
      </NavLink>

      <NavLink to="/egresos" onClick={() => setOpen(false)}>
        Egresos
      </NavLink>

      <NavLink to="/cuentas" onClick={() => setOpen(false)}>
        Cuentas por cobrar
      </NavLink>

      <NavLink to="/balance" onClick={() => setOpen(false)}>
        Balance General
      </NavLink>
    </>
  );

  return (
    <>
      {open && <div className="overlay" onClick={() => setOpen(false)} />}

      <div className="topbar-mobile">
        <button onClick={() => setOpen(!open)}>☰</button>
        <h4>{roleLabel}</h4>
      </div>

      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-content">
          <div className="sidebar-brand">
            <img src={logo} alt="logo" className="sidebar-logo" />
          </div>

          <div className="sidebar-user-card">
            <div className="user-info">
              <strong>{nombre || "Usuario"}</strong>

              <span className="user-status">
                <span className="status-dot"></span>
                {roleLabel}
              </span>
            </div>
          </div>

          <nav className="sidebar-nav">
            {role
              ? esCoordinadorAcademico
                ? menuCoordinador
                : menuAdmin
              : null}
          </nav>
        </div>

        <button onClick={onLogout} className="logout-btn">
          ⏻ Cerrar sesión
        </button>
      </aside>
    </>
  );
}

export default Sidebar;