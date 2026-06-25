import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS headers para poder invocarlo desde el frontend local o producción
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // Puedes restringirlo a tu dominio en produccion
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido. Usa POST.' });
  }

  try {
    const supabaseUrl = process.env.VITE_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Variables de entorno de Supabase no configuradas (Falta SUPABASE_SERVICE_ROLE_KEY)');
    }

    // Inicializar cliente de Supabase con el Service Role Key para poder saltarse el RLS y usar Admin API
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { solicitudId, accion, adminAuthUid } = req.body;

    if (!solicitudId || !accion || !adminAuthUid) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos.' });
    }

    // 1. Verificar que quien hace la solicitud sea un admin válido (opcional pero recomendado)
    const { data: adminUser, error: adminError } = await supabaseAdmin
      .from('usuarios')
      .select('role')
      .eq('auth_uid', adminAuthUid)
      .single();

    if (adminError || !adminUser || !['admin', 'owner', 'coordinador_academico'].includes(adminUser.role.toLowerCase())) {
      return res.status(403).json({ error: 'No tienes permisos para aprobar solicitudes.' });
    }

    // 2. Obtener la solicitud
    const { data: solicitud, error: solError } = await supabaseAdmin
      .from('solicitudes')
      .select('*')
      .eq('id', solicitudId)
      .single();

    if (solError || !solicitud) {
      return res.status(404).json({ error: 'Solicitud no encontrada.' });
    }

    if (solicitud.estado !== 'pendiente') {
      return res.status(400).json({ error: `La solicitud ya fue procesada (${solicitud.estado}).` });
    }

    if (accion === 'rechazar') {
      await supabaseAdmin.from('solicitudes').update({ estado: 'rechazado' }).eq('id', solicitudId);
      return res.status(200).json({ message: 'Solicitud rechazada correctamente.' });
    }

    // Accion = 'aprobar'
    if (solicitud.tipo === 'cambio_clave') {
      const { solicitante_tipo, solicitante_id, nueva_clave } = solicitud;

      if (solicitante_tipo === 'profesor') {
        // Los profesores guardan la clave en la tabla "profesores" en la columna "data"
        const { data: profesorDb, error: profErr } = await supabaseAdmin
          .from('profesores')
          .select('data')
          .eq('id', solicitante_id)
          .single();
          
        if (profErr || !profesorDb) throw new Error('Profesor no encontrado');

        const nuevoData = { ...profesorDb.data, password: nueva_clave };
        
        const { error: updateProfErr } = await supabaseAdmin
          .from('profesores')
          .update({ data: nuevoData })
          .eq('id', solicitante_id);
          
        if (updateProfErr) throw updateProfErr;
      } 
      else if (solicitante_tipo === 'asesor') {
        // Los asesores usan Supabase Auth. Buscamos su auth_uid en la tabla "asesores"
        const { data: asesor, error: aseErr } = await supabaseAdmin
          .from('asesores')
          .select('auth_uid')
          .eq('asesor_id', solicitante_id)
          .single();

        if (aseErr || !asesor) throw new Error('Asesor no encontrado');

        // Actualizamos la clave en Supabase Auth
        const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
          asesor.auth_uid,
          { password: nueva_clave }
        );

        if (authErr) throw authErr;
      }

      // Marcar solicitud como aprobada
      await supabaseAdmin.from('solicitudes').update({ estado: 'aprobado' }).eq('id', solicitudId);
      return res.status(200).json({ message: 'Contraseña actualizada y solicitud aprobada.' });
    } 
    
    // Si la solicitud es de otro tipo (ej: edicion_datos), simplemente la marcamos como aprobada
    // (Asumimos que el front hace el cambio, o aquí podemos agregar la lógica para aplicarlo)
    else {
      await supabaseAdmin.from('solicitudes').update({ estado: 'aprobado' }).eq('id', solicitudId);
      return res.status(200).json({ message: 'Solicitud aprobada.' });
    }

  } catch (error) {
    console.error('Error en cambiarPassword:', error);
    return res.status(500).json({ error: error.message || 'Error interno del servidor.' });
  }
}
