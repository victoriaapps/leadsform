export type UserRole = 'superadmin' | 'admin' | 'operador';

export interface Empresa {
  id: string;
  nombre: string;
  logo_url?: string | null;
  color_palette?: string | null;
  ciudades?: string[];
  marcas?: string[];
  modelos_por_marca?: Record<string, string[]>; // Marca -> Lista de Modelos (Relacionado)
  endpoint_url?: string | null;
  endpoint_enabled?: boolean;
  endpoint_body_template?: string | null;
  created_at?: string;
}

export interface UsuarioPerfil {
  id: string;
  email: string;
  nombre: string;
  rol: UserRole;
  empresa_id?: string | null;
  empresa_nombre?: string;
  cod_usuario?: string | null; // Código alfanumérico de usuario (opcional)
  password?: string;
  created_at?: string;
}

export interface Prospecto {
  id?: string;
  nombre: string;         // OBLIGATORIO
  ciudad?: string;        // OPCIONAL
  contacto: string;       // OBLIGATORIO
  marca: string;          // OBLIGATORIO
  modelo: string;         // OBLIGATORIO
  observacion?: string;   // OPCIONAL
  empresa_id?: string | null;
  empresa_nombre?: string;
  creado_por?: string | null;
  creado_por_nombre?: string;
  creado_por_cod_usuario?: string | null;
  created_at?: string;
}

export interface FormErrorState {
  nombre?: string;
  contacto?: string;
  marca?: string;
  modelo?: string;
  empresa_id?: string;
  general?: string;
}

export interface WebhookLogEntry {
  id: string;
  empresa_id: string;
  prospecto_id?: string;
  prospecto_nombre: string;
  prospecto_contacto: string;
  endpoint_url: string;
  success: boolean;
  status_code?: number;
  status_text?: string;
  compiled_body: string;
  response_body?: string;
  error?: string;
  created_at: string;
}
