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

    expect(screen.getByPlaceholderText(/Ej. Juan Pérez/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ej. \+56 9 1234 5678/i)).toBeInTheDocument();
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

  it('debe permitir completar los campos y registrar el prospecto con éxito', async () => {
    const handleSuccess = vi.fn();
    render(<ProspectForm currentUser={dummyUser} onSuccess={handleSuccess} />);

    const nombreInput = screen.getByPlaceholderText(/Ej. Juan Pérez/i);
    const telefonoInput = screen.getByPlaceholderText(/Ej. \+56 9 1234 5678/i);

    fireEvent.change(nombreInput, { target: { value: 'Maria Gonzalez' } });
    fireEvent.change(telefonoInput, { target: { value: '+56 9 7777 6666' } });

    // Seleccionar o ingresar marca
    const marcaElement = screen.queryByRole('combobox') || screen.getByPlaceholderText(/Ej. Toyota, Nissan, Ford.../i);
    fireEvent.change(marcaElement, { target: { value: 'Suzuki' } });

    // Si aparece selector de modelo tras elegir marca
    const modelElement = screen.queryByPlaceholderText(/Escribe el modelo/i) || screen.queryAllByRole('combobox')[1];
    if (modelElement) {
      fireEvent.change(modelElement, { target: { value: 'Baleno' } });
    }

    const submitBtn = screen.getByRole('button', { name: /Guardar Prospecto/i });
    fireEvent.click(submitBtn);

    // Esperar callback
    await waitFor(() => {
      expect(handleSuccess).toHaveBeenCalled();
    }, { timeout: 3000 });
  });
});
