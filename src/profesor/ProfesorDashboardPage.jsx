import { useEffect, useState } from "react";
import "./ProfesorDashboardPage.css";

export default function ProfesorDashboardPage() {
  const [stats, setStats] = useState({
    totalAlumnos: 0,
    enMora: 0,
    clasesHoy: 0,
    horasTotales: 0,
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user"));
    const alumnos = JSON.parse(localStorage.getItem("alumnos")) || [];
    const pagos = JSON.parse(localStorage.getItem("pagos")) || [];
    const clases = JSON.parse(localStorage.getItem("clases")) || [];

    const misClases = clases.filter(
      (c) => String(c.profesorId) === String(user?.id)
    );

    const hoy = new Date().toISOString().split("T")[0];

    const clasesHoy = misClases.filter(
      (c) => c.fecha === hoy
    ).length;

    const alumnosIds = new Set();

    misClases.forEach((c) => {
      c.alumnos?.forEach((a) => {
        alumnosIds.add(a.id);
      });
    });

    const totalAlumnos = alumnosIds.size;

    const enMora = Array.from(alumnosIds).filter((id) => {
      const pagosAlumno = pagos.filter((p) => p.alumnoId === id);
      return pagosAlumno.some((p) => p.estado === "pendiente");
    }).length;

    const horasTotales = misClases.reduce(
      (acc, c) => acc + (c.duracionHoras || 0),
      0
    );

    setStats({
      totalAlumnos,
      enMora,
      clasesHoy,
      horasTotales,
    });
  }, []);

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <h2>Dashboard</h2>
        <p>Resumen general de tu actividad como profesor</p>
      </div>

      <div className="dashboard-grid">
        <Card title="Alumnos" value={stats.totalAlumnos} />
        <Card title="En mora" value={stats.enMora} />
        <Card title="Clases hoy" value={stats.clasesHoy} />
        <Card title="Horas totales" value={stats.horasTotales} />
      </div>
    </div>
  );
}

function Card({ title, value }) {
  return (
    <div className="dashboard-card">
      <span>{title}</span>
      <h2>{value}</h2>
    </div>
  );
}