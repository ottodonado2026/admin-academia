import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./global.css";
import { config } from "./config/institucion";

// Inyectar variables de color institucionales
document.documentElement.style.setProperty("--color-primario", config.colorPrimario);
document.documentElement.style.setProperty("--color-secundario", config.colorSecundario);

// Silenciar todos los logs de consola en producción para evitar fugas de información
if (import.meta.env.PROD) {
  console.log = () => {};
  console.info = () => {};
  console.warn = () => {};
  console.error = () => {};
  console.debug = () => {};
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);