import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import "./GraciasRegistro.css";

function GraciasRegistro() {
  const navigate = useNavigate();
  useEffect(() => {
  window.history.pushState(null, "", window.location.href);

  const onPopState = () => {
    window.history.pushState(null, "", window.location.href);
  };

  window.addEventListener("popstate", onPopState);

  return () => {
    window.removeEventListener("popstate", onPopState);
  };
}, []);
  

  return (
    <div className="gracias-page">
      <div className="gracias-card">
        <h1>🎉 ¡Gracias por registrarte!</h1>

        <p>
          Hemos recibido tu información correctamente.
        </p>

        <p className="gracias-sub">
          Un asesor se pondrá en contacto contigo muy pronto.
        </p>
      </div>
    </div>
  );
}

export default GraciasRegistro;