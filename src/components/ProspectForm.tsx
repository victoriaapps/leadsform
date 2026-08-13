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
  Building2,
  Globe,
  Code2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { Prospecto, UsuarioPerfil, FormErrorState, Empresa } from '../types/prospecto';
import { 
  saveDemoProspecto, 
  getDemoEmpresas, 
  saveDemoWebhookLog,
  supabase, 
  isSupabaseConfigured
} from '../lib/supabase';
import { 
  sendLeadToEndpoint, 
  DEFAULT_ENDPOINT_BODY, 
  type WebhookSendResult 
} from '../lib/webhook';

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
          currentEmpresas = data || [];
        } catch (e) {
          console.error('Error al cargar empresas:', e);
          currentEmpresas = [];
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

  // Estado para el resultado del envío al Endpoint POST
  const [endpointResult, setEndpointResult] = useState<WebhookSendResult | null>(null);
  const [showPayloadDetails, setShowPayloadDetails] = useState(false);

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
    setEndpointResult(null);

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
      creado_por_nombre: currentUser.nombre,
      creado_por_cod_usuario: currentUser.cod_usuario || null,
    };

    let savedProspecto: Prospecto;

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
          savedProspecto = data[0];
        } else {
          savedProspecto = saveDemoProspecto(newProspectoData, currentUser);
        }
      } else {
        savedProspecto = saveDemoProspecto(newProspectoData, currentUser);
      }

      setLastSubmitted(savedProspecto);

      // ENVÍO AL ENDPOINT POST EXTERNO SI ESTÁ CONFIGURADO
      const targetEmpresaObj = empresas.find(emp => emp.id === targetEmpresaId) || currentEmpresa;
      if (targetEmpresaObj && targetEmpresaObj.endpoint_enabled && targetEmpresaObj.endpoint_url?.trim()) {
        try {
          const res = await sendLeadToEndpoint(
            targetEmpresaObj.endpoint_url,
            targetEmpresaObj.endpoint_body_template || DEFAULT_ENDPOINT_BODY,
            {
              prospecto: savedProspecto,
              currentUser,
              empresa: targetEmpresaObj,
            }
          );
          setEndpointResult(res);

          const logPayload = {
            empresa_id: targetEmpresaId,
            prospecto_id: savedProspecto.id,
            prospecto_nombre: savedProspecto.nombre,
            prospecto_contacto: savedProspecto.contacto,
            endpoint_url: targetEmpresaObj.endpoint_url,
            success: res.success,
            status_code: res.statusCode,
            status_text: res.statusText,
            compiled_body: res.compiledBody || '',
            response_body: res.responseBody,
            error: res.error,
            created_at: res.timestamp || new Date().toISOString(),
          };

          if (isSupabaseConfigured && supabase) {
            try {
              await supabase.from('webhook_logs').insert([logPayload]);
            } catch (logErr) {
              console.warn('Fallback local para log de webhook');
            }
          }
          saveDemoWebhookLog(logPayload);
        } catch (webhookErr: any) {
          console.error('Error al enviar lead al endpoint POST:', webhookErr);
          const errRes = {
            success: false,
            error: webhookErr.message || 'Error inesperado al conectar con el endpoint.',
          };
          setEndpointResult(errRes);

          saveDemoWebhookLog({
            empresa_id: targetEmpresaId,
            prospecto_id: savedProspecto.id,
            prospecto_nombre: savedProspecto.nombre,
            prospecto_contacto: savedProspecto.contacto,
            endpoint_url: targetEmpresaObj.endpoint_url,
            success: false,
            error: errRes.error,
            created_at: new Date().toISOString(),
          });
        }
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
    setEndpointResult(null);
    setShowPayloadDetails(false);
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

            {/* ESTADO DE ENVÍO AL ENDPOINT POST EXTERNO */}
            {endpointResult && (
              <div style={{
                marginTop: '1.25rem',
                padding: '1rem 1.25rem',
                borderRadius: '12px',
                textAlign: 'left',
                background: endpointResult.success ? 'rgba(16, 185, 129, 0.08)' : 'rgba(245, 158, 11, 0.08)',
                border: `1px solid ${endpointResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.4rem' }}>
                  <span style={{
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    color: endpointResult.success ? '#10b981' : '#f59e0b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}>
                    <Globe size={17} /> 
                    {endpointResult.success 
                      ? `Enviado a Endpoint POST (HTTP ${endpointResult.statusCode || 200})` 
                      : 'Notificación a Endpoint POST Fallida'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowPayloadDetails(!showPayloadDetails)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--text-dim)',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.2rem'
                    }}
                  >
                    <Code2 size={14} /> Payload {showPayloadDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>

                <p style={{ fontSize: '0.82rem', color: 'var(--text-main)', margin: 0 }}>
                  {endpointResult.success
                    ? 'El webhook ha procesado y recibido correctamente la información del lead.'
                    : `El lead se guardó localmente, pero el servidor remoto retornó error: ${endpointResult.error || `HTTP ${endpointResult.statusCode} ${endpointResult.statusText}`}`}
                </p>

                {showPayloadDetails && endpointResult.compiledBody && (
                  <div style={{ marginTop: '0.75rem' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '0.25rem' }}>
                      Body JSON Enviado (Método POST):
                    </div>
                    <pre style={{
                      background: 'var(--bg-surface-hover)',
                      padding: '0.75rem',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontFamily: 'monospace',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-all',
                      color: 'var(--text-main)',
                      border: '1px solid var(--border-color)',
                      maxHeight: '180px',
                      overflowY: 'auto'
                    }}>
                      {endpointResult.compiledBody}
                    </pre>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1.5rem' }}>
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
