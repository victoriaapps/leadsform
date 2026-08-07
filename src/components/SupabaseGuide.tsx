import React, { useState } from 'react';
import { Database, Check, Copy, ShieldCheck, Layers } from 'lucide-react';
import { isSupabaseConfigured } from '../lib/supabase';

export const SupabaseGuide: React.FC = () => {
  const [copiedSql, setCopiedSql] = useState(false);

  const sqlScript = `-- ===================================================
-- SCRIPT DE CORRECCIÓN DE RESTRICCIONES DE CLAVE FORÁNEA
-- Elimina restricciones rígidas en la tabla 'prospectos'
-- ===================================================

-- 1. ELIMINAR RESTRICCIONES DE CLAVE FORÁNEA RÍGIDAS EN PROSPECTOS
ALTER TABLE IF EXISTS prospectos DROP CONSTRAINT IF EXISTS prospectos_creado_por_fkey;
ALTER TABLE IF EXISTS prospectos DROP CONSTRAINT IF EXISTS prospectos_empresa_id_fkey;

-- 2. ELIMINAR RESTRICCIÓN EN PERFILES
ALTER TABLE IF EXISTS perfiles DROP CONSTRAINT IF EXISTS perfiles_id_fkey;

-- 3. ASEGURAR ESTRUCTURA DE TABLAS
CREATE TABLE IF NOT EXISTS empresas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS perfiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password TEXT,
  rol TEXT NOT NULL CHECK (rol IN ('superadmin', 'admin', 'operador')),
  empresa_id UUID REFERENCES empresas(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS prospectos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  ciudad TEXT,
  contacto TEXT NOT NULL,
  marca TEXT NOT NULL,
  modelo TEXT NOT NULL,
  observacion TEXT,
  empresa_id UUID,
  creado_por UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS empresa_id UUID;
ALTER TABLE prospectos ADD COLUMN IF NOT EXISTS creado_por UUID;

-- 4. HABILITAR RLS Y PERMISOS DE INSERCIÓN Y LECTURA
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE perfiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE prospectos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Permitir crear prospectos" ON prospectos;
DROP POLICY IF EXISTS "Permitir leer prospectos" ON prospectos;
CREATE POLICY "Permitir crear prospectos" ON prospectos FOR INSERT WITH CHECK (true);
CREATE POLICY "Permitir leer prospectos" ON prospectos FOR SELECT USING (true);
`;

  const copyToClipboard = (text: string, setFn: (val: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setFn(true);
    setTimeout(() => setFn(false), 2000);
  };

  return (
    <div className="guide-card">
      <div className="guide-header">
        <div className="guide-badge">
          {isSupabaseConfigured ? (
            <span className="status-badge connected">
              <ShieldCheck size={16} /> Supabase Conectado
            </span>
          ) : (
            <span className="status-badge demo">
              <Layers size={16} /> Modo Demostración Local
            </span>
          )}
        </div>
        <h2 className="guide-title">
          <Database className="icon-gradient" size={26} /> Script SQL Corrección Clave Foránea `prospectos_creado_por_fkey`
        </h2>
        <p className="guide-subtitle">
          Ejecuta este script en Supabase para solucionar el error de clave foránea al registrar prospectos como Operador o Admin.
        </p>
      </div>

      <div className="steps-grid">
        <div className="step-box">
          <div className="step-number">1</div>
          <div className="step-content">
            <h3>Ejecutar el Script en SQL Editor</h3>
            <p>
              Copia y pega este script en el <strong>SQL Editor</strong> de Supabase y presiona <strong>RUN</strong>:
            </p>
            <div className="code-block-container">
              <button 
                className="btn-copy"
                onClick={() => copyToClipboard(sqlScript, setCopiedSql)}
              >
                {copiedSql ? <Check size={14} /> : <Copy size={14} />}
                {copiedSql ? 'Copiado' : 'Copiar Script SQL'}
              </button>
              <pre className="code-block"><code>{sqlScript}</code></pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
