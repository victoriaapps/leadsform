import React, { useState, useEffect } from 'react';
import { 
  User, 
  MapPin, 
  Phone, 
  Car, 
  FileText, 
  Send, 
  RotateCcw, 
  CheckCircle2, 
  AlertCircle,
  Sparkles,
  Tag,
  Building2
} from 'lucide-react';
import type { Prospecto, UsuarioPerfil, FormErrorState, Empresa } from '../types/prospecto';
import { 
  saveDemoProspecto, 
  getDemoEmpresas, 
  supabase, 
  isSupabaseConfigured
} from '../lib/supabase';

interface ProspectFormProps {
  currentUser: UsuarioPerfil;
  onSuccess?: () => void;
}

export const ProspectForm: React.FC<ProspectFormProps> = ({ currentUser, onSuccess }) => {
  const [empresas, setEmpresas] = useState<Empresa[]>(getDemoEmpresas());
  
  // Para Superadmin: Empresa seleccionada para capturar el prospecto
  const [selectedTargetEmpresaId, setSelectedTargetEmpresaId] = useState<string>(
    currentUser.empresa_id || ''
  );

  useEffect(() => {
    const loadEmpresas = async () => {
      let currentEmpresas: Empresa[] = [];
      if (isSupabaseConfigured && supabase) {
        try {
          const { data } = await supabase.from('empresas').select('*');
          if (data && data.length > 0) currentEmpresas = data;
          else currentEmpresas = getDemoEmpresas();
        } catch (e) {
          currentEmpresas = getDemoEmpresas();
        }
      } else {
        currentEmpresas = getDemoEmpresas();
      }

      setEmpresas(currentEmpresas);

      if (currentEmpresas.length > 0 && !selectedTargetEmpresaId) {
        setSelectedTargetEmpresaId(currentUser.empresa_id || currentEmpresas[0].id);
      }
    };
    loadEmpresas();
  }, [currentUser]);

  // Resolver la empresa activa cuyos catálogos cargaremos
  const currentEmpresa = empresas.find(e => e.id === selectedTargetEmpresaId) || empresas[0];

  const ciudadesList = currentEmpresa?.ciudades || [];
  const marcasList = currentEmpresa?.marcas || [];
  const modelosPorMarca = currentEmpresa?.modelos_por_marca || {};

  const [nombre, setNombre] = useState('');
  const [contacto, setContacto] = useState('');
  
  // Selección de Ciudad
  const [selectedCiudad, setSelectedCiudad] = useState('');
  const [textCiudad, setTextCiudad] = useState('');

  // Selección de Marca
  const [selectedMarca, setSelectedMarca] = useState('');
  const [textMarca, setTextMarca] = useState('');

  // Selección de Modelo
  const [selectedModelo, setSelectedModelo] = useState('');
  const [textModelo, setTextModelo] = useState('');

  const [observacion, setObservacion] = useState('');

  const [errors, setErrors] = useState<FormErrorState>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastSubmitted, setLastSubmitted] = useState<Prospecto | null>(null);

  const finalCiudad = ciudadesList.length > 0 ? selectedCiudad : textCiudad;
  const finalMarca = marcasList.length > 0 ? selectedMarca : textMarca;
  
  // Obtener la lista de modelos asociada dinámicamente a la marca seleccionada
  const availableModelsForSelectedMarca = finalMarca
    ? (modelosPorMarca[finalMarca] || []) 
    : [];

  const finalModelo = availableModelsForSelectedMarca.length > 0 ? selectedModelo : textModelo;

  // Al cambiar de Marca, resetear el Modelo seleccionado
  const handleMarcaChange = (newMarca: string) => {
    setSelectedMarca(newMarca);
    setTextMarca(newMarca);
    setSelectedModelo('');
    setTextModelo('');
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrorState = {};

    if (!nombre.trim()) {
      newErrors.nombre = 'El nombre es obligatorio';
    }
    if (!contacto.trim()) {
      newErrors.contacto = 'El teléfono es obligatorio';
    }
    if (!finalMarca.trim()) {
      newErrors.marca = 'La marca es obligatoria';
    }
    if (!finalModelo.trim()) {
      newErrors.modelo = 'El modelo es obligatorio';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    setErrors({});

    const targetEmpresaId = currentUser.rol === 'superadmin' ? selectedTargetEmpresaId : (currentUser.empresa_id || selectedTargetEmpresaId);

    const newProspectoData: Omit<Prospecto, 'id' | 'created_at'> = {
      nombre: nombre.trim(),
      ciudad: finalCiudad.trim() || undefined,
      contacto: contacto.trim(),
      marca: finalMarca.trim(),
      modelo: finalModelo.trim(),
      observacion: observacion.trim() || undefined,
      empresa_id: targetEmpresaId,
      creado_por: currentUser.id,
    };

    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase
          .from('prospectos')
          .insert([
            {
              nombre: newProspectoData.nombre,
              ciudad: newProspectoData.ciudad,
              contacto: newProspectoData.contacto,
              marca: newProspectoData.marca,
              modelo: newProspectoData.modelo,
              observacion: newProspectoData.observacion,
              empresa_id: targetEmpresaId,
              creado_por: currentUser.id
            }
          ])
          .select();

        if (error) {
          throw new Error(error.message);
        }

        if (data && data[0]) {
          setLastSubmitted(data[0]);
        } else {
          setLastSubmitted(saveDemoProspecto(newProspectoData, currentUser));
        }
      } else {
        const demoItem = saveDemoProspecto(newProspectoData, currentUser);
        setLastSubmitted(demoItem);
      }

      setIsSuccess(true);
      if (onSuccess) onSuccess();

    } catch (err: any) {
      console.error('Error al guardar prospecto:', err);
      setErrors({ general: 'Error al conectar con el servidor: ' + err.message });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setNombre('');
    setContacto('');
    setSelectedCiudad('');
    setTextCiudad('');
    setSelectedMarca('');
    setTextMarca('');
    setSelectedModelo('');
    setTextModelo('');
    setObservacion('');
    setErrors({});
    setIsSuccess(false);
    setLastSubmitted(null);
  };

  if (isSuccess && lastSubmitted) {
    return (
      <div style={{ maxWidth: '650px', margin: '0 auto' }}>
        <div className="card-victoria">
          <div className="success-state">
            <div className="success-icon-bg">
              <CheckCircle2 size={40} />
            </div>
            <h3>¡Prospecto Registrado con Éxito!</h3>
            <p>El cliente ha sido guardado y asignado correctamente a {currentEmpresa?.nombre || 'la empresa'}.</p>

            <div className="success-summary">
              <div className="summary-row">
                <span>Cliente:</span> <strong>{lastSubmitted.nombre}</strong>
              </div>
              {lastSubmitted.ciudad && (
                <div className="summary-row">
                  <span>Ciudad:</span> <strong>{lastSubmitted.ciudad}</strong>
                </div>
              )}
              <div className="summary-row">
                <span>Teléfono:</span> <strong>{lastSubmitted.contacto}</strong>
              </div>
              <div className="summary-row">
                <span>Vehículo:</span> <strong>{lastSubmitted.marca} {lastSubmitted.modelo}</strong>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button onClick={handleReset} className="btn-primary">
                <Sparkles size={16} /> Registrar Otro Prospecto
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto' }}>
      <div className="card-victoria">
        <div className="form-header" style={{ marginBottom: '2rem', paddingBottom: '1.25rem', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="kpi-icon-badge purple" style={{ width: '52px', height: '52px', borderRadius: '14px' }}>
              <Car size={26} />
            </div>
            <div>
              <h2 className="card-victoria-title" style={{ fontSize: '1.5rem' }}>Registrar Nuevo Prospecto</h2>
              <p className="card-victoria-sub">
                Capturando lead para: <strong>{currentUser.nombre}</strong> ({currentUser.rol.toUpperCase()})
              </p>
            </div>
          </div>

          {/* SELECTOR DE EMPRESA SI ES SUPERADMIN */}
          {currentUser.rol === 'superadmin' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-surface-hover)', padding: '0.5rem 0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <Building2 size={16} style={{ color: 'var(--primary-accent)' }} />
              <span style={{ fontSize: '0.82rem', fontWeight: 700 }}>Empresa Target:</span>
              <select
                value={selectedTargetEmpresaId}
                onChange={(e) => {
                  setSelectedTargetEmpresaId(e.target.value);
                  setSelectedCiudad('');
                  setSelectedMarca('');
                  setSelectedModelo('');
                }}
                className="input-field"
                style={{ width: 'auto', padding: '0.35rem 0.75rem', fontSize: '0.85rem' }}
              >
                {empresas.map((e) => (
                  <option key={e.id} value={e.id}>{e.nombre}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {errors.general && (
          <div className="error-banner" style={{ marginBottom: '1.5rem' }}>
            <AlertCircle size={18} /> {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit} className="prospect-form">
          <div className="form-grid-2col">
            
            {/* NOMBRE COMPLETO */}
            <div className="input-group">
              <label className="input-label">
                <User size={15} className="icon-gradient" /> NOMBRE COMPLETO <span className="req-asterisk">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej. Juan Pérez"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className={`input-field ${errors.nombre ? 'input-error' : ''}`}
              />
              {errors.nombre && <span className="error-text">{errors.nombre}</span>}
            </div>

            {/* LISTA DESPLEGABLE DE CIUDAD */}
            <div className="input-group">
              <label className="input-label">
                <MapPin size={15} /> CIUDAD <span className="opt-tag">(Opcional)</span>
              </label>
              {ciudadesList.length > 0 ? (
                <select
                  value={selectedCiudad}
                  onChange={(e) => setSelectedCiudad(e.target.value)}
                  className="input-field"
                >
                  <option value="">-- Seleccionar Ciudad --</option>
                  {ciudadesList.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Ej. Santiago, Madrid, Bogotá..."
                  value={textCiudad}
                  onChange={(e) => setTextCiudad(e.target.value)}
                  className="input-field"
                />
              )}
            </div>

            {/* TELÉFONO EXCLUSIVO */}
            <div className="input-group">
              <label className="input-label">
                <Phone size={15} /> TELÉFONO <span className="req-asterisk">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej. +56 9 1234 5678"
                value={contacto}
                onChange={(e) => setContacto(e.target.value)}
                className={`input-field ${errors.contacto ? 'input-error' : ''}`}
              />
              {errors.contacto && <span className="error-text">{errors.contacto}</span>}
            </div>

            {/* LISTA DESPLEGABLE DE MARCA */}
            <div className="input-group">
              <label className="input-label">
                <Car size={15} /> MARCA DEL VEHÍCULO <span className="req-asterisk">*</span>
              </label>
              {marcasList.length > 0 ? (
                <select
                  value={selectedMarca}
                  onChange={(e) => handleMarcaChange(e.target.value)}
                  className={`input-field ${errors.marca ? 'input-error' : ''}`}
                >
                  <option value="">-- Seleccionar Marca --</option>
                  {marcasList.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder="Ej. Toyota, Nissan, Ford..."
                  value={textMarca}
                  onChange={(e) => handleMarcaChange(e.target.value)}
                  className={`input-field ${errors.marca ? 'input-error' : ''}`}
                />
              )}
              {errors.marca && <span className="error-text">{errors.marca}</span>}
            </div>

            {/* LISTA DESPLEGABLE DE MODELO EXCLUSIVO (RELACIONADO A LA MARCA) */}
            <div className="input-group">
              <label className="input-label">
                <Tag size={15} /> MODELO <span className="req-asterisk">*</span>
              </label>

              {!finalMarca ? (
                <div style={{ background: 'var(--bg-surface-hover)', padding: '0.6rem 0.85rem', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
                  -- Primero selecciona una Marca para ver sus modelos --
                </div>
              ) : availableModelsForSelectedMarca.length > 0 ? (
                <select
                  value={selectedModelo}
                  onChange={(e) => setSelectedModelo(e.target.value)}
                  className={`input-field ${errors.modelo ? 'input-error' : ''}`}
                >
                  <option value="">-- Seleccionar Modelo --</option>
                  {availableModelsForSelectedMarca.map((mod) => (
                    <option key={mod} value={mod}>{mod}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  placeholder={`Escribe el modelo para ${finalMarca}...`}
                  value={textModelo}
                  onChange={(e) => setTextModelo(e.target.value)}
                  className={`input-field ${errors.modelo ? 'input-error' : ''}`}
                />
              )}
              {errors.modelo && <span className="error-text">{errors.modelo}</span>}
            </div>
          </div>

          {/* OBSERVACIONES */}
          <div className="input-group" style={{ marginTop: '1rem' }}>
            <label className="input-label">
              <FileText size={15} /> OBSERVACIONES ADICIONALES <span className="opt-tag">(Opcional)</span>
            </label>
            <textarea
              placeholder="Detalles adicionales, preferencias de color, tipo de pago, crédito directo, etc."
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              className="input-field textarea-field"
              rows={3}
            />
          </div>

          {/* BARRA DE ACCIONES */}
          <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border-color)' }}>
            <button
              type="button"
              onClick={handleReset}
              className="btn-secondary"
              disabled={isSubmitting}
            >
              <RotateCcw size={16} /> Limpiar
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>Cargando...</>
              ) : (
                <>
                  <Send size={16} /> Guardar Prospecto
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
