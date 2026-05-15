import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    const body = await req.json();

   const {
  nombre,
  email,
  password,
  tipo_documento,
  numero_documento,
  telefono,
  ciudad,
  direccion,
  fecha_ingreso,
  area_academica,
  estado,
  observaciones,
  role,
  coordinador_nivel,
  puede_registrar_coordinadores,
  creado_por,
  creado_por_nombre,
} = body;

    if (!email || !password || !nombre) {
      return new Response(
        JSON.stringify({
          error: "Faltan datos obligatorios: nombre, email o password.",
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          error: "Faltan variables SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY.",
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { data: authData, error: authError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      return new Response(
        JSON.stringify({
          error: authError.message,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const authUser = authData.user;

    const { error: insertError } = await supabaseAdmin
      .from("usuarios")
      .insert({
  auth_uid: authUser.id,
  nombre,
  email,
  role: role || "coordinador_academico",

  tipo_documento: tipo_documento || null,
  numero_documento: numero_documento || null,
  telefono: telefono || null,
  ciudad: ciudad || null,
  direccion: direccion || null,
  fecha_ingreso: fecha_ingreso || null,
  area_academica: area_academica || null,
  estado: estado || "activo",
  observaciones: observaciones || null,

  coordinador_nivel: coordinador_nivel || "secundario",
  puede_registrar_coordinadores:
    puede_registrar_coordinadores === true,

  creado_por: creado_por || null,
  creado_por_nombre: creado_por_nombre || null,
});

    if (insertError) {
      return new Response(
        JSON.stringify({
          error: insertError.message,
        }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: authUser,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error inesperado en la función.";

    return new Response(
      JSON.stringify({
        error: message,
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});