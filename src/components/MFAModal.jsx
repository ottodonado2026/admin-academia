import { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";
import "./MFAModal.css";

export default function MFAModal({ onClose }) {
  const [step, setStep] = useState("inicio");
  const [qrCode, setQrCode] = useState(null);
  const [secret, setSecret] = useState(null);
  const [factorId, setFactorId] = useState(null);
  const [codigo, setCodigo] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const verificarMFA = async () => {
      const { data } = await supabase.auth.mfa.listFactors();
      const tieneActivo = data?.totp?.some((f) => f.status === "verified");
      if (tieneActivo) setStep("activo");
    };
    verificarMFA();
  }, []);

  const iniciarEnrolamiento = async () => {
    setLoading(true);
    setError("");
    try {
      const { data, error: err } = await supabase.auth.mfa.enroll({
        factorType: "totp",
        friendlyName: "Caribbean Studio Academy - Admin",
      });
      if (err) {
        setError("Error al iniciar MFA: " + err.message);
        setLoading(false);
        return;
      }
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
      setStep("qr");
    } catch (e) {
      setError("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const verificarCodigo = async () => {
    if (!codigo || codigo.length !== 6) {
      setError("Ingresa el código de 6 dígitos de tu app autenticadora.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { data: ch, error: chErr } = await supabase.auth.mfa.challenge({ factorId });
      if (chErr) {
        setError("Error al generar desafío: " + chErr.message);
        setLoading(false);
        return;
      }
      const { error: vErr } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: ch.id,
        code: codigo,
      });
      if (vErr) {
        setError("Código incorrecto. Inténtalo de nuevo.");
        setLoading(false);
        return;
      }
      setStep("activo");
    } catch (e) {
      setError("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const desactivarMFA = async () => {
    if (!window.confirm("¿Deseas desactivar el MFA de tu cuenta?")) return;
    setLoading(true);
    try {
      const { data } = await supabase.auth.mfa.listFactors();
      for (const f of data?.totp || []) {
        await supabase.auth.mfa.unenroll({ factorId: f.id });
      }
      setStep("inicio");
    } catch (e) {
      setError("Error al desactivar MFA: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mfa-overlay" onClick={onClose}>
      <div className="mfa-modal" onClick={(e) => e.stopPropagation()}>
        <button className="mfa-close" onClick={onClose}>✕</button>

        {step === "inicio" && (
          <>
            <div className="mfa-icon">🔐</div>
            <h2>Autenticación de Dos Factores</h2>
            <p>Activa el MFA para agregar una capa de seguridad extra. Necesitarás Google Authenticator o Authy.</p>
            <button className="mfa-btn-primary" onClick={iniciarEnrolamiento} disabled={loading}>
              {loading ? "Generando..." : "Activar MFA Ahora"}
            </button>
          </>
        )}

        {step === "qr" && (
          <>
            <div className="mfa-icon">📱</div>
            <h2>Escanea el Código QR</h2>
            <p>Abre <strong>Google Authenticator</strong> y escanea este código:</p>
            {qrCode && <img src={qrCode} alt="QR MFA" className="mfa-qr" />}
            <p className="mfa-secret-label">O ingresa este código manualmente:</p>
            <code className="mfa-secret">{secret}</code>
            <p>Ingresa el código de 6 dígitos de la app:</p>
            <input
              type="text"
              className="mfa-input"
              placeholder="000000"
              maxLength={6}
              value={codigo}
              onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))}
            />
            {error && <p className="mfa-error">{error}</p>}
            <button className="mfa-btn-primary" onClick={verificarCodigo} disabled={loading}>
              {loading ? "Verificando..." : "Verificar y Activar"}
            </button>
          </>
        )}

        {step === "activo" && (
          <>
            <div className="mfa-icon">✅</div>
            <h2>MFA Activo y Seguro</h2>
            <p>Tu cuenta está protegida con autenticación de dos factores.</p>
            <button className="mfa-btn-danger" onClick={desactivarMFA} disabled={loading}>
              {loading ? "Procesando..." : "Desactivar MFA"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
