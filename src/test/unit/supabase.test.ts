import { describe, it, expect, beforeEach } from 'vitest';
import { 
  getDemoEmpresas, 
  getDemoPerfiles, 
  getDemoProspectos, 
  saveDemoProspecto, 
  deleteDemoProspecto,
  updateDemoPerfil
} from '../../lib/supabase';
import type { UsuarioPerfil } from '../../types/prospecto';

describe('Unidad: Persistencia y Gestión Demo (lib/supabase)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('debe obtener las empresas y perfiles demo iniciales', () => {
    const empresas = getDemoEmpresas();
    const perfiles = getDemoPerfiles();

    expect(empresas.length).toBeGreaterThan(0);
    expect(perfiles.length).toBeGreaterThan(0);
    expect(perfiles[0]).toHaveProperty('email');
    expect(perfiles[0]).toHaveProperty('rol');
  });

  it('debe guardar un nuevo prospecto en LocalStorage y recuperarlo', () => {
    const superadmin: UsuarioPerfil = {
      id: 'usr_super',
      nombre: 'Superadmin Test',
      email: 'super@test.com',
      rol: 'superadmin',
      empresa_id: 'emp_rafcar'
    };

    const nuevoLead = {
      nombre: 'Carlos Perez',
      contacto: '+56 9 8888 7777',
      marca: 'Toyota',
      modelo: 'Yaris',
      empresa_id: 'emp_rafcar',
      creado_por: 'usr_super'
    };

    const guardado = saveDemoProspecto(nuevoLead);
    expect(guardado).toHaveProperty('id');
    expect(guardado.nombre).toBe('Carlos Perez');

    const lista = getDemoProspectos(superadmin);
    expect(lista.some(p => p.id === guardado.id)).toBe(true);
  });

  it('debe eliminar un prospecto del estado demo correctamente', () => {
    const superadmin: UsuarioPerfil = {
      id: 'usr_super',
      nombre: 'Superadmin Test',
      email: 'super@test.com',
      rol: 'superadmin',
      empresa_id: 'emp_rafcar'
    };

    const nuevoLead = saveDemoProspecto({
      nombre: 'Eliminar Test',
      contacto: '+56 9 1111 2222',
      marca: 'Suzuki',
      modelo: 'Swift',
      empresa_id: 'emp_rafcar'
    });

    if (nuevoLead.id) {
      deleteDemoProspecto(nuevoLead.id);
    }

    const lista = getDemoProspectos(superadmin);
    expect(lista.some(p => p.id === nuevoLead.id)).toBe(false);
  });

  it('debe actualizar los datos de un perfil en la memoria demo', () => {
    const perfiles = getDemoPerfiles();
    const target = perfiles[0];

    updateDemoPerfil(target.id, { nombre: 'Nombre Actualizado' });

    const perfilesActualizados = getDemoPerfiles();
    const actualizado = perfilesActualizados.find(p => p.id === target.id);

    expect(actualizado?.nombre).toBe('Nombre Actualizado');
  });
});
