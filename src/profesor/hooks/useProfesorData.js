import { useState, useEffect } from "react";
import { supabase } from "../../services/supabaseClient";

export function useProfesorData() {
  const [clases, setClases] = useState([]);
  const [pagos, setPagos] = useState([]);
  const [alumnos, setAlumnos] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let activo = true;

    const cargarDatos = async () => {
      const userDataStr = localStorage.getItem("user");
      const user = userDataStr ? JSON.parse(userDataStr) : null;
      const profeId = user?.id;

      if (!profeId) {
        if (activo) setLoading(false);
        return;
      }

      const [
        { data: clasesData, error: clasesError },
        { data: clasesGratisData },
        { data: pagosData },
        { data: alumnosResp },
      ] = await Promise.all([
        supabase
          .from("clases")
          .select("*")
          .or(`profesor_id.eq.${profeId},profesor_db_id.eq.${profeId}`)
          .order("fecha", { ascending: false }),

        supabase
          .from("clases_gratis")
          .select("*")
          .or(`profesor_id.eq.${profeId}`)
          .order("fecha", { ascending: false }),

        supabase.from("pagos").select("*"),
        supabase.from("alumnos").select("*"),
      ]);

      if (!activo) return;

      if (!clasesError) {
        const alumnosMap = {};
        (alumnosResp || []).forEach((a) => {
          alumnosMap[a.id] = a;
          if (a.alumno_id) alumnosMap[a.alumno_id] = a;
        });

        const calcularModuloActual = (horasAcumuladas) => {
          if (!horasAcumuladas) return 1;
          const horas = Number(horasAcumuladas);
          if (horas < 10) return 1;
          if (horas < 20) return 2;
          if (horas < 30) return 3;
          if (horas < 40) return 4;
          return 5;
        };

        const clasesNormales = (clasesData || []).map((c) => {
          const alumnoDB = alumnosMap[c.alumno_db_id] || alumnosMap[c.alumno_id];
          if (alumnoDB && c.alumnos && c.alumnos.length > 0) {
            c.alumnos[0] = {
              ...c.alumnos[0],
              horas_acumuladas: alumnoDB.horas_acumuladas,
              modalidad: alumnoDB.modalidad,
            };
            c.modulo = calcularModuloActual(alumnoDB.horas_acumuladas);
          } else {
            c.modulo = 1;
          }
          return c;
        });

        const clasesGratisMerge = (clasesGratisData || []).map((cg) => ({
          ...cg,
          esGratis: true,
          modulo: 1,
          alumnos: [{ nombre: cg.nombre, telefono: cg.telefono, id: cg.id }],
        }));

        const todas = [...clasesNormales, ...clasesGratisMerge].sort(
          (a, b) => new Date(b.fecha) - new Date(a.fecha)
        );

        setClases(todas);
      }

      setPagos(pagosData || []);
      setAlumnos(alumnosResp || []);
      setLoading(false);
    };

    cargarDatos();

    // Supabase Realtime para clases
    const channel = supabase
      .channel("profesor-data-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clases" },
        () => { if (activo) cargarDatos(); }
      )
      .subscribe();

    return () => {
      activo = false;
      supabase.removeChannel(channel);
    };
  }, []);

  return { clases, pagos, alumnos, loading };
}
