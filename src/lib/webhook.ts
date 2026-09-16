import type { Prospecto, UsuarioPerfil, Empresa } from '../types/prospecto';

export interface WebhookPayloadContext {
  prospecto: Prospecto;
  currentUser?: UsuarioPerfil | null;
  empresa?: Empresa | null;
  perfiles?: UsuarioPerfil[];
}

export interface WebhookSendResult {
  success: boolean;
  statusCode?: number;
  statusText?: string;
  responseBody?: string;
  error?: string;
  compiledBody?: string;
  timestamp?: string;
}

export const DEFAULT_ENDPOINT_BODY = `{
  "ciudad": "{ciudad}",
  "modelo": "{modelo}",
  "nombre": "{nombre}",
  "origen": "Expocruz",
  "pagina": "Expocruz",
  "campaign": "Expocruz",
  "telefono": "{contacto}",
  "codUsuario": "{codUsuario}",
  "financiamiento": "{observacion}"
}`;

export const AVAILABLE_VARIABLES = [
  // CAMPOS DEL FORMULARIO DE REGISTRO
  { token: '{nombre}', label: 'Nombre Completo', description: 'Campo Nombre Completo del formulario', category: 'formulario' },
  { token: '{ciudad}', label: 'Ciudad', description: 'Campo Ciudad del formulario', category: 'formulario' },
  { token: '{contacto}', label: 'Teléfono', description: 'Campo Teléfono del formulario', category: 'formulario' },
  { token: '{marca}', label: 'Marca del Vehículo', description: 'Campo Marca del formulario', category: 'formulario' },
  { token: '{modelo}', label: 'Modelo', description: 'Campo Modelo del formulario', category: 'formulario' },
  { token: '{observacion}', label: 'Observaciones', description: 'Campo Observaciones Adicionales del formulario', category: 'formulario' },

  // CAMPOS DE USUARIO, EMPRESA Y SISTEMA
  { token: '{codUsuario}', label: 'Código de Usuario', description: 'Código alfanumérico opcional asignado al usuario', category: 'sistema' },
  { token: '{usuario_nombre}', label: 'Nombre de Usuario', description: 'Nombre completo del operador en sesión', category: 'sistema' },
  { token: '{empresa_nombre}', label: 'Empresa', description: 'Nombre de la empresa asignada', category: 'sistema' },
  { token: '{created_at}', label: 'Fecha de Registro', description: 'Fecha ISO de creación del lead', category: 'sistema' },
  { token: '{es_reserva}', label: 'Es Reserva', description: 'Indica si el lead fue marcado como reserva (true/false)', category: 'sistema' },
];

/**
 * Resuelve el valor de una variable individual.
 */
export function resolveVariableValue(token: string, context: WebhookPayloadContext): string {
  const clean = token.replace(/^\{|\}$/g, '').trim();
  const lower = clean.toLowerCase();

  // 1. Mapeos explícitos
  if (['contactname', 'nombre', 'cliente'].includes(lower)) {
    return context.prospecto.nombre || '';
  }
  if (['defaultidentifier', 'telefono', 'contacto', 'phone'].includes(lower)) {
    return context.prospecto.contacto || '';
  }
  if (['ciudad'].includes(lower)) {
    return context.prospecto.ciudad || '';
  }
  if (['marca'].includes(lower)) {
    return context.prospecto.marca || '';
  }
  if (['modelo'].includes(lower)) {
    return context.prospecto.modelo || '';
  }
  if (['financiacion', 'financiamiento', 'observacion', 'observaciones'].includes(lower)) {
    return context.prospecto.observacion || '';
  }
  if (
    ['codusuario', 'cod_usuario', 'assistantmeta.codusuario', 'usuarioid', 'user_id'].includes(lower) ||
    clean === 'assistantMeta.CodUsuario'
  ) {
    // 1. Si el prospecto ya incluye directamente el código del usuario creador
    if (context.prospecto.creado_por_cod_usuario) {
      return context.prospecto.creado_por_cod_usuario;
    }

    // 2. Buscar en la lista de perfiles al usuario creador/dueño del prospecto por ID
    if (context.perfiles && context.prospecto.creado_por) {
      const ownerUser = context.perfiles.find(u => u.id === context.prospecto.creado_por);
      if (ownerUser?.cod_usuario) {
        return ownerUser.cod_usuario;
      }
    }

    // 3. Si el creador es el usuario en sesión actual
    if (
      context.currentUser?.cod_usuario &&
      (!context.prospecto.creado_por || context.prospecto.creado_por === context.currentUser.id)
    ) {
      return context.currentUser.cod_usuario;
    }

    // 4. Fallback general: solo devolver el cod_usuario si existe, NUNCA el ID/UUID
    return context.currentUser?.cod_usuario || '';
  }
  if (['creado_por_nombre', 'usuarionombre', 'usuario_nombre', 'user_name'].includes(lower)) {
    return context.currentUser?.nombre || context.prospecto.creado_por_nombre || '';
  }
  if (['empresa_id', 'empresaid'].includes(lower)) {
    return context.empresa?.id || context.prospecto.empresa_id || '';
  }
  if (['empresa_nombre', 'empresanombre', 'empresa'].includes(lower)) {
    return context.empresa?.nombre || context.prospecto.empresa_nombre || '';
  }
  if (['id', 'prospectoid'].includes(lower)) {
    return context.prospecto.id || '';
  }
  if (['created_at', 'fecha'].includes(lower)) {
    return context.prospecto.created_at || new Date().toISOString();
  }
  if (['es_reserva', 'reserva'].includes(lower)) {
    return context.prospecto.es_reserva ? 'true' : 'false';
  }

  // 2. Búsqueda por propiedad anidada (e.g. assistantMeta.CodUsuario)
  if (clean.includes('.')) {
    const [head, tail] = clean.split('.');
    if (head.toLowerCase() === 'assistantmeta' && tail.toLowerCase() === 'codusuario') {
      return context.currentUser?.cod_usuario || context.prospecto.creado_por_cod_usuario || '';
    }
  }

  // 3. Reemplazo por clave exacta en prospecto
  if (clean in context.prospecto) {
    return String((context.prospecto as any)[clean] ?? '');
  }

  return '';
}

