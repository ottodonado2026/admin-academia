import { useState } from "react";
import "./ProfesorLayout.css";

import ProfesorSidebar from "./components/ProfesorSidebar";
import ProfesorTopbar from "./components/ProfesorTopbar";

import ProfesorDashboardPage from "./ProfesorDashboardPage";
import ProfesorClasesPage from "./ProfesorClasesPage";
import ProfesorAlumnosPage from "./ProfesorAlumnosPage";
import ProfesorAsistenciaPage from "./ProfesorAsistenciaPage";
import ProfesorSeguimientoPage from "./ProfesorSeguimientoPage";
import ProfesorCalificacionesPage from "./ProfesorCalificacionesPage";

export default function ProfesorLayout() {
  const [activeView, setActiveView] = useState("dashboard");

  const renderView = () => {
    switch (activeView) {
      case "dashboard":
        return <ProfesorDashboardPage />;
      case "clases":
        return <ProfesorClasesPage />;
      case "alumnos":
        return <ProfesorAlumnosPage />;
      case "asistencia":
        return <ProfesorAsistenciaPage />;
      case "seguimiento":
        return <ProfesorSeguimientoPage />;
      case "calificaciones":
        return <ProfesorCalificacionesPage />;
      default:
        return <ProfesorDashboardPage />;
    }
  };

  return (
    <div className="profesor-layout">
      <ProfesorSidebar activeView={activeView} setActiveView={setActiveView} />

      <div className="profesor-main">
        <ProfesorTopbar />

        <div className="profesor-content">
          {renderView()}
        </div>
      </div>
    </div>
  );
}