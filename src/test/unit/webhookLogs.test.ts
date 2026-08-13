import { describe, it, expect, beforeEach } from 'vitest';
import { getDemoWebhookLogs, saveDemoWebhookLog, clearDemoWebhookLogs } from '../../lib/supabase';
import type { WebhookLogEntry } from '../../types/prospecto';

describe('Unidad: Gestión de Logs y Auditoría de Webhooks POST', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('debe retornar lista vacía cuando no existen logs guardados', () => {
    const logs = getDemoWebhookLogs('emp-1');
    expect(logs).toEqual([]);
  });

  it('debe guardar y recuperar un log de webhook exitoso', () => {
    const logData: Partial<WebhookLogEntry> = {
      empresa_id: 'emp-101',
      prospecto_id: 'pros-001',
      prospecto_nombre: 'Carlos Vaca',
      prospecto_contacto: '77889900',
      endpoint_url: 'https://api.crm.com/webhook',
      success: true,
      status_code: 200,
      status_text: 'OK',
      compiled_body: JSON.stringify({ nombre: 'Carlos Vaca' }),
      response_body: '{"status":"received"}',
    };

    const saved = saveDemoWebhookLog(logData);

    expect(saved.id).toBeDefined();
    expect(saved.prospecto_nombre).toBe('Carlos Vaca');
    expect(saved.success).toBe(true);
    expect(saved.status_code).toBe(200);

    const logs = getDemoWebhookLogs('emp-101');
    expect(logs.length).toBe(1);
    expect(logs[0].id).toBe(saved.id);
  });

  it('debe registrar un log de fallo silencioso (HTTP 500)', () => {
    const logData: Partial<WebhookLogEntry> = {
      empresa_id: 'emp-101',
      prospecto_nombre: 'María Ramos',
      endpoint_url: 'https://crm-fallando.com/post',
      success: false,
      status_code: 500,
      status_text: 'Internal Server Error',
      error: 'HTTP 500: Internal Server Error',
    };

    saveDemoWebhookLog(logData);

    const logs = getDemoWebhookLogs('emp-101');
    expect(logs.length).toBe(1);
    expect(logs[0].success).toBe(false);
    expect(logs[0].error).toContain('HTTP 500');
  });

  it('debe limpiar los logs correctamente', () => {
    saveDemoWebhookLog({ empresa_id: 'emp-A', prospecto_nombre: 'Lead A' });
    saveDemoWebhookLog({ empresa_id: 'emp-B', prospecto_nombre: 'Lead B' });

    expect(getDemoWebhookLogs('emp-A').length).toBe(1);
    expect(getDemoWebhookLogs('emp-B').length).toBe(1);

    clearDemoWebhookLogs('emp-A');

    expect(getDemoWebhookLogs('emp-A').length).toBe(0);
    expect(getDemoWebhookLogs('emp-B').length).toBe(1);
  });
});
