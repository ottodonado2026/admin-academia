import { supabase } from "./supabaseClient";

export const getLeads = async () => {
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error cargando leads:", error);
    return [];
  }

  // 🔥 Adaptar a tu frontend actual
  return data.map((l) => ({
    ...l,
    id: l.id,
    cursoId: l.curso_id,
    cursoNombre: l.curso_nombre,
    asesorId: l.asesor_id,
    createdAt: l.created_at,
    tipoCliente: l.tipo_cliente,
    modalidad: l.modalidad,
    tipoPrograma: l.tipo_programa,
    descuento: l.descuento,
  }));
};