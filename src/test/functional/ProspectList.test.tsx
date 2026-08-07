import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { ProspectList } from '../../components/ProspectList';
import { saveDemoProspecto } from '../../lib/supabase';
import type { UsuarioPerfil } from '../../types/prospecto';

describe('Funcional UI: Lista de Prospectos (ProspectList)', () => {
  const empId = '11111111-1111-4111-a111-111111111111';
  const dummyAdmin: UsuarioPerfil = {
    id: 'admin_test',
    nombre: 'Admin Test',
    email: 'admin@test.com',
    rol: 'admin',
    empresa_id: empId
  };

  beforeEach(() => {
    localStorage.clear();

    saveDemoProspecto({
      id: 'lead_101',
      nombre: 'Pedro Marmol',
      contacto: '+56911223344',
      marca: 'Suzuki',
      modelo: 'Baleno',
      empresa_id: empId,
      creado_por: 'admin_test'
    }, dummyAdmin);

    saveDemoProspecto({
      id: 'lead_102',
      nombre: 'Vilma Picapiedra',
      contacto: '+56955667788',
      marca: 'Toyota',
      modelo: 'Corolla',
      empresa_id: empId,
      creado_por: 'admin_test'
    }, dummyAdmin);
  });

  it('debe listar los prospectos registrados', async () => {
    await act(async () => {
      render(<ProspectList currentUser={dummyAdmin} />);
    });

    const items1 = await screen.findAllByText(/Pedro Marmol/i, {}, { timeout: 3000 });
    const items2 = await screen.findAllByText(/Vilma Picapiedra/i, {}, { timeout: 3000 });

    expect(items1.length).toBeGreaterThan(0);
    expect(items2.length).toBeGreaterThan(0);
  });

  it('debe filtrar los prospectos dinámicamente al escribir en la barra de búsqueda', async () => {
    await act(async () => {
      render(<ProspectList currentUser={dummyAdmin} />);
    });

    await screen.findAllByText(/Pedro Marmol/i, {}, { timeout: 3000 });

    const searchInput = screen.getByPlaceholderText(/Buscar prospectos.../i);
    await act(async () => {
      fireEvent.change(searchInput, { target: { value: 'Vilma' } });
    });

    await waitFor(() => {
      expect(screen.queryByText(/Pedro Marmol/i)).not.toBeInTheDocument();
      expect(screen.getAllByText(/Vilma Picapiedra/i).length).toBeGreaterThan(0);
    });
  });
});
