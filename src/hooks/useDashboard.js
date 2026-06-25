import { useState, useEffect } from "react";
import { supabase } from "../services/supabaseClient";

export const useDashboard = () => {
  const [data, setData] = useState({
    pagos: [],
    historialPagos: [],
    alumnos: [],
    ingresos: [],
    egresos: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 🔹 PAGOS (planes)
      const pagosPromise = supabase.from("pagos").select("*");
      // 🔹 HISTORIAL (abonos)
      const historialPromise = supabase.from("historial_pagos").select("*");
      // 🔹 ALUMNOS
      const alumnosPromise = supabase.from("alumnos").select("*");
      // 🔹 INGRESOS
      const ingresosPromise = supabase.from("ingresos").select("*");
      // 🔹 EGRESOS
      const egresosPromise = supabase.from("egresos").select("*");

      // Ejecutar todas las promesas en paralelo para mayor velocidad
      const [
        pagosRes,
        historialRes,
        alumnosRes,
        ingresosRes,
        egresosRes,
      ] = await Promise.all([
        pagosPromise,
        historialPromise,
        alumnosPromise,
        ingresosPromise,
        egresosPromise,
      ]);

      if (pagosRes.error) throw pagosRes.error;
      if (historialRes.error) throw historialRes.error;
      if (alumnosRes.error) throw alumnosRes.error;
      if (ingresosRes.error) throw ingresosRes.error;
      if (egresosRes.error) throw egresosRes.error;

      setData({
        pagos: pagosRes.data || [],
        historialPagos: historialRes.data || [],
        alumnos: alumnosRes.data || [],
        ingresos: ingresosRes.data || [],
        egresos: egresosRes.data || [],
      });
    } catch (err) {
      console.error("Error cargando datos del dashboard:", err);
      setError(err.message || "Error al cargar los datos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  return { ...data, loading, error, refetch: fetchDashboardData };
};
