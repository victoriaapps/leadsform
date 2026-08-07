import { describe, it, expect, beforeEach } from 'vitest';
import { getDemoProspectos, saveDemoProspecto } from '../../lib/supabase';
import type { UsuarioPerfil } from '../../types/prospecto';

describe('Integración: Scoping y Permisos según Rol de Usuario', () => {
  beforeEach(() => {
    localStorage.clear();

    // Crear prospectos de prueba para Empresa A y Empresa B
    saveDemoProspecto({
      id: 'p_empA_op1',
      nombre: 'Cliente A1',
      contacto: '+56900000001',
      marca: 'Toyota',
      modelo: 'Yaris',
      empresa_id: 'emp_A',
      creado_por: 'op_1'
    });

    saveDemoProspecto({
      id: 'p_empA_op2',
      nombre: 'Cliente A2',
      contacto: '+56900000002',
      marca: 'Mazda',
      modelo: 'CX-5',
      empresa_id: 'emp_A',
      creado_por: 'op_2'
    });

    saveDemoProspecto({
      id: 'p_empB_op3',
      nombre: 'Cliente B1',
      contacto: '+56900000003',
      marca: 'Ford',
      modelo: 'Ranger',
      empresa_id: 'emp_B',
      creado_por: 'op_3'
    });
  });

  it('Superadmin debe ver todos los prospectos de todas las empresas', () => {
    const superadmin: UsuarioPerfil = {
      id: 'super_1',
      nombre: 'Victoria Super',
      email: 'super@sistema.com',
      rol: 'superadmin'
    };

    const lista = getDemoProspectos(superadmin);
    expect(lista.length).toBe(3);
  });

  it('Admin de Empresa A sólo debe ver los prospectos pertenecientes a Empresa A', () => {
    const adminA: UsuarioPerfil = {
      id: 'admin_A',
      nombre: 'Admin Empresa A',
      email: 'admin@empresaA.com',
      rol: 'admin',
      empresa_id: 'emp_A'
    };

    const lista = getDemoProspectos(adminA);
    expect(lista.length).toBe(2);
    expect(lista.every(p => p.empresa_id === 'emp_A')).toBe(true);
  });

  it('Operador op_1 sólo debe ver únicamente sus propios prospectos creados', () => {
    const operador1: UsuarioPerfil = {
      id: 'op_1',
      nombre: 'Operador Uno',
      email: 'op1@empresaA.com',
      rol: 'operador',
      empresa_id: 'emp_A'
    };

    const lista = getDemoProspectos(operador1);
    expect(lista.length).toBe(1);
    expect(lista[0].nombre).toBe('Cliente A1');
  });
});
