import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "../pages/LoginPage";
import DashboardPage from "../pages/DashboardPage";
import ProtectedRoute from "../components/ProtectedRoute";
import PagosPage from "../pages/PagosPage";
import AlumnosPage from "../pages/AlumnosPage";
import IngresosPage from "../pages/IngresosPage";
import EgresosPage from "../pages/EgresosPage";
import BalanceGeneral from "../pages/BalanceGeneral";
import CuentasPorCobrar from "../pages/CuentasPorCobrar";
import ProfesoresPage from "../pages/ProfesoresPage";
import LoginProfesor from "../profesor/LoginProfesor";
import HistorialDePagos from "../historialdepagos/HistorialPagosPage";

import AsesoresLogin from "../asesores/AsesoresLogin";
import AsesoresPanel from "../asesores/AsesoresPanel";
import AsesoresAdminSection from "../asesores/AsesoresAdminSection";
import RegistroAsesorPublico from "../asesores/RegistroAsesorPublico";
import Solicitudes from "../pages/Solicitudes";

import ProfesorLayout from "../profesor/ProfesorLayout";
import AsesoresDirectorioSection from "../asesores/AsesoresDirectorioSection";
import GraciasRegistro from "../asesores/GraciasRegistro";

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>

        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />

        {/* PROFESOR */}
        <Route path="/login-profesor" element={<LoginProfesor />} />

        <Route
          path="/panel-profesor"
          element={
            <ProtectedRoute role="profesor">
              <ProfesorLayout />
            </ProtectedRoute>
          }
        />

        {/* ADMIN */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute role="admin">
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route path="/alumnos" element={<ProtectedRoute role="admin"><AlumnosPage /></ProtectedRoute>} />
        <Route path="/profesores" element={<ProtectedRoute role="admin"><ProfesoresPage /></ProtectedRoute>} />
        <Route path="/pagos" element={<ProtectedRoute role="admin"><PagosPage /></ProtectedRoute>} />
        <Route path="/historial-pagos" element={<ProtectedRoute role="admin"><HistorialDePagos /></ProtectedRoute>} />
        <Route path="/ingresos" element={<ProtectedRoute role="admin"><IngresosPage /></ProtectedRoute>} />
        <Route path="/egresos" element={<ProtectedRoute role="admin"><EgresosPage /></ProtectedRoute>} />
        <Route path="/cuentas" element={<ProtectedRoute role="admin"><CuentasPorCobrar /></ProtectedRoute>} />
        <Route path="/balance" element={<ProtectedRoute role="admin"><BalanceGeneral /></ProtectedRoute>} />

        {/* 🔥 ASESORES (AQUÍ VA BIEN) */}
        <Route path="/login-asesor" element={<AsesoresLogin />} />
        <Route path="/registro-asesor/:asesorId" element={<RegistroAsesorPublico />} />
        <Route path="/gracias" element={<GraciasRegistro />} />



        <Route
          path="/panel-asesor"
          element={
            <ProtectedRoute role="asesor">
              <AsesoresPanel />
            </ProtectedRoute>
          }
          
        />
        <Route
  path="/asesores-admin"
  element={
    <ProtectedRoute role="admin">
      <AsesoresAdminSection />
    </ProtectedRoute>
  }
  
/>
<Route
  path="/asesores"
  element={
    <ProtectedRoute role="admin">
      <AsesoresDirectorioSection />
    </ProtectedRoute>
  }
/>
  <Route 
  path="/solicitudes" 
  element={
    <ProtectedRoute role="admin">
      <Solicitudes />
    </ProtectedRoute>
  } 
/>

        <Route path="*" element={<Navigate to="/" replace />} />
      

      </Routes>
   
    </BrowserRouter>

    
  );
}

export default AppRouter;