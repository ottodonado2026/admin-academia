import React from 'react';
import './LoginLoader.css';

export default function LoginLoader() {
  return (
    <div 
      className="login-loader-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: 'rgba(5, 8, 22, 0.95)',
        backdropFilter: 'blur(15px)',
        WebkitBackdropFilter: 'blur(15px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 999999,
        pointerEvents: 'all'
      }}
    >
      <div 
        className="login-loader-container"
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
          background: 'rgba(16, 18, 27, 0.95)',
          padding: '50px 70px',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 0 40px rgba(0,0,0,0.8)'
        }}
      >
        <div className="login-loader-bars">
          <div className="login-loader-bar"></div>
          <div className="login-loader-bar"></div>
          <div className="login-loader-bar"></div>
          <div className="login-loader-bar"></div>
          <div className="login-loader-bar"></div>
        </div>
        <h2 
          className="login-loader-title"
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '1.4rem',
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '2px',
            margin: 0
          }}
        >INICIANDO SESIÓN</h2>
        <p 
          className="login-loader-subtitle"
          style={{
            fontFamily: "'Outfit', sans-serif",
            fontSize: '0.95rem',
            color: '#a9b0c3',
            margin: 0
          }}
        >Preparando tu entorno de trabajo...</p>
      </div>
    </div>
  );
}
