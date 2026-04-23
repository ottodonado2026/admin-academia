export default function EstadoAlumnoBadge({ porcentaje = 0 }) {
  let estado = "danger";
  let label = "Atrasado";

  if (porcentaje >= 80) {
    estado = "ok";
    label = "Al día";
  } else if (porcentaje >= 40) {
    estado = "warn";
    label = "En progreso";
  }

  return (
    <span className={`estado-badge ${estado}`}>
      {label}
    </span>
  );
}