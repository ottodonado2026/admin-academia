import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./global.css";

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