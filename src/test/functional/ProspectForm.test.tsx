import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProspectForm } from '../../components/ProspectForm';
import type { UsuarioPerfil } from '../../types/prospecto';

describe('Funcional UI: Formulario de Prospectos (ProspectForm)', () => {
  const dummyUser: UsuarioPerfil = {
    id: 'op_test',
    nombre: 'Operador Test',
    email: 'op@test.com',
    rol: 'operador',
    empresa_id: 'emp_rafcar'
  };

  beforeEach(() => {
    localStorage.clear();
  });

  it('debe renderizar todos los campos requeridos del formulario', () => {
    render(<ProspectForm currentUser={dummyUser} />);

    expect(screen.getByLabelText(/Nombre Completo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Teléfono/i)).toBeInTheDocument();
    expect(screen.getByText(/MARCA DEL VEHÍCULO/i)).toBeInTheDocument();
    expect(screen.getAllByText(/MODELO/i).length).toBeGreaterThan(0);
  });

  it('debe mostrar errores de validación si se envía el formulario vacío', async () => {
    render(<ProspectForm currentUser={dummyUser} />);

    const submitBtn = screen.getByRole('button', { name: /Guardar Prospecto/i });
    fireEvent.click(submitBtn);

    expect(await screen.findByText(/El nombre es obligatorio/i)).toBeInTheDocument();
    expect(await screen.findByText(/El teléfono es obligatorio/i)).toBeInTheDocument();
  });

  it('debe permitir completar los campos y registrar el prospecto con éxito y prefijo 591', async () => {
    const handleSuccess = vi.fn();
    render(<ProspectForm currentUser={dummyUser} onSuccess={handleSuccess} />);

    const nombreInput = screen.getByLabelText(/Nombre Completo/i);
    const telefonoInput = screen.getByLabelText(/Teléfono/i);

    fireEvent.change(nombreInput, { target: { value: 'Maria Gonzalez' } });
    fireEvent.change(telefonoInput, { target: { value: '780935354' } });

    // Seleccionar o ingresar marca
    const marcaElement = screen.queryByRole('combobox') || screen.getByLabelText(/Marca/i);
    fireEvent.change(marcaElement, { target: { value: 'Suzuki' } });

    // Si aparece selector o input de modelo tras elegir marca
    const modelElement = screen.queryByLabelText(/^Modelo/i) || screen.queryAllByRole('combobox')[1];
    if (modelElement) {
      fireEvent.change(modelElement, { target: { value: 'Baleno' } });
    }

    const submitBtn = screen.getByRole('button', { name: /Guardar Prospecto/i });
    fireEvent.click(submitBtn);

    // Esperar callback y verificar prefijo en resumen
    await waitFor(() => {
      expect(handleSuccess).toHaveBeenCalled();
    }, { timeout: 3000 });

    expect(await screen.findByText('591780935354')).toBeInTheDocument();
  });
});
