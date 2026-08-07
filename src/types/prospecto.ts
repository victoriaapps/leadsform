export type UserRole = 'superadmin' | 'admin' | 'operador';

export interface Empresa {
  id: string;
  nombre: string;
  logo_url?: string | null;
  color_palette?: string | null;
  ciudades?: string[];
  marcas?: string[];
  modelos_por_marca?: Record<string, string[]>; // Marca -> Lista de Modelos (Relacionado)
  created_at?: string;
}

export interface UsuarioPerfil {
  id: string;
  email: string;
  nombre: string;
  rol: UserRole;
  empresa_id?: string | null;
  empresa_nombre?: string;
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
