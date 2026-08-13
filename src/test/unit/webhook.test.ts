import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  compileJsonTemplate, 
  validateJsonString, 
  sendLeadToEndpoint, 
  DEFAULT_ENDPOINT_BODY,
  resolveVariableValue,
  type WebhookPayloadContext
} from '../../lib/webhook';
import type { Prospecto, UsuarioPerfil, Empresa } from '../../types/prospecto';

describe('Webhook and Endpoint POST Service', () => {
  const sampleProspecto: Prospecto = {
    id: 'lead-uuid-101',
    nombre: 'Maria Delgado',
    contacto: '71234567',
    ciudad: 'Cochabamba',
    marca: 'Suzuki',
    modelo: 'Jimny',
    observacion: 'Requiere financiamiento bancario al 100%',
    empresa_id: 'emp-1',
    empresa_nombre: 'RAFCAR MOTORS',
    creado_por: 'usr-admin-1',
    creado_por_nombre: 'Admin General',
    created_at: '2026-08-13T10:00:00.000Z',
  };

  const sampleUser: UsuarioPerfil = {
    id: 'usr-admin-1',
    email: 'admin@rafcar.com',
    nombre: 'Admin General',
    rol: 'admin',
    empresa_id: 'emp-1',
  };

  const sampleEmpresa: Empresa = {
    id: 'emp-1',
    nombre: 'RAFCAR MOTORS',
    endpoint_url: 'https://api.crm-ejemplo.com/v1/leads',
    endpoint_enabled: true,
    endpoint_body_template: DEFAULT_ENDPOINT_BODY,
  };

  const context: WebhookPayloadContext = {
    prospecto: sampleProspecto,
    currentUser: sampleUser,
    empresa: sampleEmpresa,
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  describe('resolveVariableValue', () => {
    it('debe resolver correctamente variables reales del formulario ({nombre}, {ciudad}, {contacto}, {marca}, {modelo}, {observacion}, {codUsuario})', () => {
      expect(resolveVariableValue('{nombre}', context)).toBe('Maria Delgado');
      expect(resolveVariableValue('{ciudad}', context)).toBe('Cochabamba');
      expect(resolveVariableValue('{contacto}', context)).toBe('71234567');
      expect(resolveVariableValue('{marca}', context)).toBe('Suzuki');
      expect(resolveVariableValue('{modelo}', context)).toBe('Jimny');
      expect(resolveVariableValue('{observacion}', context)).toBe('Requiere financiamiento bancario al 100%');
      expect(resolveVariableValue('{codUsuario}', context)).toBe('usr-admin-1');
      expect(resolveVariableValue('{usuario_nombre}', context)).toBe('Admin General');
      expect(resolveVariableValue('{empresa_nombre}', context)).toBe('RAFCAR MOTORS');
    });

    it('debe resolver {codUsuario} obteniéndolo directamente del usuario dueño/creador del prospecto', () => {
      const ownerUser: UsuarioPerfil = {
        id: 'usr-op-55',
        email: 'op55@rafcar.com',
        nombre: 'Operador Especializado',
        rol: 'operador',
        cod_usuario: 'EXP-999',
      };

      const prospectoDeOperador: Prospecto = {
        ...sampleProspecto,
        creado_por: 'usr-op-55',
      };

      const customContext: WebhookPayloadContext = {
        prospecto: prospectoDeOperador,
        currentUser: sampleUser, // Admin que está haciendo la consulta o prueba
        perfiles: [ownerUser, sampleUser],
      };

      expect(resolveVariableValue('{codUsuario}', customContext)).toBe('EXP-999');
    });

    it('debe manejar fallback cuando la variable no existe', () => {
      expect(resolveVariableValue('{variableInexistente}', context)).toBe('');
    });
  });

  describe('compileJsonTemplate', () => {
    it('debe reemplazar todas las variables del cuerpo JSON de ejemplo proporcionado por el usuario', () => {
      const compiled = compileJsonTemplate(DEFAULT_ENDPOINT_BODY, context);
      const parsed = JSON.parse(compiled);

      expect(parsed).toEqual({
        ciudad: 'Cochabamba',
        modelo: 'Jimny',
        nombre: 'Maria Delgado',
        origen: 'Expocruz',
        pagina: 'Expocruz',
        campaign: 'Expocruz',
        telefono: '71234567',
        codUsuario: 'usr-admin-1',
        financiamiento: 'Requiere financiamiento bancario al 100%',
      });
    });

    it('debe escapar correctamente caracteres especiales en comillas para mantener el JSON válido', () => {
      const prospectoConComillas: Prospecto = {
        ...sampleProspecto,
        nombre: 'Maria "La Guapa"',
        observacion: 'Línea 1\nLínea 2 con "comillas"',
      };

      const compiled = compileJsonTemplate(DEFAULT_ENDPOINT_BODY, {
        ...context,
        prospecto: prospectoConComillas,
      });

      expect(() => JSON.parse(compiled)).not.toThrow();
      const parsed = JSON.parse(compiled);
      expect(parsed.nombre).toBe('Maria "La Guapa"');
      expect(parsed.financiamiento).toBe('Línea 1\nLínea 2 con "comillas"');
    });
  });

  describe('validateJsonString', () => {
    it('debe retornar isValid: true para JSON bien formado', () => {
      expect(validateJsonString('{"key": "value"}').isValid).toBe(true);
    });

    it('debe retornar isValid: false con mensaje de error para JSON mal formado', () => {
      const res = validateJsonString('{"key": value}');
      expect(res.isValid).toBe(false);
      expect(res.error).toBeDefined();
    });
  });

  describe('sendLeadToEndpoint', () => {
    it('debe retornar error si la URL está vacía', async () => {
      const res = await sendLeadToEndpoint('', DEFAULT_ENDPOINT_BODY, context);
      expect(res.success).toBe(false);
      expect(res.error).toContain('URL del endpoint no está configurada');
    });

    it('debe realizar la petición POST con Content-Type application/json y retornar la respuesta exitosa', async () => {
      const fakeResponse = { ok: true, status: 200, statusText: 'OK', text: async () => '{"status": "received"}' };
      vi.spyOn(globalThis, 'fetch').mockResolvedValue(fakeResponse as any);

      const res = await sendLeadToEndpoint('https://api.crm-ejemplo.com/v1/leads', DEFAULT_ENDPOINT_BODY, context);

      expect(globalThis.fetch).toHaveBeenCalledWith(
        'https://api.crm-ejemplo.com/v1/leads',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(res.success).toBe(true);
      expect(res.statusCode).toBe(200);
      expect(res.responseBody).toBe('{"status": "received"}');
    });

    it('debe capturar errores de red en la petición POST', async () => {
      vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Failed to fetch'));

      const res = await sendLeadToEndpoint('https://api.crm-ejemplo.com/v1/leads', DEFAULT_ENDPOINT_BODY, context);

      expect(res.success).toBe(false);
      expect(res.error).toContain('Failed to fetch');
    });
  });
});
