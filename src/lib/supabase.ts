import { createClient } from '@supabase/supabase-js';
import type { Prospecto, Empresa, UsuarioPerfil, WebhookLogEntry } from '../types/prospecto';

const DEFAULT_SUPABASE_URL = 'https://mqvluwuqirizkydkjvhm.supabase.co';
const DEFAULT_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1xdmx1d3VxaXJpemt5ZGtqdmhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODU5MjI0NTQsImV4cCI6MjEwMTQ5ODQ1NH0.QnxndUQh-8Ml0yMvlKzxr6YFlrfcguyqLRWcOLljEPU';

const rawUrl = (import.meta.env.VITE_SUPABASE_URL || '').trim();
const rawKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || '').trim();

const supabaseUrl = (rawUrl && rawUrl.startsWith('https://') && !rawUrl.includes('tu-proyecto')) 
  ? rawUrl 
  : DEFAULT_SUPABASE_URL;

const supabaseAnonKey = (rawKey && rawKey.startsWith('eyJ') && rawKey.length > 50) 
  ? rawKey 
  : DEFAULT_SUPABASE_ANON_KEY;

const isTestEnv = Boolean(
  import.meta.env.VITEST || 
  import.meta.env.MODE === 'test' ||
  typeof (globalThis as any).__vitest_worker__ !== 'undefined'
);

export const isSupabaseConfigured = Boolean(
  !isTestEnv &&
  supabaseUrl && 
  supabaseAnonKey
);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export function generateUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function isUuid(val?: string | null): boolean {
  if (!val) return false;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
}