/**
 * Reemplaza variables en la plantilla de body JSON de forma segura.
 */
export function compileJsonTemplate(template: string, context: WebhookPayloadContext): string {
  const rawTemplate = template && template.trim() ? template : DEFAULT_ENDPOINT_BODY;

  // Reemplazar patrones {variable} escapando comillas para asegurar JSON válido
  const compiledString = rawTemplate.replace(/\{([^{}]+)\}/g, (_, token) => {
    const val = resolveVariableValue(token, context);
    // Usamos JSON.stringify y quitamos las comillas exteriores para escapar saltos de línea y comillas internas
    return JSON.stringify(val).slice(1, -1);
  });

  return compiledString;
}

/**
 * Valida si un string es un JSON válido.
 */
export function validateJsonString(jsonStr: string): { isValid: boolean; error?: string } {
  try {
    JSON.parse(jsonStr);
    return { isValid: true };
  } catch (err: any) {
    return { isValid: false, error: err.message || 'Sintaxis JSON inválida' };
  }
}

/**
 * Realiza la petición POST enviando el lead al endpoint configurado.
 */
export async function sendLeadToEndpoint(
  url: string,
  template: string,
  context: WebhookPayloadContext
): Promise<WebhookSendResult> {
  const timestamp = new Date().toISOString();

  if (!url || !url.trim()) {
    return {
      success: false,
      error: 'La URL del endpoint no está configurada.',
      timestamp,
    };
  }

  const compiledBody = compileJsonTemplate(template, context);

  try {
    const response = await fetch(url.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: compiledBody,
    });

    const responseText = await response.text();

    return {
      success: response.ok,
      statusCode: response.status,
      statusText: response.statusText,
      responseBody: responseText.slice(0, 1000),
      compiledBody,
      timestamp,
    };
  } catch (err: any) {
    // Si la petición directa desde el navegador es bloqueada por CORS, intentar proxy local
    try {
      const proxyUrl = `/api-proxy?url=${encodeURIComponent(url.trim())}`;
      const proxyResponse = await fetch(proxyUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: compiledBody,
      });

      const proxyText = await proxyResponse.text();
      return {
        success: proxyResponse.ok,
        statusCode: proxyResponse.status,
        statusText: proxyResponse.statusText,
        responseBody: proxyText.slice(0, 1000),
        compiledBody,
        timestamp,
      };
    } catch (_proxyErr) {
      // Ignorar fallback si el proxy tampoco responde
    }

    let errorMsg = err.message || 'Error de red o conexión al intentar enviar al endpoint POST.';
    if (err.name === 'TypeError' || (err.message && (err.message.includes('Failed to fetch') || err.message.includes('fetch')))) {
      errorMsg = `Failed to fetch: El navegador bloqueó la petición POST a "${url.trim()}". Causas principales: 1) La URL no permite peticiones desde navegador (falta cabecera CORS Access-Control-Allow-Origin). 2) La URL no existe o devuelve error SSL.`;
    }
    return {
      success: false,
      error: errorMsg,
      compiledBody,
      timestamp,
    };
  }
}
