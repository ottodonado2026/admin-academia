import React from 'react';
import './LoginLoader.css';

export default function LoginLoader() {
  return (
    <div className="login-loader-overlay">
      <div className="login-loader-container">
        <div className="login-loader-bars">
          <div className="login-loader-bar"></div>
          <div className="login-loader-bar"></div>
          <div className="login-loader-bar"></div>
          <div className="login-loader-bar"></div>
          <div className="login-loader-bar"></div>
        </div>
        <h2 className="login-loader-title">INICIANDO SESIÓN</h2>
        <p className="login-loader-subtitle">Preparando tu entorno de trabajo...</p>
      </div>
    </div>
  );
}
