-- 1. Eliminar profesores de la tabla public.profesores
TRUNCATE TABLE public.profesores CASCADE;

-- 2. Eliminar usuarios con rol 'profesor' de public.usuarios para poder crearlos de nuevo desde cero
DELETE FROM public.usuarios WHERE role = 'profesor';

-- 3. Si hay datos en Auth, es más seguro dejar que el sistema cree nuevos correos o que el admin los borre desde Supabase Auth Panel si es estrictamente necesario,
-- pero al borrarlos de public.usuarios, el sistema los tratará como nuevos registros para efectos de la plataforma.

-- (Opcional) Restablecer secuencias si existieran
-- No hay secuencias nativas en profesores si el ID es UUID.

-- Nota: La tabla public.profesores utiliza la columna 'data' (JSONB) para almacenar toda la información del docente, 
-- por lo que no es necesario alterar el esquema con nuevas columnas. Todo el esquema escolar (jornada, temas, seguimiento, vacaciones) 
-- se almacenará en formato JSON dentro de esta columna.
