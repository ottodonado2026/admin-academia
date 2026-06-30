-- ==============================================================================
-- FASE 6: MÓDULO DE ALUMNOS (COLEGIOS)
-- ==============================================================================

-- 1. LIMPIEZA DE DATOS ANTIGUOS (De la Academia)
-- Como se solicitó, limpiamos la base de datos de alumnos para arrancar desde cero.
-- NOTA: Esto eliminará los alumnos de prueba antiguos.
DELETE FROM public.alumnos;

-- 2. AÑADIR NUEVAS COLUMNAS FINANCIERAS Y DE COLEGIO
ALTER TABLE public.alumnos 
ADD COLUMN IF NOT EXISTS grado_id UUID REFERENCES public.grados(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS grupo_id UUID REFERENCES public.grupos(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS parentesco_acudiente VARCHAR(50),
ADD COLUMN IF NOT EXISTS tipo_sangre VARCHAR(10),
ADD COLUMN IF NOT EXISTS alergias TEXT,
ADD COLUMN IF NOT EXISTS contacto_emergencia VARCHAR(50),
ADD COLUMN IF NOT EXISTS valor_matricula NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_mensualidad NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS dia_corte_pago INT DEFAULT 5,
ADD COLUMN IF NOT EXISTS ultimo_mes_pagado DATE; -- Servirá para saber si está al día

-- Comentarios explicativos
COMMENT ON COLUMN public.alumnos.valor_matricula IS 'Valor de inscripción o matrícula inicial (pago único)';
COMMENT ON COLUMN public.alumnos.valor_mensualidad IS 'Valor de la pensión mensual que debe pagar el alumno';
COMMENT ON COLUMN public.alumnos.dia_corte_pago IS 'Día del mes (1 al 31) límite para pagar la mensualidad antes de entrar en mora';
COMMENT ON COLUMN public.alumnos.ultimo_mes_pagado IS 'Fecha (generalmente el primer día del mes pagado) para llevar control de pagos';
