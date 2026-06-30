-- ==============================================================================
-- FASE 5: ESTRUCTURA ACADÉMICA (COLEGIOS)
-- Tablas: Jornadas, Grados, Grupos, Asignaturas, Asignaciones Académicas
-- ==============================================================================

-- 1. TABLA JORNADAS (Mañana, Tarde, Única, Sabatina)
CREATE TABLE IF NOT EXISTS public.jornadas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL, -- Ej: 'Mañana', 'Tarde', 'Única'
    hora_inicio TIME,
    hora_fin TIME,
    estado VARCHAR(20) DEFAULT 'activo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. TABLA GRADOS (Ej. Primero, Segundo, Séptimo)
CREATE TABLE IF NOT EXISTS public.grados (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL, -- Ej: 'Grado 1', 'Transición'
    nivel VARCHAR(50) NOT NULL, -- Ej: 'Preescolar', 'Primaria', 'Bachillerato'
    orden INT DEFAULT 0, -- Para ordenar (Ej. 1, 2, 3...)
    estado VARCHAR(20) DEFAULT 'activo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. TABLA GRUPOS (Ej. 1A, 1B, 7C)
CREATE TABLE IF NOT EXISTS public.grupos (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    grado_id UUID REFERENCES public.grados(id) ON DELETE CASCADE,
    jornada_id UUID REFERENCES public.jornadas(id) ON DELETE SET NULL,
    nombre VARCHAR(50) NOT NULL, -- Ej: 'A', 'B', 'C' o '1A'
    director_id UUID REFERENCES public.profesores(id) ON DELETE SET NULL, -- Director de grupo
    cupo_maximo INT DEFAULT 30,
    estado VARCHAR(20) DEFAULT 'activo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 4. TABLA ASIGNATURAS / MATERIAS (Malla curricular)
CREATE TABLE IF NOT EXISTS public.asignaturas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    grado_id UUID REFERENCES public.grados(id) ON DELETE CASCADE,
    nombre VARCHAR(150) NOT NULL, -- Ej: 'Matemáticas', 'Biología'
    area_conocimiento VARCHAR(100), -- Ej: 'Ciencias Exactas'
    intensidad_horaria INT DEFAULT 4, -- Horas por semana
    estado VARCHAR(20) DEFAULT 'activo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 5. TABLA ASIGNACIONES ACADÉMICAS (Qué profesor dicta qué materia a qué grupo)
CREATE TABLE IF NOT EXISTS public.asignaciones_academicas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    profesor_id UUID REFERENCES public.profesores(id) ON DELETE CASCADE,
    asignatura_id UUID REFERENCES public.asignaturas(id) ON DELETE CASCADE,
    grupo_id UUID REFERENCES public.grupos(id) ON DELETE CASCADE,
    anio_lectivo INT NOT NULL, -- Ej: 2026
    estado VARCHAR(20) DEFAULT 'activo',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(asignatura_id, grupo_id, anio_lectivo) -- Una materia en un grupo en un año la da 1 solo profe
);

-- 6. POLÍTICAS DE SEGURIDAD (RLS)
ALTER TABLE public.jornadas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asignaturas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asignaciones_academicas ENABLE ROW LEVEL SECURITY;

-- Políticas permisivas (ajustar luego con auth.uid() para multi-tenant si es necesario)
CREATE POLICY "Permitir lectura a todos los usuarios autenticados" ON public.jornadas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir lectura a todos los usuarios autenticados" ON public.grados FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir lectura a todos los usuarios autenticados" ON public.grupos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir lectura a todos los usuarios autenticados" ON public.asignaturas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Permitir lectura a todos los usuarios autenticados" ON public.asignaciones_academicas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Permitir todo a administradores" ON public.jornadas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a administradores" ON public.grados FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a administradores" ON public.grupos FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a administradores" ON public.asignaturas FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Permitir todo a administradores" ON public.asignaciones_academicas FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Insertar Jornadas por defecto
INSERT INTO public.jornadas (nombre) VALUES ('Mañana'), ('Tarde'), ('Única');