export async function uploadCompanyLogoFile(file: File): Promise<string | null> {
  if (isSupabaseConfigured && supabase) {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('empresas-logos')
        .upload(filePath, file, { upsert: true });

      if (!uploadError) {
        const { data: publicUrlData } = supabase.storage
          .from('empresas-logos')
          .getPublicUrl(filePath);
        return publicUrlData.publicUrl;
      }
    } catch (e) {
      console.warn('Storage bucket no disponible, usando DataURL local', e);
    }
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

// ==========================================
// DEMO LOCAL STORAGE ENGINE
// ==========================================
const STORAGE_EMPRESAS = 'prospectos_demo_empresas_v9';
const STORAGE_PERFILES = 'prospectos_demo_perfiles_v9';
const STORAGE_PROSPECTOS = 'prospectos_demo_prospectos_v9';
const STORAGE_CURRENT_USER = 'prospectos_demo_current_user_v9';
const STORAGE_WEBHOOK_LOGS = 'prospectos_demo_webhook_logs_v9';

const UUID_EMP_1 = '11111111-1111-4111-a111-111111111111';
const UUID_EMP_2 = '22222222-2222-4222-a222-222222222222';
const UUID_USR_SUPER = '99999999-9999-4999-a999-999999999999';
const UUID_USR_ADMIN1 = '88888888-8888-4888-a888-888888888888';
const UUID_USR_OP1 = '77777777-7777-4777-a777-777777777777';
const UUID_USR_OP2 = '66666666-6666-4666-a666-666666666666';

// 1. EMPRESAS DEMO
export function getDemoEmpresas(): Empresa[] {
  try {
    const data = localStorage.getItem(STORAGE_EMPRESAS);
    if (!data) {
      const initial: Empresa[] = [
        { 
          id: UUID_EMP_1, 
          nombre: 'RAFCAR MOTORS', 
          logo_url: 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=120&auto=format&fit=crop&q=80',
          color_palette: 'blue',
          ciudades: [],
          marcas: [],
          modelos_por_marca: {},
          endpoint_url: '',
          endpoint_enabled: false,
          endpoint_body_template: `{
  "ciudad": "{ciudad}",
  "modelo": "{modelo}",
  "nombre": "{nombre}",
  "origen": "Expocruz",
  "pagina": "Expocruz",
  "campaign": "Expocruz",
  "telefono": "{contacto}",
  "codUsuario": "{codUsuario}",
  "financiamiento": "{observacion}"
}`,
          created_at: new Date().toISOString() 
        },
        { 
          id: UUID_EMP_2, 
          nombre: 'Autos del Sur Ltda.', 
          logo_url: 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=120&auto=format&fit=crop&q=80',
          color_palette: 'green',
          ciudades: [],
          marcas: [],
          modelos_por_marca: {},
          endpoint_url: '',
          endpoint_enabled: false,
          endpoint_body_template: `{
  "ciudad": "{ciudad}",
  "modelo": "{modelo}",
  "nombre": "{nombre}",
  "origen": "Expocruz",
  "pagina": "Expocruz",
  "campaign": "Expocruz",
  "telefono": "{contacto}",
  "codUsuario": "{codUsuario}",
  "financiamiento": "{observacion}"
}`,
          created_at: new Date().toISOString() 
        },
      ];
      localStorage.setItem(STORAGE_EMPRESAS, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

export function saveDemoEmpresa(
  nombre: string, 
  logo_url?: string | null, 
  color_palette?: string | null, 
  ciudades?: string[],
  marcas?: string[],
  modelos_por_marca?: Record<string, string[]>,
  idFixed?: string,
  endpoint_url?: string | null,
  endpoint_enabled?: boolean,
  endpoint_body_template?: string | null
): Empresa {
  const list = getDemoEmpresas();
  const newEmp: Empresa = {
    id: idFixed || generateUUID(),
    nombre,
    logo_url: logo_url || null,
    color_palette: color_palette || 'indigo',
    ciudades: ciudades || [],
    marcas: marcas || [],
    modelos_por_marca: modelos_por_marca || {},
    endpoint_url: endpoint_url || null,
    endpoint_enabled: endpoint_enabled ?? false,
    endpoint_body_template: endpoint_body_template || null,
    created_at: new Date().toISOString()
  };
  const updated = [newEmp, ...list];
  localStorage.setItem(STORAGE_EMPRESAS, JSON.stringify(updated));
  return newEmp;
}

export function updateDemoEmpresa(id: string, updates: Partial<Empresa>): void {
  const list = getDemoEmpresas();
  const updated = list.map((e) => (e.id === id ? { ...e, ...updates } : e));
  localStorage.setItem(STORAGE_EMPRESAS, JSON.stringify(updated));
}

// 2. PERFILES DEMO
export function getDemoPerfiles(): UsuarioPerfil[] {
  try {
    const data = localStorage.getItem(STORAGE_PERFILES);
    if (!data) {
      const initial: UsuarioPerfil[] = [
        {
          id: UUID_USR_SUPER,
          email: 'victoria.leads',
          password: 'Diego###888',
          nombre: 'Superadmin Victoria',
          rol: 'superadmin',
          empresa_id: null,
          cod_usuario: 'SUPER-01',
          created_at: new Date().toISOString()
        },
        {
          id: UUID_USR_ADMIN1,
          email: 'admin.motors@empresa.com',
          password: '123',
          nombre: 'admin rafcar',
          rol: 'admin',
          empresa_id: UUID_EMP_1,
          cod_usuario: 'ADM-101',
          created_at: new Date().toISOString()
        },
        {
          id: UUID_USR_OP1,
          email: 'op1',
          password: '123',
          nombre: 'perfil 1',
          rol: 'operador',
          empresa_id: UUID_EMP_1,
          cod_usuario: 'OP-201',
          created_at: new Date().toISOString()
        },
        {
          id: UUID_USR_OP2,
          email: 'op2',
          password: '123',
          nombre: 'perfil 2',
          rol: 'operador',
          empresa_id: UUID_EMP_1,
          cod_usuario: 'OP-202',
          created_at: new Date().toISOString()
        }
      ];
      localStorage.setItem(STORAGE_PERFILES, JSON.stringify(initial));
      return initial;
    }
    return JSON.parse(data);
  } catch (e) {
    return [];
  }
}

export function saveDemoPerfil(perfil: Omit<UsuarioPerfil, 'id'>, idFixed?: string): UsuarioPerfil {
  const list = getDemoPerfiles();
  const newPerfil: UsuarioPerfil = {
    ...perfil,
    id: idFixed || generateUUID(),
    created_at: new Date().toISOString()
  };
  const updated = [newPerfil, ...list];
  localStorage.setItem(STORAGE_PERFILES, JSON.stringify(updated));
  return newPerfil;
}

export function updateDemoPerfil(id: string, updates: Partial<UsuarioPerfil>): void {
  const list = getDemoPerfiles();
  const updated = list.map((p) => (p.id === id ? { ...p, ...updates } : p));
  localStorage.setItem(STORAGE_PERFILES, JSON.stringify(updated));
}

export function updateDemoPerfilPassword(id: string, newPassword: string): void {
  updateDemoPerfil(id, { password: newPassword });
}

// 3. USUARIO ACTUAL
export function getDemoCurrentUser(): UsuarioPerfil | null {
  try {
    const data = localStorage.getItem(STORAGE_CURRENT_USER);
    if (data) return JSON.parse(data);
  } catch (e) {}
  
  return null;
}

export function setDemoCurrentUser(perfil: UsuarioPerfil): void {
  localStorage.setItem(STORAGE_CURRENT_USER, JSON.stringify(perfil));
}

export function clearDemoCurrentUser(): void {
  localStorage.removeItem(STORAGE_CURRENT_USER);
}

// 4. PROSPECTOS DEMO
export function getDemoProspectos(currentUser: UsuarioPerfil): Prospecto[] {
  try {
    const data = localStorage.getItem(STORAGE_PROSPECTOS);
    let all: Prospecto[] = [];
    if (!data) {
      all = [
        {
          id: generateUUID(),
          nombre: 'pepe',
          ciudad: 'Santiago',
          contacto: '7646431',
          marca: 'Hyundai',
          modelo: 'celerio',
          observacion: '',
          empresa_id: UUID_EMP_1,
          empresa_nombre: 'RAFCAR MOTORS',
          creado_por: UUID_USR_OP2,
          creado_por_nombre: 'perfil 2',
          created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
        },
        {
          id: generateUUID(),
          nombre: 'juan',
          ciudad: 'Bogotá',
          contacto: '784651351',
          marca: 'Nissan',
          modelo: 'Kicks',
          observacion: '',
          empresa_id: UUID_EMP_1,
          empresa_nombre: 'RAFCAR MOTORS',
          creado_por: UUID_USR_OP1,
          creado_por_nombre: 'perfil 1',
          created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
        }
      ];
      localStorage.setItem(STORAGE_PROSPECTOS, JSON.stringify(all));
    } else {
      all = JSON.parse(data);
    }

    if (!currentUser || currentUser.rol === 'superadmin') return all;
    if (currentUser.rol === 'admin') return all.filter(p => p.empresa_id === currentUser.empresa_id);
    if (currentUser.rol === 'operador') return all.filter(p => p.creado_por === currentUser.id);

    return [];
  } catch (e) {
    return [];
  }
}

export function saveDemoProspecto(prospecto: Partial<Prospecto>, currentUser?: UsuarioPerfil | null): Prospecto {
  const user = currentUser || getDemoCurrentUser();
  const data = localStorage.getItem(STORAGE_PROSPECTOS);
  const all: Prospecto[] = data ? JSON.parse(data) : [];
  
  const empresas = getDemoEmpresas();
  const targetEmpId = prospecto.empresa_id || user?.empresa_id || 'emp_rafcar';
  const emp = empresas.find(e => e.id === targetEmpId);

  const newProspecto: Prospecto = {
    nombre: prospecto.nombre || 'Sin nombre',
    contacto: prospecto.contacto || '',
    marca: prospecto.marca || '',
    modelo: prospecto.modelo || '',
    ciudad: prospecto.ciudad || '',
    observacion: prospecto.observacion || '',
    ...prospecto,
    id: prospecto.id || generateUUID(),
    empresa_id: targetEmpId,
    empresa_nombre: emp?.nombre || 'RAFCAR MOTORS',
    creado_por: prospecto.creado_por || user?.id || 'usr_admin',
    creado_por_nombre: user?.nombre || 'Usuario',
    created_at: prospecto.created_at || new Date().toISOString(),
  };

  const updated = [newProspecto, ...all];
  localStorage.setItem(STORAGE_PROSPECTOS, JSON.stringify(updated));
  return newProspecto;
}

export function deleteDemoProspecto(id: string): void {
  const data = localStorage.getItem(STORAGE_PROSPECTOS);
  if (!data) return;
  const all: Prospecto[] = JSON.parse(data);
  const updated = all.filter((item) => item.id !== id);
  localStorage.setItem(STORAGE_PROSPECTOS, JSON.stringify(updated));
}

export function deleteDemoEmpresa(id: string): void {
  const list = getDemoEmpresas();
  const updated = list.filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_EMPRESAS, JSON.stringify(updated));
}

export function deleteDemoPerfil(id: string): void {
  const list = getDemoPerfiles();
  const updated = list.filter((p) => p.id !== id);
  localStorage.setItem(STORAGE_PERFILES, JSON.stringify(updated));
}

// 5. REGISTROS / LOGS DE WEBHOOKS (HISTORIAL DE POSTS)
export function getDemoWebhookLogs(empresaId?: string): WebhookLogEntry[] {
  try {
    const data = localStorage.getItem(STORAGE_WEBHOOK_LOGS);
    const all: WebhookLogEntry[] = data ? JSON.parse(data) : [];
    if (empresaId) {
      return all.filter(l => l.empresa_id === empresaId);
    }
    return all;
  } catch (e) {
    return [];
  }
}

export function saveDemoWebhookLog(logEntry: Partial<WebhookLogEntry>): WebhookLogEntry {
  const logs = getDemoWebhookLogs();
  const newLog: WebhookLogEntry = {
    id: logEntry.id || generateUUID(),
    empresa_id: logEntry.empresa_id || '',
    prospecto_id: logEntry.prospecto_id,
    prospecto_nombre: logEntry.prospecto_nombre || 'Desconocido',
    prospecto_contacto: logEntry.prospecto_contacto || '',
    endpoint_url: logEntry.endpoint_url || '',
    success: logEntry.success ?? false,
    status_code: logEntry.status_code,
    status_text: logEntry.status_text,
    compiled_body: logEntry.compiled_body || '{}',
    response_body: logEntry.response_body,
    error: logEntry.error,
    created_at: logEntry.created_at || new Date().toISOString(),
  };

  const updated = [newLog, ...logs];
  localStorage.setItem(STORAGE_WEBHOOK_LOGS, JSON.stringify(updated));
  return newLog;
}

export function clearDemoWebhookLogs(empresaId?: string): void {
  if (empresaId) {
    const logs = getDemoWebhookLogs();
    const updated = logs.filter(l => l.empresa_id !== empresaId);
    localStorage.setItem(STORAGE_WEBHOOK_LOGS, JSON.stringify(updated));
  } else {
    localStorage.removeItem(STORAGE_WEBHOOK_LOGS);
  }
}

