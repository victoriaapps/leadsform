import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  UserPlus, 
  ShieldCheck, 
  Plus, 
  Users, 
  Mail, 
  User, 
  Lock,
  Key,
  CheckCircle2, 
  AlertCircle,
  X,
  ImageIcon,
  Upload,
  Palette,
  Edit2,
  MapPin,
  Car,
  Tag,
  Save,
  Sliders,
  Shield,
  Trash2,
  Hash,
  Globe,
  Code,
  Play,
  Sparkles,
  Check,
  FileText,
  RefreshCw
} from 'lucide-react';
import type { Empresa, UsuarioPerfil, UserRole, Prospecto, WebhookLogEntry } from '../types/prospecto';
import { 
  getDemoEmpresas, 
  saveDemoEmpresa, 
  updateDemoEmpresa,
  deleteDemoEmpresa,
  getDemoPerfiles, 
  saveDemoPerfil,
  updateDemoPerfil,
  deleteDemoPerfil,
  updateDemoPerfilPassword,
  getDemoProspectos,
  getDemoWebhookLogs,
  saveDemoWebhookLog,
  clearDemoWebhookLogs,
  uploadCompanyLogoFile,
  supabase,
  isSupabaseConfigured,
  generateUUID,
  isUuid
} from '../lib/supabase';
import { COLOR_THEMES, applyCompanyTheme } from '../lib/themeEngine';
import { 
  sendLeadToEndpoint, 
  DEFAULT_ENDPOINT_BODY, 
  AVAILABLE_VARIABLES, 
  validateJsonString, 
  compileJsonTemplate,
  type WebhookSendResult 
} from '../lib/webhook';

interface AdminPanelProps {
  currentUser: UsuarioPerfil;
  onEmpresaUpdated?: () => void;
  activeSubTab?: 'empresas' | 'catalogos' | 'endpoint' | 'usuarios';
  onSubTabChange?: (tab: 'empresas' | 'catalogos' | 'endpoint' | 'usuarios') => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ 
  currentUser, 
  onEmpresaUpdated,
  activeSubTab: externalSubTab,
  onSubTabChange: _onSubTabChange
}) => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [perfiles, setPerfiles] = useState<UsuarioPerfil[]>([]);
  const activeSubTab = externalSubTab || 'empresas';

  // Empresa seleccionada para la gestión de catálogos
  const [selectedCatalogEmpresaId, setSelectedCatalogEmpresaId] = useState<string>(
    currentUser.empresa_id || ''
  );

  // Estados de Catálogos (Ciudades, Marcas, Modelos por Marca)
  const [catalogCiudades, setCatalogCiudades] = useState<string[]>([]);
  const [catalogMarcas, setCatalogMarcas] = useState<string[]>([]);
  const [catalogModelosPorMarca, setCatalogModelosPorMarca] = useState<Record<string, string[]>>({});
  
  // Marca activa seleccionada en la pestaña de modelos
  const [selectedMarcaForModels, setSelectedMarcaForModels] = useState<string>('');

  // Inputs para agregar nuevos ítems a los catálogos
  const [newCiudadInput, setNewCiudadInput] = useState('');
  const [newMarcaInput, setNewMarcaInput] = useState('');
  const [newModeloInput, setNewModeloInput] = useState('');
  const [catalogSuccessMsg, setCatalogSuccessMsg] = useState(false);
  const [isSavingCatalog, setIsSavingCatalog] = useState(false);

  // Modal de Nueva Empresa (Solo Superadmin)
  const [isCreateEmpresaModalOpen, setIsCreateEmpresaModalOpen] = useState(false);
  const [nuevaEmpresaNombre, setNuevaEmpresaNombre] = useState('');
  const [empresaLogoFile, setEmpresaLogoFile] = useState<File | null>(null);
  const [empresaLogoPreview, setEmpresaLogoPreview] = useState<string | null>(null);
  const [empresaColorPalette, setEmpresaColorPalette] = useState<string>('indigo');
  const [empresaSuccess, setEmpresaSuccess] = useState(false);
  const [isSubmittingEmpresa, setIsSubmittingEmpresa] = useState(false);

  // Modal de Edición de Empresa
  const [editingEmpresa, setEditingEmpresa] = useState<Empresa | null>(null);
  const [editEmpresaNombre, setEditEmpresaNombre] = useState('');
  const [editEmpresaLogoFile, setEditEmpresaLogoFile] = useState<File | null>(null);
  const [editEmpresaLogoPreview, setEditEmpresaLogoPreview] = useState<string | null>(null);
  const [editEmpresaPalette, setEditEmpresaPalette] = useState<string>('indigo');
  const [editEmpresaSuccess, setEditEmpresaSuccess] = useState(false);
  const [isUpdatingEmpresa, setIsUpdatingEmpresa] = useState(false);

  // Form de Usuario (Creación)
  const [userNombre, setUserNombre] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userCodUsuario, setUserCodUsuario] = useState('');
  const [userRol, setUserRol] = useState<UserRole>('operador');
  const [userEmpresaId, setUserEmpresaId] = useState(currentUser.empresa_id || '');
  const [userSuccess, setUserSuccess] = useState(false);
  const [userError, setUserError] = useState('');

  // Modal de Edición Completa de Usuario
  const [editingUser, setEditingUser] = useState<UsuarioPerfil | null>(null);
  const [editUserNombre, setEditUserNombre] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserCodUsuario, setEditUserCodUsuario] = useState('');
  const [editUserRol, setEditUserRol] = useState<UserRole>('operador');
  const [editUserPassword, setEditUserPassword] = useState('');
  const [editUserSuccessMsg, setEditUserSuccessMsg] = useState('');
  const [editUserErrorMsg, setEditUserErrorMsg] = useState('');
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  // Modal de Cambio de Contraseña de Usuario Rápido
  const [editingUserPasswordOnly, setEditingUserPasswordOnly] = useState<UsuarioPerfil | null>(null);
  const [quickNewPassword, setQuickNewPassword] = useState('');
  const [quickPasswordSuccessMsg, setQuickPasswordSuccessMsg] = useState('');
  const [quickPasswordErrorMsg, setQuickPasswordErrorMsg] = useState('');

  // Estados de Configuración de Endpoint HTTP POST (Webhooks)
  const [selectedEndpointEmpresaId, setSelectedEndpointEmpresaId] = useState<string>(
    currentUser.empresa_id || ''
  );
  const [endpointUrl, setEndpointUrl] = useState('');
  const [endpointEnabled, setEndpointEnabled] = useState(false);
  const [endpointBodyTemplate, setEndpointBodyTemplate] = useState(DEFAULT_ENDPOINT_BODY);
  const [endpointSaveSuccess, setEndpointSaveSuccess] = useState(false);
  const [isSavingEndpoint, setIsSavingEndpoint] = useState(false);
  const [testResult, setTestResult] = useState<WebhookSendResult | null>(null);
  const [isTestingEndpoint, setIsTestingEndpoint] = useState(false);

  // Estados del Historial de Logs de Envíos POST
  const [webhookLogs, setWebhookLogs] = useState<WebhookLogEntry[]>([]);
  const [endpointModeView, setEndpointModeView] = useState<'config' | 'logs'>('config');
  const [logStatusFilter, setLogStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [logSearchText, setLogSearchText] = useState('');
  const [selectedDetailLog, setSelectedDetailLog] = useState<WebhookLogEntry | null>(null);
  const [isRetryingLogId, setIsRetryingLogId] = useState<string | null>(null);

  // Prospectos para prueba y previsualización de variables reales
  const [prospectos, setProspectos] = useState<Prospecto[]>([]);
  const [selectedTestProspectoId, setSelectedTestProspectoId] = useState<string>('sample');

  const loadData = async () => {
    let currentEmpresas: Empresa[] = [];
    let currentPerfiles: UsuarioPerfil[] = [];
    let currentProspectos: Prospecto[] = [];
    let currentLogs: WebhookLogEntry[] = [];

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: dbEmp, error: empErr } = await supabase
          .from('empresas')
          .select('*')
          .order('created_at', { ascending: false });

        if (!empErr && dbEmp) {
          currentEmpresas = dbEmp;
        } else {
          currentEmpresas = [];
        }

        const { data: dbPerf, error: perfErr } = await supabase
          .from('perfiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (!perfErr && dbPerf) {
          currentPerfiles = dbPerf;
        } else {
          currentPerfiles = [];
        }

        const { data: dbPros, error: prosErr } = await supabase
          .from('prospectos')
          .select('*')
          .order('created_at', { ascending: false });

        if (!prosErr && dbPros) {
          currentProspectos = dbPros;
        } else {
          currentProspectos = getDemoProspectos(currentUser);
        }

        const { data: dbLogs, error: logsErr } = await supabase
          .from('webhook_logs')
          .select('*')
          .order('created_at', { ascending: false });

        if (!logsErr && dbLogs) {
          currentLogs = dbLogs;
        } else {
          currentLogs = getDemoWebhookLogs();
        }
      } catch (e) {
        console.error('Error al cargar datos desde Supabase:', e);
        currentEmpresas = getDemoEmpresas();
        currentPerfiles = getDemoPerfiles();
        currentProspectos = getDemoProspectos(currentUser);
        currentLogs = getDemoWebhookLogs();
      }
    } else {
      currentEmpresas = getDemoEmpresas();
      currentPerfiles = getDemoPerfiles();
      currentProspectos = getDemoProspectos(currentUser);
      currentLogs = getDemoWebhookLogs();
    }

    setEmpresas(currentEmpresas);
    setPerfiles(currentPerfiles);
    setProspectos(currentProspectos);
    setWebhookLogs(currentLogs);

    if (currentEmpresas.length > 0) {
      const initialEmpId = (currentUser.rol === 'admin' && currentUser.empresa_id) 
        ? currentUser.empresa_id 
        : currentEmpresas[0].id;
      
      setSelectedCatalogEmpresaId(initialEmpId);
      setSelectedEndpointEmpresaId(initialEmpId);
      setUserEmpresaId(initialEmpId);

      const empObj = currentEmpresas.find(e => e.id === initialEmpId);
      if (empObj) {
        setCatalogCiudades(empObj.ciudades || []);
        const marcas = empObj.marcas || [];
        setCatalogMarcas(marcas);
        setCatalogModelosPorMarca(empObj.modelos_por_marca || {});
        if (marcas.length > 0 && !selectedMarcaForModels) {
          setSelectedMarcaForModels(marcas[0]);
        }

        setEndpointUrl(empObj.endpoint_url || '');
        setEndpointEnabled(empObj.endpoint_enabled || false);
        setEndpointBodyTemplate(empObj.endpoint_body_template || DEFAULT_ENDPOINT_BODY);
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleEndpointEmpresaChange = (empId: string) => {
    setSelectedEndpointEmpresaId(empId);
    const empObj = empresas.find(e => e.id === empId);
    if (empObj) {
      setEndpointUrl(empObj.endpoint_url || '');
      setEndpointEnabled(empObj.endpoint_enabled || false);
      setEndpointBodyTemplate(empObj.endpoint_body_template || DEFAULT_ENDPOINT_BODY);
      setTestResult(null);
    } else {
      setEndpointUrl('');
      setEndpointEnabled(false);
      setEndpointBodyTemplate(DEFAULT_ENDPOINT_BODY);
      setTestResult(null);
    }
  };

  const handleSaveEndpointModule = async () => {
    if (!selectedEndpointEmpresaId) return;

    setIsSavingEndpoint(true);

    try {
      if (isSupabaseConfigured && supabase) {
        let { error } = await supabase
          .from('empresas')
          .update({
            endpoint_url: endpointUrl.trim(),
            endpoint_enabled: endpointEnabled,
            endpoint_body_template: endpointBodyTemplate,
          })
          .eq('id', selectedEndpointEmpresaId);

        if (error && (error.message.includes('column') || error.code === '42703')) {
          console.warn('Fallback a local storage para campos de endpoint');
        }
      }

      updateDemoEmpresa(selectedEndpointEmpresaId, {
        endpoint_url: endpointUrl.trim(),
        endpoint_enabled: endpointEnabled,
        endpoint_body_template: endpointBodyTemplate,
      });

      setEndpointSaveSuccess(true);
      setTimeout(() => setEndpointSaveSuccess(false), 3000);
      await loadData();
      if (onEmpresaUpdated) onEmpresaUpdated();

    } catch (err: any) {
      alert('Error al guardar configuración de endpoint: ' + err.message);
    } finally {
      setIsSavingEndpoint(false);
    }
  };

  const handleTestEndpoint = async () => {
    if (!endpointUrl.trim()) {
      alert('Por favor ingresa primero la URL del endpoint.');
      return;
    }

    setIsTestingEndpoint(true);
    setTestResult(null);

    const empObj = empresas.find(e => e.id === selectedEndpointEmpresaId);

    // Buscar prospecto seleccionado o usar fallback
    const availableProspects = prospectos.filter(p => !p.empresa_id || p.empresa_id === selectedEndpointEmpresaId);
    const listToSearch = availableProspects.length > 0 ? availableProspects : prospectos;
    const foundProspecto = listToSearch.find(p => p.id === selectedTestProspectoId);

    const testProspecto: Prospecto = foundProspecto || {
      id: 'sample-lead-001',
      nombre: 'Juan Carlos Pérez',
      contacto: '76464312',
      ciudad: 'Santa Cruz',
      marca: 'Hyundai',
      modelo: 'Celerio',
      observacion: 'Financiamiento directo con 20% de cuota inicial',
      empresa_id: selectedEndpointEmpresaId,
      empresa_nombre: empObj?.nombre || 'RAFCAR MOTORS',
      creado_por: currentUser.id,
      creado_por_nombre: currentUser.nombre,
      created_at: new Date().toISOString(),
    };

    const testContext = {
      prospecto: testProspecto,
      currentUser,
      empresa: empObj,
      perfiles,
    };

    try {
      const res = await sendLeadToEndpoint(endpointUrl.trim(), endpointBodyTemplate, testContext);
      setTestResult(res);

      const logPayload = {
        empresa_id: selectedEndpointEmpresaId,
        prospecto_id: testProspecto.id,
        prospecto_nombre: `[Prueba POST] ${testProspecto.nombre}`,
        prospecto_contacto: testProspecto.contacto,
        endpoint_url: endpointUrl.trim(),
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
          console.warn('Fallback local para log de webhook de prueba');
        }
      }
      saveDemoWebhookLog(logPayload);
      await loadData();
    } catch (err: any) {
      const errRes = {
        success: false,
        error: err.message || 'Error inesperado durante la prueba.',
      };
      setTestResult(errRes);

      const logPayload = {
        empresa_id: selectedEndpointEmpresaId,
        prospecto_id: testProspecto.id,
        prospecto_nombre: `[Prueba POST] ${testProspecto.nombre}`,
        prospecto_contacto: testProspecto.contacto,
        endpoint_url: endpointUrl.trim(),
        success: false,
        compiled_body: '',
        error: errRes.error,
        created_at: new Date().toISOString(),
      };

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('webhook_logs').insert([logPayload]);
        } catch (logErr) {
          console.warn('Fallback local para log de webhook de prueba');
        }
      }
      saveDemoWebhookLog(logPayload);
      await loadData();
    } finally {
      setIsTestingEndpoint(false);
    }
  };

  const handleRetryWebhookLog = async (log: WebhookLogEntry) => {
    if (!log.endpoint_url || !log.compiled_body) {
      alert('Información de log incompleta para reintentar.');
      return;
    }

    setIsRetryingLogId(log.id);

    try {
      const res = await sendLeadToEndpoint(
        log.endpoint_url.trim(),
        log.compiled_body,
        {
          prospecto: {
            id: log.prospecto_id || '',
            nombre: log.prospecto_nombre || '',
            contacto: log.prospecto_contacto || '',
            marca: '',
            modelo: '',
            created_at: log.created_at || new Date().toISOString(),
          },
          currentUser,
        }
      );

      const newLogPayload: Partial<WebhookLogEntry> = {
        empresa_id: log.empresa_id,
        prospecto_id: log.prospecto_id,
        prospecto_nombre: log.prospecto_nombre,
        prospecto_contacto: log.prospecto_contacto,
        endpoint_url: log.endpoint_url,
        success: res.success,
        status_code: res.statusCode,
        status_text: res.statusText,
        compiled_body: log.compiled_body,
        response_body: res.responseBody,
        error: res.error,
        created_at: res.timestamp || new Date().toISOString(),
      };

      if (isSupabaseConfigured && supabase) {
        try {
          await supabase.from('webhook_logs').insert([newLogPayload]);
        } catch (e) {
          console.warn('Fallback local para log de reintento');
        }
      }
      saveDemoWebhookLog(newLogPayload);

      alert(res.success ? `¡Reintento exitoso! HTTP ${res.statusCode || 200}` : `Reintento fallido: ${res.error || `HTTP ${res.statusCode}`}`);
      await loadData();
    } catch (err: any) {
      const failedPayload: Partial<WebhookLogEntry> = {
        empresa_id: log.empresa_id,
        prospecto_id: log.prospecto_id,
        prospecto_nombre: log.prospecto_nombre,
        prospecto_contacto: log.prospecto_contacto,
        endpoint_url: log.endpoint_url,
        success: false,
        compiled_body: log.compiled_body,
        error: err.message || 'Error de red en el reintento',
        created_at: new Date().toISOString(),
      };
      saveDemoWebhookLog(failedPayload);
      alert('Error de conexión en el reintento: ' + err.message);
      await loadData();
    } finally {
      setIsRetryingLogId(null);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm('¿Estás seguro de que deseas limpiar el historial de logs de envíos?')) return;

    if (isSupabaseConfigured && supabase) {
      try {
        await supabase
          .from('webhook_logs')
          .delete()
          .eq('empresa_id', selectedEndpointEmpresaId);
      } catch (e) {
        console.warn('Fallback a local para borrar logs');
      }
    }
    clearDemoWebhookLogs(selectedEndpointEmpresaId);
    await loadData();
  };

  const insertVariableToken = (token: string) => {
    setEndpointBodyTemplate((prev) => prev + token);
  };

  const handleCatalogEmpresaChange = (empId: string) => {
    setSelectedCatalogEmpresaId(empId);
    const empObj = empresas.find(e => e.id === empId);
    if (empObj) {
      setCatalogCiudades(empObj.ciudades || []);
      const marcas = empObj.marcas || [];
      setCatalogMarcas(marcas);
      setCatalogModelosPorMarca(empObj.modelos_por_marca || {});
      setSelectedMarcaForModels(marcas.length > 0 ? marcas[0] : '');
    } else {
      setCatalogCiudades([]);
      setCatalogMarcas([]);
      setCatalogModelosPorMarca({});
      setSelectedMarcaForModels('');
    }
  };

  if (currentUser.rol !== 'superadmin' && currentUser.rol !== 'admin') {
    return (
      <div className="card-victoria">
        <div className="error-state">
          <AlertCircle size={40} style={{ color: '#ef4444', marginBottom: '1rem' }} />
          <h3>Acceso Restringido</h3>
          <p>Solo los usuarios administradores pueden acceder a esta sección.</p>
        </div>
      </div>
    );
  }

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (isEdit) {
        setEditEmpresaLogoFile(file);
        setEditEmpresaLogoPreview(URL.createObjectURL(file));
      } else {
        setEmpresaLogoFile(file);
        setEmpresaLogoPreview(URL.createObjectURL(file));
      }
    }
  };

  const handleCrearEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser.rol !== 'superadmin') return;
    if (!nuevaEmpresaNombre.trim()) return;

    setIsSubmittingEmpresa(true);
    let logoUrl: string | null = null;

    if (empresaLogoFile) {
      logoUrl = await uploadCompanyLogoFile(empresaLogoFile);
    }

    let insertedEmpresa: Empresa | null = null;

    if (isSupabaseConfigured && supabase) {
      let { data, error } = await supabase
        .from('empresas')
        .insert([
          {
            nombre: nuevaEmpresaNombre.trim(),
            logo_url: logoUrl,
            color_palette: empresaColorPalette
          }
        ])
        .select();

      if (error && (error.message.includes('column') || error.code === '42703')) {
        const { data: retryData } = await supabase
          .from('empresas')
          .insert([{ nombre: nuevaEmpresaNombre.trim() }])
          .select();
        data = retryData;
      }

      if (data && data[0]) {
        insertedEmpresa = data[0];
      }
    }

    saveDemoEmpresa(
      nuevaEmpresaNombre.trim(), 
      logoUrl, 
      empresaColorPalette,
      [],
      [],
      {},
      insertedEmpresa?.id
    );

    setNuevaEmpresaNombre('');
    setEmpresaLogoFile(null);
    setEmpresaLogoPreview(null);
    setEmpresaSuccess(true);
    setIsSubmittingEmpresa(false);
    setTimeout(() => {
      setEmpresaSuccess(false);
      setIsCreateEmpresaModalOpen(false);
    }, 1200);

    await loadData();
    if (onEmpresaUpdated) onEmpresaUpdated();
  };

  const openEditEmpresaModal = (emp: Empresa) => {
    setEditingEmpresa(emp);
    setEditEmpresaNombre(emp.nombre);
    setEditEmpresaLogoPreview(emp.logo_url || null);
    setEditEmpresaLogoFile(null);
    setEditEmpresaPalette(emp.color_palette || 'indigo');
    setEditEmpresaSuccess(false);
  };

  const handleUpdateEmpresa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmpresa || !editEmpresaNombre.trim()) return;

    setIsUpdatingEmpresa(true);
    let logoUrl = editingEmpresa.logo_url || null;

    if (editEmpresaLogoFile) {
      logoUrl = await uploadCompanyLogoFile(editEmpresaLogoFile);
    }

    try {
      if (isSupabaseConfigured && supabase) {
        let { error } = await supabase
          .from('empresas')
          .update({
            nombre: editEmpresaNombre.trim(),
            logo_url: logoUrl,
            color_palette: editEmpresaPalette
          })
          .eq('id', editingEmpresa.id);

        if (error && (error.message.includes('column') || error.code === '42703')) {
          await supabase
            .from('empresas')
            .update({ nombre: editEmpresaNombre.trim() })
            .eq('id', editingEmpresa.id);
        }
      }

      updateDemoEmpresa(editingEmpresa.id, {
        nombre: editEmpresaNombre.trim(),
        logo_url: logoUrl,
        color_palette: editEmpresaPalette
      });

      applyCompanyTheme(editEmpresaPalette);

      setEditEmpresaSuccess(true);
      setTimeout(() => {
        setEditingEmpresa(null);
        setEditEmpresaSuccess(false);
      }, 1200);

      await loadData();
      if (onEmpresaUpdated) onEmpresaUpdated();

    } catch (err: any) {
      alert(err.message || 'Error al actualizar empresa');
    } finally {
      setIsUpdatingEmpresa(false);
    }
  };

  // MÓDULO CATÁLOGOS: Agregar / Eliminar ítems
  const handleAddCiudad = () => {
    if (newCiudadInput.trim()) {
      if (!catalogCiudades.includes(newCiudadInput.trim())) {
        setCatalogCiudades([...catalogCiudades, newCiudadInput.trim()]);
      }
      setNewCiudadInput('');
    }
  };

  const handleRemoveCiudad = (item: string) => {
    setCatalogCiudades(catalogCiudades.filter(c => c !== item));
  };

  const handleAddMarca = () => {
    if (newMarcaInput.trim()) {
      const marcaVal = newMarcaInput.trim();
      if (!catalogMarcas.includes(marcaVal)) {
        const updatedMarcas = [...catalogMarcas, marcaVal];
        setCatalogMarcas(updatedMarcas);
        if (!selectedMarcaForModels) setSelectedMarcaForModels(marcaVal);
      }
      setNewMarcaInput('');
    }
  };

  const handleRemoveMarca = (marcaItem: string) => {
    setCatalogMarcas(catalogMarcas.filter(m => m !== marcaItem));
    const nextMap = { ...catalogModelosPorMarca };
    delete nextMap[marcaItem];
    setCatalogModelosPorMarca(nextMap);
    if (selectedMarcaForModels === marcaItem) {
      const remaining = catalogMarcas.filter(m => m !== marcaItem);
      setSelectedMarcaForModels(remaining.length > 0 ? remaining[0] : '');
    }
  };

  const handleAddModelo = () => {
    if (!selectedMarcaForModels) return;
    if (newModeloInput.trim()) {
      const modVal = newModeloInput.trim();
      const currentList = catalogModelosPorMarca[selectedMarcaForModels] || [];
      if (!currentList.includes(modVal)) {
        setCatalogModelosPorMarca({
          ...catalogModelosPorMarca,
          [selectedMarcaForModels]: [...currentList, modVal]
        });
      }
      setNewModeloInput('');
    }
  };

  const handleRemoveModelo = (modItem: string) => {
    if (!selectedMarcaForModels) return;
    const currentList = catalogModelosPorMarca[selectedMarcaForModels] || [];
    setCatalogModelosPorMarca({
      ...catalogModelosPorMarca,
      [selectedMarcaForModels]: currentList.filter(m => m !== modItem)
    });
  };

  const handleSaveCatalogModule = async () => {
    if (!selectedCatalogEmpresaId) return;

    setIsSavingCatalog(true);

    try {
      if (isSupabaseConfigured && supabase) {
        let { error } = await supabase
          .from('empresas')
          .update({
            ciudades: catalogCiudades,
            marcas: catalogMarcas,
            modelos_por_marca: catalogModelosPorMarca
          })
          .eq('id', selectedCatalogEmpresaId);

        if (error && (error.message.includes('column') || error.code === '42703')) {
          console.warn('Fallback local storage');
        }
      }

      updateDemoEmpresa(selectedCatalogEmpresaId, {
        ciudades: catalogCiudades,
        marcas: catalogMarcas,
        modelos_por_marca: catalogModelosPorMarca
      });

      setCatalogSuccessMsg(true);
      setTimeout(() => setCatalogSuccessMsg(false), 3000);
      await loadData();
      if (onEmpresaUpdated) onEmpresaUpdated();

    } catch (err: any) {
      alert('Error al guardar catálogos: ' + err.message);
    } finally {
      setIsSavingCatalog(false);
    }
  };

  // Creación de Usuario con restricciones estrictas de empresa
  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');
    if (!userNombre.trim() || !userEmail.trim() || !userPassword.trim()) {
      setUserError('El nombre, el usuario/correo y la contraseña son obligatorios.');
      return;
    }

    // Para Admin, la empresa_id es ESTRICTAMENTE la suya
    const targetEmpresaId = (currentUser.rol === 'admin') 
      ? currentUser.empresa_id 
      : ((userRol === 'superadmin' || !userEmpresaId || !isUuid(userEmpresaId)) ? null : userEmpresaId);

    const assignedRol: UserRole = (currentUser.rol === 'admin') ? userRol : userRol;

    const newUserId = generateUUID();

    const cleanCodUsuario = userCodUsuario.trim() || null;

    if (isSupabaseConfigured && supabase) {
      let { error } = await supabase.from('perfiles').insert([
        {
          id: newUserId,
          nombre: userNombre.trim(),
          email: userEmail.trim().toLowerCase(),
          password: userPassword.trim(),
          rol: assignedRol,
          empresa_id: targetEmpresaId,
          cod_usuario: cleanCodUsuario,
        }
      ]);

      if (error && (error.message.includes('column') || error.code === '42703')) {
        // Fallback en caso de que la columna aún no exista en Supabase
        const { error: fallbackError } = await supabase.from('perfiles').insert([
          {
            id: newUserId,
            nombre: userNombre.trim(),
            email: userEmail.trim().toLowerCase(),
            password: userPassword.trim(),
            rol: assignedRol,
            empresa_id: targetEmpresaId,
          }
        ]);
        error = fallbackError;
      }

      if (error) {
        setUserError('Error Supabase: ' + error.message);
        return;
      }
    }

    saveDemoPerfil(
      {
        nombre: userNombre.trim(),
        email: userEmail.trim().toLowerCase(),
        password: userPassword.trim(),
        rol: assignedRol,
        empresa_id: targetEmpresaId,
        cod_usuario: cleanCodUsuario,
      },
      newUserId
    );

    setUserNombre('');
    setUserEmail('');
    setUserPassword('');
    setUserCodUsuario('');
    setUserSuccess(true);
    setTimeout(() => setUserSuccess(false), 3000);
    await loadData();
  };

  // Abrir Modal de Edición Completa de Usuario
  const openEditUserModal = (u: UsuarioPerfil) => {
    setEditingUser(u);
    setEditUserNombre(u.nombre);
    setEditUserEmail(u.email);
    setEditUserCodUsuario(u.cod_usuario || '');
    setEditUserRol(u.rol);
    setEditUserPassword('');
    setEditUserSuccessMsg('');
    setEditUserErrorMsg('');
  };

  // Guardar Edición Completa de Usuario
  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editUserNombre.trim() || !editUserEmail.trim()) return;

    setIsUpdatingUser(true);
    setEditUserErrorMsg('');
    setEditUserSuccessMsg('');

    const cleanEditCod = editUserCodUsuario.trim() || null;

    const updates: Partial<UsuarioPerfil> = {
      nombre: editUserNombre.trim(),
      email: editUserEmail.trim().toLowerCase(),
      rol: editUserRol,
      cod_usuario: cleanEditCod,
    };

    if (editUserPassword.trim()) {
      updates.password = editUserPassword.trim();
    }

    try {
      if (isSupabaseConfigured && supabase) {
        let { error } = await supabase
          .from('perfiles')
          .update(updates)
          .eq('id', editingUser.id);

        if (error && (error.message.includes('column') || error.code === '42703')) {
          delete updates.cod_usuario;
          await supabase
            .from('perfiles')
            .update(updates)
            .eq('id', editingUser.id);
        }
      }

      updateDemoPerfil(editingUser.id, { ...updates, cod_usuario: cleanEditCod });

      setEditUserSuccessMsg('¡Usuario actualizado exitosamente!');
      setTimeout(() => {
        setEditingUser(null);
        setEditUserSuccessMsg('');
      }, 1200);

      await loadData();

    } catch (err: any) {
      setEditUserErrorMsg(err.message || 'Error al actualizar usuario');
    } finally {
      setIsUpdatingUser(false);
    }
  };

  const handleUpdateUserPasswordOnly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserPasswordOnly || !quickNewPassword.trim()) return;

    setQuickPasswordErrorMsg('');
    setQuickPasswordSuccessMsg('');

    try {
      if (isSupabaseConfigured && supabase) {
        await supabase
          .from('perfiles')
          .update({ password: quickNewPassword.trim() })
          .eq('id', editingUserPasswordOnly.id);
      }

      updateDemoPerfilPassword(editingUserPasswordOnly.id, quickNewPassword.trim());

      setQuickPasswordSuccessMsg(`¡Contraseña actualizada con éxito!`);
      setTimeout(() => {
        setEditingUserPasswordOnly(null);
        setQuickNewPassword('');
        setQuickPasswordSuccessMsg('');
      }, 1200);

      await loadData();

    } catch (err: any) {
      setQuickPasswordErrorMsg(err.message || 'Error al cambiar contraseña.');
    }
  };

  const handleDeleteEmpresa = async (emp: Empresa) => {
    if (currentUser.rol !== 'superadmin') return;

    const confirmed = window.confirm(
      `¿Estás seguro de que deseas eliminar la empresa "${emp.nombre}"?\nEsta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from('empresas').delete().eq('id', emp.id);
      }
      deleteDemoEmpresa(emp.id);

      await loadData();
      if (onEmpresaUpdated) onEmpresaUpdated();
    } catch (err: any) {
      alert('Error al eliminar la empresa: ' + (err.message || err));
    }
  };

  const handleDeleteUser = async (userToDelete: UsuarioPerfil) => {
    if (currentUser.rol !== 'superadmin' && currentUser.rol !== 'admin') return;

    if (userToDelete.id === currentUser.id) {
      alert('No puedes eliminar tu propia cuenta de usuario en sesión activa.');
      return;
    }

    const confirmed = window.confirm(
      `¿Estás seguro de que deseas eliminar al usuario "${userToDelete.nombre}" (${userToDelete.email})?\nEsta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.from('perfiles').delete().eq('id', userToDelete.id);
      }
      deleteDemoPerfil(userToDelete.id);

      await loadData();
    } catch (err: any) {
      alert('Error al eliminar el usuario: ' + (err.message || err));
    }
  };

  // Filtrado de empresas visibles (Superadmin ve todas, Admin ve solo su empresa)
  const visibleEmpresas = currentUser.rol === 'superadmin' 
    ? empresas 
    : empresas.filter(e => e.id === currentUser.empresa_id);

  // Filtrado de usuarios visibles (Superadmin ve todos, Admin ve solo los de su empresa)
  const visiblePerfiles = currentUser.rol === 'superadmin'
    ? perfiles
    : perfiles.filter(p => p.empresa_id === currentUser.empresa_id);

  const selectedCatalogEmpresaObj = empresas.find(e => e.id === selectedCatalogEmpresaId);
  const selectedEndpointEmpresaObj = empresas.find(e => e.id === selectedEndpointEmpresaId);
  const modelsForSelectedMarca = selectedMarcaForModels ? (catalogModelosPorMarca[selectedMarcaForModels] || []) : [];

  const jsonValidation = validateJsonString(endpointBodyTemplate);

  // Prospectos disponibles para la empresa seleccionada o globales
  const availableTestProspectos = prospectos.filter(p => !p.empresa_id || p.empresa_id === selectedEndpointEmpresaId);
  const activeTestProspectosList = availableTestProspectos.length > 0 ? availableTestProspectos : prospectos;

  const foundSelectedProspecto = activeTestProspectosList.find(p => p.id === selectedTestProspectoId);

  const sampleLeadDefault: Prospecto = {
    id: 'sample-lead-001',
    nombre: 'Juan Carlos Pérez',
    contacto: '76464312',
    ciudad: 'Santa Cruz',
    marca: 'Hyundai',
    modelo: 'Celerio',
    observacion: 'Financiamiento directo con 20% inicial',
    empresa_id: selectedEndpointEmpresaId,
    empresa_nombre: selectedEndpointEmpresaObj?.nombre || 'RAFCAR MOTORS',
    creado_por: currentUser.id,
    creado_por_nombre: currentUser.nombre,
    created_at: new Date().toISOString(),
  };

  const activeTestProspecto = foundSelectedProspecto || sampleLeadDefault;

  const samplePreviewContext = {
    prospecto: activeTestProspecto,
    currentUser,
    empresa: selectedEndpointEmpresaObj,
    perfiles,
  };

  const compiledPreview = compileJsonTemplate(endpointBodyTemplate, samplePreviewContext);

  const companyLogs = webhookLogs.filter(l => !l.empresa_id || l.empresa_id === selectedEndpointEmpresaId);

  const filteredLogs = companyLogs.filter(l => {
    if (logStatusFilter === 'success' && !l.success) return false;
    if (logStatusFilter === 'failed' && l.success) return false;
    if (logSearchText.trim()) {
      const q = logSearchText.toLowerCase();
      const matchName = (l.prospecto_nombre || '').toLowerCase().includes(q);
      const matchContact = (l.prospecto_contacto || '').toLowerCase().includes(q);
      const matchUrl = (l.endpoint_url || '').toLowerCase().includes(q);
      return matchName || matchContact || matchUrl;
    }
    return true;
  });

  const totalLogsCount = companyLogs.length;
  const successLogsCount = companyLogs.filter(l => l.success).length;
  const failedLogsCount = companyLogs.filter(l => !l.success).length;
  const successRate = totalLogsCount > 0 ? Math.round((successLogsCount / totalLogsCount) * 100) : 100;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="card-victoria">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="kpi-icon-badge purple">
              {activeSubTab === 'empresas' && <Building2 size={24} />}
              {activeSubTab === 'catalogos' && <Sliders size={24} />}
              {activeSubTab === 'endpoint' && <Globe size={24} />}
              {activeSubTab === 'usuarios' && <Users size={24} />}
            </div>
            <div>
              <h2 className="card-victoria-title" style={{ fontSize: '1.35rem' }}>
                {activeSubTab === 'empresas' && (currentUser.rol === 'superadmin' ? 'Empresas Registradas' : 'Mi Empresa')}
                {activeSubTab === 'catalogos' && 'Catálogos y Desplegables'}
                {activeSubTab === 'endpoint' && 'Integración de Endpoint HTTP POST'}
                {activeSubTab === 'usuarios' && 'Usuarios y Roles'}
              </h2>
              <p className="card-victoria-sub">
                {activeSubTab === 'empresas' && 'Administración de la información y logotipos de empresa'}
                {activeSubTab === 'catalogos' && 'Configuración de ciudades, marcas y modelos vehiculares'}
                {activeSubTab === 'endpoint' && 'Redacción de Body JSON y configuración de envío automático de leads'}
                {activeSubTab === 'usuarios' && `Administración de cuentas de acceso (${visiblePerfiles.length} usuarios registrados)`}
              </p>
            </div>
          </div>

          {/* NAVEGACIÓN RÁPIDA DE SUBPESTAÑAS */}
          {_onSubTabChange && (
            <div style={{ display: 'flex', gap: '0.35rem', background: 'var(--bg-surface-hover)', padding: '0.3rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <button
                type="button"
                onClick={() => _onSubTabChange('empresas')}
                style={{
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.8rem',
                  borderRadius: '7px',
                  border: 'none',
                  background: activeSubTab === 'empresas' ? 'var(--primary-accent)' : 'transparent',
                  color: activeSubTab === 'empresas' ? 'white' : 'var(--text-dim)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Building2 size={14} /> Empresa
              </button>
              <button
                type="button"
                onClick={() => _onSubTabChange('catalogos')}
                style={{
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.8rem',
                  borderRadius: '7px',
                  border: 'none',
                  background: activeSubTab === 'catalogos' ? 'var(--primary-accent)' : 'transparent',
                  color: activeSubTab === 'catalogos' ? 'white' : 'var(--text-dim)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Sliders size={14} /> Catálogos
              </button>
              <button
                type="button"
                onClick={() => _onSubTabChange('endpoint')}
                style={{
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.8rem',
                  borderRadius: '7px',
                  border: 'none',
                  background: activeSubTab === 'endpoint' ? 'var(--primary-accent)' : 'transparent',
                  color: activeSubTab === 'endpoint' ? 'white' : 'var(--text-dim)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Globe size={14} /> Endpoint POST
              </button>
              <button
                type="button"
                onClick={() => _onSubTabChange('usuarios')}
                style={{
                  padding: '0.4rem 0.75rem',
                  fontSize: '0.8rem',
                  borderRadius: '7px',
                  border: 'none',
                  background: activeSubTab === 'usuarios' ? 'var(--primary-accent)' : 'transparent',
                  color: activeSubTab === 'usuarios' ? 'white' : 'var(--text-dim)',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem'
                }}
              >
                <Users size={14} /> Usuarios
              </button>
            </div>
          )}
        </div>

        {/* SECCIÓN 1: EMPRESAS */}
        {activeSubTab === 'empresas' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {currentUser.rol === 'superadmin' ? 'Empresas Registradas en el Sistema' : 'Ficha de Tu Empresa'}
              </h3>
              
              {currentUser.rol === 'superadmin' && (
                <button
                  type="button"
                  onClick={() => setIsCreateEmpresaModalOpen(true)}
                  className="btn-primary"
                  style={{ fontSize: '0.85rem', padding: '0.5rem 1rem' }}
                >
                  <Plus size={16} /> Nueva Empresa
                </button>
              )}
            </div>

            <div className="records-list">
              {visibleEmpresas.map((emp) => {
                const currentTheme = COLOR_THEMES.find(t => t.id === emp.color_palette) || COLOR_THEMES[0];
                return (
                  <div key={emp.id} className="record-item" style={{ justifyContent: 'space-between', padding: '1rem 1.25rem', marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                      {emp.logo_url ? (
                        <img
                          src={emp.logo_url}
                          alt={emp.nombre}
                          style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover', border: `2px solid ${currentTheme.primary}` }}
                        />
                      ) : (
                        <div className="record-icon" style={{ width: '44px', height: '44px' }}><Building2 size={22} /></div>
                      )}
                      <div>
                        <div className="record-title" style={{ fontSize: '1.05rem', fontWeight: 700 }}>{emp.nombre}</div>
                        <div className="record-sub" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.2rem' }}>
                          <span>Paleta activa: <strong>{currentTheme.name}</strong></span>
                          <span>•</span>
                          <span>{(emp.marcas || []).length} marcas</span>
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => openEditEmpresaModal(emp)}
                        className="btn-secondary"
                        style={{ padding: '0.45rem 0.95rem', fontSize: '0.85rem' }}
                      >
                        <Edit2 size={14} /> Editar Nombre & Logo
                      </button>

                      {currentUser.rol === 'superadmin' && (
                        <button
                          type="button"
                          onClick={() => handleDeleteEmpresa(emp)}
                          className="btn-danger-sm"
                          title="Eliminar Empresa"
                        >
                          <Trash2 size={14} /> Eliminar
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECCIÓN 2: CATÁLOGOS Y DESPLEGABLES */}
        {activeSubTab === 'catalogos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {currentUser.rol === 'superadmin' && (
              <div style={{ background: 'var(--bg-surface-hover)', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Building2 size={16} style={{ color: 'var(--primary-accent)' }} /> Selecciona Empresa a Configurar:
                </span>
                <select
                  value={selectedCatalogEmpresaId}
                  onChange={(e) => handleCatalogEmpresaChange(e.target.value)}
                  className="input-field"
                  style={{ width: 'auto', minWidth: '240px' }}
                >
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            {catalogSuccessMsg && (
              <div className="success-msg" style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '0.85rem 1.25rem', borderRadius: '10px' }}>
                <CheckCircle2 size={18} /> ¡Opciones de catálogos guardadas exitosamente para {selectedCatalogEmpresaObj?.nombre || 'la empresa'}!
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.25rem' }}>
              
              {/* VARIABLE 1: CIUDADES */}
              <div className="form-box">
                <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <MapPin size={16} style={{ color: 'var(--primary-accent)' }} /> 1. Ciudades Disponibles ({catalogCiudades.length})
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.85rem' }}>
                  Agrega las ciudades que aparecerán en la lista desplegable.
                </p>

                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem' }}>
                  <input
                    type="text"
                    placeholder="Ej. Santiago..."
                    value={newCiudadInput}
                    onChange={(e) => setNewCiudadInput(e.target.value)}
                    className="input-field"
                    style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCiudad(); } }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCiudad}
                    className="btn-primary"
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                  >
                    <Plus size={14} /> Agregar
                  </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', minHeight: '60px', background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  {catalogCiudades.length === 0 ? (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>No hay ciudades configuradas.</span>
                  ) : (
                    catalogCiudades.map((c) => (
                      <span key={c} className="brand-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        {c}
                        <button type="button" onClick={() => handleRemoveCiudad(c)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>×</button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* VARIABLE 2: MARCAS */}
              <div className="form-box">
                <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Car size={16} style={{ color: 'var(--primary-accent)' }} /> 2. Marcas Disponibles ({catalogMarcas.length})
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.85rem' }}>
                  Agrega las marcas vehiculares principales de la empresa.
                </p>

                <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '1rem' }}>
                  <input
                    type="text"
                    placeholder="Ej. Toyota..."
                    value={newMarcaInput}
                    onChange={(e) => setNewMarcaInput(e.target.value)}
                    className="input-field"
                    style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddMarca(); } }}
                  />
                  <button
                    type="button"
                    onClick={handleAddMarca}
                    className="btn-primary"
                    style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                  >
                    <Plus size={14} /> Agregar
                  </button>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', minHeight: '60px', background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  {catalogMarcas.length === 0 ? (
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>No hay marcas configuradas.</span>
                  ) : (
                    catalogMarcas.map((m) => (
                      <span key={m} className="brand-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                        {m}
                        <button type="button" onClick={() => handleRemoveMarca(m)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>×</button>
                      </span>
                    ))
                  )}
                </div>
              </div>

              {/* VARIABLE 3: MODELOS ASOCIADOS DIRECTAMENTE A UNA MARCA SELECCIONADA */}
              <div className="form-box" style={{ gridColumn: 'span 2' }}>
                <h3 style={{ fontSize: '1rem', color: 'var(--text-main)', marginBottom: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Tag size={16} style={{ color: 'var(--primary-accent)' }} /> 3. Modelos Asociados por Marca
                </h3>

                {catalogMarcas.length === 0 ? (
                  <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', padding: '0.85rem', borderRadius: '8px', color: '#d97706', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <AlertCircle size={16} /> Primero agrega una Marca en el panel de arriba para asignarle sus modelos.
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                        Selecciona la Marca a la que pertenecen los modelos:
                      </span>
                      <select
                        value={selectedMarcaForModels}
                        onChange={(e) => setSelectedMarcaForModels(e.target.value)}
                        className="input-field"
                        style={{ width: 'auto', minWidth: '180px', fontWeight: 'bold', color: 'var(--primary-accent)' }}
                      >
                        {catalogMarcas.map((m) => (
                          <option key={m} value={m}>Marca: {m}</option>
                        ))}
                      </select>
                    </div>

                    {selectedMarcaForModels && (
                      <div>
                        <div style={{ display: 'flex', gap: '0.4rem', marginBottom: '0.75rem' }}>
                          <input
                            type="text"
                            placeholder={`Agregar modelo para ${selectedMarcaForModels} (Ej. RAV4)...`}
                            value={newModeloInput}
                            onChange={(e) => setNewModeloInput(e.target.value)}
                            className="input-field"
                            style={{ padding: '0.45rem 0.75rem', fontSize: '0.85rem' }}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddModelo(); } }}
                          />
                          <button
                            type="button"
                            onClick={handleAddModelo}
                            className="btn-primary"
                            style={{ padding: '0.45rem 0.85rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                          >
                            <Plus size={14} /> Agregar Modelo
                          </button>
                        </div>

                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', minHeight: '60px', background: 'var(--bg-surface)', padding: '0.75rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                          {modelsForSelectedMarca.length === 0 ? (
                            <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontStyle: 'italic' }}>
                              No hay modelos registrados para la marca "{selectedMarcaForModels}".
                            </span>
                          ) : (
                            modelsForSelectedMarca.map((mod) => (
                              <span key={mod} className="brand-chip" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', background: 'var(--primary-glow)', borderColor: 'var(--primary-accent)' }}>
                                <strong>{selectedMarcaForModels}</strong> — {mod}
                                <button type="button" onClick={() => handleRemoveModelo(mod)} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', fontSize: '1rem', lineHeight: 1 }}>×</button>
                              </span>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

            </div>

            {/* BOTÓN DE GUARDADO */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button
                type="button"
                onClick={handleSaveCatalogModule}
                className="btn-primary"
                disabled={isSavingCatalog}
                style={{ padding: '0.85rem 2rem', fontSize: '0.95rem' }}
              >
                <Save size={18} /> {isSavingCatalog ? 'Guardando Catálogos...' : 'Guardar Configuración de Catálogos'}
              </button>
            </div>
          </div>
        )}

        {/* SECCIÓN CONFIGURACIÓN DE ENDPOINT HTTP POST (WEBHOOKS) */}
        {activeSubTab === 'endpoint' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            {currentUser.rol === 'superadmin' && (
              <div style={{ background: 'var(--bg-surface-hover)', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Building2 size={16} style={{ color: 'var(--primary-accent)' }} /> Empresa a Configurar Endpoint:
                </span>
                <select
                  value={selectedEndpointEmpresaId}
                  onChange={(e) => handleEndpointEmpresaChange(e.target.value)}
                  className="input-field"
                  style={{ width: 'auto', minWidth: '240px' }}
                >
                  {empresas.map((e) => (
                    <option key={e.id} value={e.id}>{e.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            {endpointSaveSuccess && (
              <div className="success-msg" style={{ background: 'rgba(16, 185, 129, 0.15)', padding: '0.85rem 1.25rem', borderRadius: '10px' }}>
                <CheckCircle2 size={18} /> ¡Configuración del Endpoint POST guardada exitosamente para {selectedEndpointEmpresaObj?.nombre || 'la empresa'}!
              </div>
            )}

            {/* HEADER DE MÓDULO ENDPOINT */}
            <div style={{ background: 'var(--bg-surface)', padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                <div className="kpi-icon-badge purple" style={{ width: '44px', height: '44px' }}>
                  <Globe size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                    Envío Automático de Leads a Endpoint Externo
                  </h3>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', margin: '0.2rem 0 0 0' }}>
                    Configura la URL de tu API o CRM para recibir cada nuevo lead en formato JSON mediante método POST.
                  </p>
                </div>
              </div>

              {/* TOGGLE SWITCH DE ACTIVACIÓN */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', background: 'var(--bg-surface-hover)', padding: '0.6rem 1rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                <input
                  type="checkbox"
                  checked={endpointEnabled}
                  onChange={(e) => setEndpointEnabled(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: 'var(--primary-accent)' }}
                />
                <span style={{ fontSize: '0.88rem', fontWeight: 600, color: endpointEnabled ? 'var(--primary-accent)' : 'var(--text-dim)' }}>
                  {endpointEnabled ? '🟢 Integración ACTIVA' : '⚪ Integración INACTIVA'}
                </span>
              </label>
            </div>

            {/* NAVEGACIÓN SUB-PESTAÑAS DEL MÓDULO ENDPOINT */}
            <div style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setEndpointModeView('config')}
                className="btn-secondary"
                style={{
                  padding: '0.55rem 1.25rem',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: endpointModeView === 'config' ? 'var(--primary-glow)' : 'transparent',
                  borderColor: endpointModeView === 'config' ? 'var(--primary-accent)' : 'var(--border-color)',
                  color: endpointModeView === 'config' ? 'var(--primary-accent)' : 'var(--text-dim)',
                }}
              >
                <Globe size={16} /> ⚙️ Configuración & Editor JSON
              </button>
              <button
                type="button"
                onClick={() => setEndpointModeView('logs')}
                className="btn-secondary"
                style={{
                  padding: '0.55rem 1.25rem',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  background: endpointModeView === 'logs' ? 'var(--primary-glow)' : 'transparent',
                  borderColor: endpointModeView === 'logs' ? 'var(--primary-accent)' : 'var(--border-color)',
                  color: endpointModeView === 'logs' ? 'var(--primary-accent)' : 'var(--text-dim)',
                }}
              >
                <FileText size={16} /> 📋 Historial de Envíos (Logs {companyLogs.length > 0 ? `[${companyLogs.length}]` : ''})
              </button>
            </div>

            {endpointModeView === 'config' ? (
              <>
                {/* GRID PRINCIPAL EDICIÓN / PREVIEW */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: '1.5rem' }}>
                  
                  {/* COLUMNA IZQUIERDA: URL Y EDITOR DE BODY JSON */}
                  <div className="form-box" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                      <Globe size={16} style={{ color: 'var(--primary-accent)' }} /> 1. Dirección del Endpoint POST
                    </h4>

                    <div className="input-group" style={{ margin: 0 }}>
                      <label className="input-label">URL DEL ENDPOINT (Método HTTP POST)</label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ background: 'var(--primary-accent)', color: 'white', fontWeight: 800, fontSize: '0.78rem', padding: '0.55rem 0.85rem', borderRadius: '8px' }}>
                          POST
                        </span>
                        <input
                          type="url"
                          placeholder="https://api.tu-crm.com/v1/leads/webhook"
                          value={endpointUrl}
                          onChange={(e) => setEndpointUrl(e.target.value)}
                          className="input-field"
                          style={{ flex: 1 }}
                        />
                      </div>
                    </div>

                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                          <Code size={16} style={{ color: 'var(--primary-accent)' }} /> 2. Redactor de Body JSON
                        </h4>

                        {/* INDICADOR DE SINTAXIS JSON */}
                        {jsonValidation.isValid ? (
                          <span style={{ fontSize: '0.78rem', color: '#10b981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <Check size={14} /> JSON Válido
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#ef4444', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                            <AlertCircle size={14} /> Error de Sintaxis JSON
                          </span>
                        )}
                      </div>

                      <p style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.65rem' }}>
                        Haz clic en las variables reales del formulario de prospectos o del sistema para insertarlas en el editor JSON:
                      </p>

                      {/* BARRA CHIPS DE VARIABLES ORGANIZADAS POR CATEGORÍA */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem', marginBottom: '0.85rem' }}>
                        <div>
                          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--primary-accent)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            📝 Campos Reales del Formulario de Prospecto:
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {AVAILABLE_VARIABLES.filter(v => v.category === 'formulario').map((v) => (
                              <button
                                key={v.token}
                                type="button"
                                onClick={() => insertVariableToken(v.token)}
                                className="btn-secondary"
                                style={{ 
                                  padding: '0.3rem 0.65rem', 
                                  fontSize: '0.8rem', 
                                  fontFamily: 'monospace', 
                                  fontWeight: 700,
                                  background: 'var(--primary-glow)',
                                  borderColor: 'var(--primary-accent)',
                                  color: 'var(--text-main)'
                                }}
                                title={`${v.label}: ${v.description}`}
                              >
                                + {v.token}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div>
                          <div style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                            ⚙️ Usuario, Empresa y Sistema:
                          </div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                            {AVAILABLE_VARIABLES.filter(v => v.category === 'sistema').map((v) => (
                              <button
                                key={v.token}
                                type="button"
                                onClick={() => insertVariableToken(v.token)}
                                className="btn-secondary"
                                style={{ padding: '0.28rem 0.6rem', fontSize: '0.76rem', fontFamily: 'monospace', background: 'var(--bg-surface-hover)' }}
                                title={`${v.label}: ${v.description}`}
                              >
                                + {v.token}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* TEXTAREA DEL BODY JSON */}
                      <textarea
                        rows={12}
                        value={endpointBodyTemplate}
                        onChange={(e) => setEndpointBodyTemplate(e.target.value)}
                        className="input-field textarea-field"
                        style={{
                          fontFamily: 'monospace',
                          fontSize: '0.84rem',
                          lineHeight: 1.5,
                          background: 'var(--bg-surface)',
                          color: 'var(--text-main)',
                          borderColor: jsonValidation.isValid ? 'var(--border-color)' : '#ef4444'
                        }}
                        placeholder={`{\n  "ciudad": "{ciudad}",\n  "nombre": "{nombre}"\n}`}
                      />

                      {!jsonValidation.isValid && (
                        <div style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: '0.4rem' }}>
                          Detalle de error: {jsonValidation.error}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* COLUMNA DERECHA: PREVIEW Y PRUEBA EN TIEMPO REAL */}
                  <div className="form-box" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.4rem', margin: 0 }}>
                      <Sparkles size={16} style={{ color: 'var(--primary-accent)' }} /> 3. Previsualización y Prueba de Petición
                    </h4>

                    <div>
                      {/* SELECTOR DE PROSPECTO REAL DE PRUEBA */}
                      <div style={{ marginBottom: '0.85rem', background: 'var(--bg-surface-hover)', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
                        <label className="input-label" style={{ marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary-accent)', fontWeight: 700, fontSize: '0.8rem' }}>
                          <User size={14} /> PROSPECTO REAL A EVALUAR EN LA PRUEBA:
                        </label>
                        <select
                          value={selectedTestProspectoId}
                          onChange={(e) => setSelectedTestProspectoId(e.target.value)}
                          className="input-field"
                          style={{ fontSize: '0.85rem', padding: '0.45rem 0.65rem' }}
                        >
                          <option value="sample">✨ Lead de Ejemplo (Demostración por defecto)</option>
                          {activeTestProspectosList.map((p) => (
                            <option key={p.id} value={p.id}>
                              👤 {p.nombre} - {p.marca} {p.modelo} | {p.ciudad || 'Sin ciudad'} ({p.contacto})
                            </option>
                          ))}
                        </select>
                        <div style={{ fontSize: '0.74rem', color: 'var(--text-dim)', marginTop: '0.35rem' }}>
                          Selecciona un prospecto para evaluar cómo se rellenan sus datos reales ({'{nombre}'}, {'{ciudad}'}, {'{contacto}'}, {'{marca}'}, {'{modelo}'}, {'{observacion}'}).
                        </div>
                      </div>

                      <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
                        Body JSON resultante a enviar ({activeTestProspecto.nombre}):
                      </div>

                      <pre style={{
                        background: 'var(--bg-surface-hover)',
                        padding: '1rem',
                        borderRadius: '10px',
                        fontSize: '0.82rem',
                        fontFamily: 'monospace',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        color: 'var(--text-main)',
                        border: '1px solid var(--border-color)',
                        maxHeight: '260px',
                        overflowY: 'auto'
                      }}>
                        {compiledPreview}
                      </pre>
                    </div>

                    {/* BOTÓN PARA PROBAR EL ENDPOINT */}
                    <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                      <button
                        type="button"
                        onClick={handleTestEndpoint}
                        className="btn-secondary"
                        disabled={isTestingEndpoint || !endpointUrl.trim()}
                        style={{ width: '100%', padding: '0.75rem', justifyContent: 'center', fontSize: '0.88rem', fontWeight: 600 }}
                      >
                        <Play size={16} /> {isTestingEndpoint ? 'Enviando petición de prueba...' : 'Probar Endpoint POST Ahora'}
                      </button>

                      {/* RESULTADO DE LA PRUEBA EN VIVO */}
                      {testResult && (
                        <div style={{
                          marginTop: '1rem',
                          padding: '1rem',
                          borderRadius: '10px',
                          background: testResult.success ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                          border: `1px solid ${testResult.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                        }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <span style={{ fontWeight: 700, fontSize: '0.88rem', color: testResult.success ? '#10b981' : '#ef4444' }}>
                              {testResult.success ? `✅ HTTP ${testResult.statusCode || 200} ${testResult.statusText || 'OK'}` : `❌ Error de Petición`}
                            </span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                              {testResult.timestamp ? new Date(testResult.timestamp).toLocaleTimeString() : ''}
                            </span>
                          </div>

                          {testResult.error && (
                            <div style={{ fontSize: '0.8rem', color: '#ef4444', marginBottom: '0.5rem' }}>
                              {testResult.error}
                            </div>
                          )}

                          {(testResult.error?.includes('CORS') || testResult.error?.includes('Failed to fetch')) && (
                            <div style={{
                              marginTop: '0.75rem',
                              padding: '0.75rem',
                              borderRadius: '8px',
                              background: 'rgba(234, 179, 8, 0.1)',
                              border: '1px solid rgba(234, 179, 8, 0.35)',
                              fontSize: '0.78rem'
                            }}>
                              <div style={{ fontWeight: 700, color: '#eab308', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                                💡 Solución para el Error de CORS en webhook.php
                              </div>
                              <div style={{ color: 'var(--text-dim)', marginBottom: '0.4rem', lineHeight: 1.4 }}>
                                Agrega las siguientes líneas al inicio de tu script PHP en <code>autosud.center</code>:
                              </div>
                              <pre style={{
                                background: 'var(--bg-surface)',
                                padding: '0.5rem 0.65rem',
                                borderRadius: '6px',
                                fontSize: '0.74rem',
                                fontFamily: 'monospace',
                                color: 'var(--text-main)',
                                margin: 0,
                                whiteSpace: 'pre-wrap',
                                border: '1px solid var(--border-color)'
                              }}>
{`header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if (\$_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}`}
                              </pre>
                            </div>
                          )}

                          {testResult.responseBody && (
                            <div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: '0.2rem', fontWeight: 600 }}>
                                Respuesta recibida del servidor:
                              </div>
                              <pre style={{
                                background: 'var(--bg-surface)',
                                padding: '0.6rem',
                                borderRadius: '6px',
                                fontSize: '0.78rem',
                                fontFamily: 'monospace',
                                color: 'var(--text-main)',
                                maxHeight: '120px',
                                overflowY: 'auto',
                                margin: 0
                              }}>
                                {testResult.responseBody}
                              </pre>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* BOTÓN FINAL DE GUARDAR CONFIGURACIÓN */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={handleSaveEndpointModule}
                    className="btn-primary"
                    disabled={isSavingEndpoint || !jsonValidation.isValid}
                    style={{ padding: '0.85rem 2rem', fontSize: '0.95rem' }}
                  >
                    <Save size={18} /> {isSavingEndpoint ? 'Guardando Endpoint...' : 'Guardar Configuración de Endpoint'}
                  </button>
                </div>
              </>
            ) : (
              /* PANEL MÓDULO LOGS Y AUDITORÍA DE ENVIOS POST */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* TARJETAS DE SUMMARY KPIS DE LOGS */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                  <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', fontWeight: 600 }}>TOTAL PETICIONES</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--text-main)', marginTop: '0.2rem' }}>{totalLogsCount}</div>
                  </div>
                  <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                    <div style={{ fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>ENTREGADOS (HTTP 2xx)</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#10b981', marginTop: '0.2rem' }}>{successLogsCount}</div>
                  </div>
                  <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                    <div style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 600 }}>FALLIDOS / ERRORES</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#ef4444', marginTop: '0.2rem' }}>{failedLogsCount}</div>
                  </div>
                  <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.8rem', color: 'var(--primary-accent)', fontWeight: 600 }}>TASA DE ÉXITO</div>
                    <div style={{ fontSize: '1.6rem', fontWeight: 800, color: 'var(--primary-accent)', marginTop: '0.2rem' }}>{successRate}%</div>
                  </div>
                </div>

                {/* FILTROS Y BÚSQUEDA */}
                <div style={{ background: 'var(--bg-surface)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => setLogStatusFilter('all')}
                      className={`btn-secondary btn-sm ${logStatusFilter === 'all' ? 'active' : ''}`}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }}
                    >
                      Todos ({totalLogsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogStatusFilter('success')}
                      className={`btn-secondary btn-sm ${logStatusFilter === 'success' ? 'active' : ''}`}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: '#10b981' }}
                    >
                      ✅ Exitosos ({successLogsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setLogStatusFilter('failed')}
                      className={`btn-secondary btn-sm ${logStatusFilter === 'failed' ? 'active' : ''}`}
                      style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', color: '#ef4444' }}
                    >
                      ❌ Fallidos ({failedLogsCount})
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flex: 1, maxWidth: '400px' }}>
                    <div className="input-group" style={{ flex: 1, margin: 0 }}>
                      <input
                        type="text"
                        placeholder="Buscar por prospecto o teléfono..."
                        value={logSearchText}
                        onChange={(e) => setLogSearchText(e.target.value)}
                        className="input-field"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.82rem' }}
                      />
                    </div>

                    {companyLogs.length > 0 && (
                      <button
                        type="button"
                        onClick={handleClearLogs}
                        className="btn-danger-sm"
                        style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem', whiteSpace: 'nowrap' }}
                        title="Limpiar historial de logs"
                      >
                        <Trash2 size={14} /> Limpiar Logs
                      </button>
                    )}
                  </div>
                </div>

                {/* TABLA DE REGISTROS DE LOGS */}
                {filteredLogs.length === 0 ? (
                  <div style={{ background: 'var(--bg-surface)', padding: '3rem 1.5rem', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'center', color: 'var(--text-dim)' }}>
                    <FileText size={36} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
                    <h4 style={{ margin: 0, color: 'var(--text-main)' }}>No hay registros de envíos en esta vista</h4>
                    <p style={{ fontSize: '0.85rem', marginTop: '0.35rem' }}>Los envíos de nuevos prospectos o pruebas POST se registrarán aquí automáticamente.</p>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {filteredLogs.map((log) => (
                      <div
                        key={log.id}
                        style={{
                          background: 'var(--bg-surface)',
                          border: `1px solid ${log.success ? 'var(--border-color)' : 'rgba(239, 68, 68, 0.4)'}`,
                          borderRadius: '12px',
                          padding: '0.9rem 1.25rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '1rem',
                          flexWrap: 'wrap'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '50%',
                            background: log.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: log.success ? '#10b981' : '#ef4444',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 'bold',
                            fontSize: '0.9rem'
                          }}>
                            {log.success ? '✓' : '✕'}
                          </div>

                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.92rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                              {log.prospecto_nombre}
                              {log.prospecto_contacto && (
                                <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontWeight: 400 }}>({log.prospecto_contacto})</span>
                              )}
                            </div>
                            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: '0.15rem' }}>
                              <span>{new Date(log.created_at).toLocaleString()}</span>
                              <span> • </span>
                              <span style={{ fontFamily: 'monospace' }}>{log.endpoint_url}</span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          {/* BADGE DE ESTADO HTTP */}
                          <span style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            padding: '0.3rem 0.65rem',
                            borderRadius: '20px',
                            background: log.success ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color: log.success ? '#10b981' : '#ef4444',
                            border: `1px solid ${log.success ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`
                          }}>
                            {log.success 
                              ? `✅ HTTP ${log.status_code || 200}` 
                              : `❌ ${log.status_code ? `HTTP ${log.status_code}` : 'Error de Conexión'}`}
                          </span>

                          {/* BOTÓN VER DETALLE COMPLETO */}
                          <button
                            type="button"
                            onClick={() => setSelectedDetailLog(log)}
                            className="btn-secondary btn-sm"
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem' }}
                          >
                            👁️ Ver Carga JSON
                          </button>

                          {/* BOTÓN REINTENTAR ENVÍO */}
                          <button
                            type="button"
                            onClick={() => handleRetryWebhookLog(log)}
                            className="btn-secondary btn-sm"
                            disabled={isRetryingLogId === log.id}
                            style={{ padding: '0.35rem 0.75rem', fontSize: '0.78rem', background: 'var(--primary-glow)', color: 'var(--primary-accent)' }}
                            title="Volver a intentar enviar este POST al servidor"
                          >
                            <RefreshCw size={12} className={isRetryingLogId === log.id ? 'spin' : ''} /> {isRetryingLogId === log.id ? 'Reintentando...' : 'Reintentar'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* SECCIÓN 3: USUARIOS Y ROLES (PRESENTACIÓN REDISEÑADA EN FORMATO DE TABLA MODERNA) */}
        {activeSubTab === 'usuarios' && (
          <div className="section-grid" style={{ gridTemplateColumns: '340px 1fr' }}>
            
            {/* FORMULARIO DE CREACIÓN DE USUARIO */}
            <div className="form-box">
              <h3><UserPlus size={18} /> Registrar Usuario</h3>
              <form onSubmit={handleCrearUsuario} style={{ marginTop: '1rem' }}>
                {userError && (
                  <div className="error-banner" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={16} /> {userError}
                  </div>
                )}

                <div className="input-group">
                  <label className="input-label"><User size={15} /> NOMBRE COMPLETO</label>
                  <input
                    type="text"
                    placeholder="Ej. Pedro Morales"
                    value={userNombre}
                    onChange={(e) => setUserNombre(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>

                <div className="input-group" style={{ marginTop: '0.75rem' }}>
                  <label className="input-label"><Mail size={15} /> USUARIO / CORREO</label>
                  <input
                    type="text"
                    placeholder="ejemplo.usuario o correo@empresa.com"
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>

                <div className="input-group" style={{ marginTop: '0.75rem' }}>
                  <label className="input-label"><Hash size={15} /> CÓDIGO DE USUARIO <span className="opt-tag">(Opcional, Alfanumérico)</span></label>
                  <input
                    type="text"
                    placeholder="Ej. OP-101, EXP88, C001"
                    value={userCodUsuario}
                    onChange={(e) => setUserCodUsuario(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div className="input-group" style={{ marginTop: '0.75rem' }}>
                  <label className="input-label"><Lock size={15} /> CONTRASEÑA DE ACCESO</label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>

                <div className="input-group" style={{ marginTop: '0.75rem' }}>
                  <label className="input-label"><ShieldCheck size={15} /> ROL A ASIGNAR</label>
                  <select
                    value={userRol}
                    onChange={(e) => setUserRol(e.target.value as UserRole)}
                    className="input-field"
                  >
                    <option value="operador">Operador (Ver solo sus propios leads)</option>
                    <option value="admin">Admin (Ver todos los leads de su Empresa)</option>
                    {currentUser.rol === 'superadmin' && (
                      <option value="superadmin">Superadmin (Acceso Global)</option>
                    )}
                  </select>
                </div>

                {currentUser.rol === 'superadmin' ? (
                  <div className="input-group" style={{ marginTop: '0.75rem' }}>
                    <label className="input-label"><Building2 size={15} /> EMPRESA ASOCIADA</label>
                    <select
                      value={userEmpresaId}
                      onChange={(e) => setUserEmpresaId(e.target.value)}
                      className="input-field"
                      required
                    >
                      {empresas.map((e) => (
                        <option key={e.id} value={e.id}>{e.nombre}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="input-group" style={{ marginTop: '0.75rem' }}>
                    <label className="input-label"><Building2 size={15} /> EMPRESA ASOCIADA</label>
                    <input
                      type="text"
                      className="input-field"
                      value={selectedCatalogEmpresaObj?.nombre || 'Tu Empresa'}
                      disabled
                      style={{ background: 'var(--bg-surface-hover)', cursor: 'not-allowed' }}
                    />
                  </div>
                )}

                <button type="submit" className="btn-primary" style={{ marginTop: '1.25rem', width: '100%' }}>
                  <UserPlus size={16} /> Crear Usuario
                </button>
                {userSuccess && (
                  <div className="success-msg" style={{ marginTop: '0.75rem' }}>
                    <CheckCircle2 size={16} /> ¡Usuario creado exitosamente!
                  </div>
                )}
              </form>
            </div>

            {/* PRESENTACIÓN REDISEÑADA Y ELEGANTE DE USUARIOS */}
            <div className="list-box">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
                <Users size={18} style={{ color: 'var(--primary-accent)' }} /> 
                {currentUser.rol === 'superadmin' ? 'Usuarios de Todas las Empresas' : 'Usuarios de Tu Empresa'}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {visiblePerfiles.map((p) => {
                  const emp = empresas.find(e => e.id === p.empresa_id);
                  const isCurrentLoggedUser = p.id === currentUser.id;

                  return (
                    <div 
                      key={p.id} 
                      style={{
                        background: 'var(--bg-surface-hover)',
                        border: '1px solid var(--border-color)',
                        borderRadius: '12px',
                        padding: '0.85rem 1.1rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '1rem',
                        flexWrap: 'wrap'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                        <div style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '50%',
                          background: p.rol === 'superadmin' ? 'linear-gradient(135deg, #8b5cf6, #ec4899)' : p.rol === 'admin' ? 'var(--primary-accent)' : 'linear-gradient(135deg, #10b981, #059669)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 'bold',
                          fontSize: '1rem',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
                        }}>
                          {p.nombre.charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <div style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            {p.nombre} {isCurrentLoggedUser && <span style={{ fontSize: '0.72rem', background: 'var(--primary-glow)', color: 'var(--primary-accent)', padding: '0.1rem 0.4rem', borderRadius: '10px' }}>(Tú)</span>}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.1rem', display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span>{p.email}</span>
                            <span>•</span>
                            <strong style={{ color: 'var(--text-muted)' }}>{emp ? emp.nombre : 'Global (Superadmin)'}</strong>
                            {p.cod_usuario && (
                              <>
                                <span>•</span>
                                <span style={{ fontSize: '0.75rem', background: 'var(--bg-surface)', padding: '0.1rem 0.4rem', borderRadius: '6px', border: '1px solid var(--border-color)', fontFamily: 'monospace', color: 'var(--primary-accent)', fontWeight: 600 }}>
                                  Código: {p.cod_usuario}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        {/* BADGE DE ROL */}
                        <span className={`role-badge ${p.rol}`} style={{ fontSize: '0.75rem', fontWeight: 800, padding: '0.35rem 0.75rem', borderRadius: '20px' }}>
                          {p.rol === 'superadmin' ? <><Shield size={12} /> SUPERADMIN</> : p.rol === 'admin' ? <><Building2 size={12} /> ADMIN</> : <><User size={12} /> OPERADOR</>}
                        </span>

                        {/* BOTÓN DE EDICIÓN COMPLETA DE USUARIO */}
                        <button
                          type="button"
                          onClick={() => openEditUserModal(p)}
                          className="btn-secondary btn-sm"
                          style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                          title="Editar nombre, correo o rol"
                        >
                          <Edit2 size={14} /> Editar
                        </button>

                        {/* BOTÓN CAMBIO DE CONTRASEÑA */}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingUserPasswordOnly(p);
                            setQuickNewPassword('');
                            setQuickPasswordErrorMsg('');
                            setQuickPasswordSuccessMsg('');
                          }}
                          className="btn-icon"
                          title="Cambiar contraseña de acceso"
                          style={{ width: '32px', height: '32px' }}
                        >
                          <Key size={14} />
                        </button>

                        {/* BOTÓN ELIMINAR USUARIO (SUPERADMIN Y ADMIN) */}
                        {!isCurrentLoggedUser && (currentUser.rol === 'superadmin' || currentUser.rol === 'admin') && (
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(p)}
                            className="btn-danger-sm"
                            title="Eliminar usuario"
                          >
                            <Trash2 size={14} /> Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* MODAL CREAR NUEVA EMPRESA (SOLO SUPERADMIN) */}
        {isCreateEmpresaModalOpen && currentUser.rol === 'superadmin' && (
          <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div className="modal-content" style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: '480px',
              width: '92%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontFamily: 'Outfit', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Building2 size={18} style={{ color: 'var(--primary-accent)' }} /> Registrar Nueva Empresa
                </h3>
                <button
                  onClick={() => setIsCreateEmpresaModalOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleCrearEmpresa}>
                {empresaSuccess && (
                  <div className="success-msg" style={{ marginBottom: '1rem', background: 'rgba(16, 185, 129, 0.15)', padding: '0.75rem', borderRadius: '8px' }}>
                    <CheckCircle2 size={16} /> ¡Empresa creada exitosamente!
                  </div>
                )}

                <div className="input-group">
                  <label className="input-label"><Building2 size={15} /> NOMBRE DE LA EMPRESA</label>
                  <input
                    type="text"
                    placeholder="Ej. Automotriz RAFCAR MOTORS"
                    value={nuevaEmpresaNombre}
                    onChange={(e) => setNuevaEmpresaNombre(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>

                <div className="input-group" style={{ marginTop: '1rem' }}>
                  <label className="input-label"><ImageIcon size={15} /> LOGOTIPO DE LA EMPRESA</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem' }}>
                    <label className="btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                      <Upload size={14} /> Subir Imagen Logo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleLogoFileChange(e, false)}
                        style={{ display: 'none' }}
                      />
                    </label>
                    {empresaLogoPreview && (
                      <img
                        src={empresaLogoPreview}
                        alt="Previsualización Logo"
                        style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary-accent)' }}
                      />
                    )}
                  </div>
                </div>

                <div className="input-group" style={{ marginTop: '1rem' }}>
                  <label className="input-label"><Palette size={15} /> PALETA DE COLORES VISUAL</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginTop: '0.4rem' }}>
                    {COLOR_THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => setEmpresaColorPalette(theme.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.4rem',
                          padding: '0.4rem 0.6rem',
                          background: empresaColorPalette === theme.id ? 'var(--primary-glow)' : 'var(--bg-surface)',
                          border: empresaColorPalette === theme.id ? `2px solid ${theme.primary}` : '1px solid var(--border-color)',
                          borderRadius: '8px',
                          color: 'var(--text-main)',
                          fontSize: '0.78rem',
                          cursor: 'pointer',
                          fontWeight: empresaColorPalette === theme.id ? 'bold' : 'normal'
                        }}
                      >
                        <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: theme.primary }}></span>
                        {theme.name}
                      </button>
                    ))}
                  </div>

                  {/* COLOR HEXADECIMAL PERSONALIZADO */}
                  <div style={{ marginTop: '0.75rem', background: 'var(--bg-surface-hover)', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '0.5rem', display: 'block' }}>
                      O ELIGE UN COLOR PERSONALIZADO (HEXADECIMAL)
                    </label>

                    <div className="hex-picker-container">
                      <div className="hex-color-preview-wrapper">
                        <input 
                          type="color" 
                          value={empresaColorPalette.startsWith('#') ? empresaColorPalette : '#6366f1'} 
                          onChange={(e) => setEmpresaColorPalette(e.target.value)}
                          className="hex-color-picker-input"
                          title="Abre la paleta de colores interactiva"
                        />
                        <div 
                          className="hex-color-preview-circle" 
                          style={{ background: empresaColorPalette.startsWith('#') ? empresaColorPalette : 'var(--primary-accent)' }}
                        >
                          <Palette size={16} color="#ffffff" />
                        </div>
                      </div>

                      <div className="hex-input-wrapper">
                        <Hash size={16} className="hex-icon" />
                        <input 
                          type="text" 
                          placeholder="1A3E60"
                          value={empresaColorPalette.startsWith('#') ? empresaColorPalette.replace('#', '') : ''}
                          onChange={(e) => {
                            const val = e.target.value.trim();
                            setEmpresaColorPalette(val ? `#${val}` : 'indigo');
                          }}
                          maxLength={6}
                          className="hex-text-input"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setIsCreateEmpresaModalOpen(false)}
                    className="btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isSubmittingEmpresa}
                    style={{ flex: 1 }}
                  >
                    {isSubmittingEmpresa ? 'Creando...' : 'Crear Empresa'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL DE EDICIÓN DE EMPRESA */}
        {editingEmpresa && (
          <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div className="modal-content" style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: '480px',
              width: '92%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontFamily: 'Outfit', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Edit2 size={18} style={{ color: 'var(--primary-accent)' }} /> Editar Empresa y Tema
                </h3>
                <button
                  onClick={() => setEditingEmpresa(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleUpdateEmpresa}>
                {editEmpresaSuccess && (
                  <div className="success-msg" style={{ marginBottom: '1rem', background: 'rgba(16, 185, 129, 0.15)', padding: '0.75rem', borderRadius: '8px' }}>
                    <CheckCircle2 size={16} /> ¡Empresa actualizada!
                  </div>
                )}

                <div className="input-group">
                  <label className="input-label"><Building2 size={15} /> NOMBRE DE LA EMPRESA</label>
                  <input
                    type="text"
                    value={editEmpresaNombre}
                    onChange={(e) => setEditEmpresaNombre(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>

                <div className="input-group" style={{ marginTop: '1rem' }}>
                  <label className="input-label"><ImageIcon size={15} /> LOGOTIPO DE LA EMPRESA</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem' }}>
                    <label className="btn-secondary btn-sm" style={{ cursor: 'pointer', margin: 0 }}>
                      <Upload size={14} /> Cambiar Imagen Logo
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleLogoFileChange(e, true)}
                        style={{ display: 'none' }}
                      />
                    </label>
                    {editEmpresaLogoPreview && (
                      <img
                        src={editEmpresaLogoPreview}
                        alt="Previsualización"
                        style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary-accent)' }}
                      />
                    )}
                  </div>
                </div>

                <div className="input-group" style={{ marginTop: '1rem' }}>
                  <label className="input-label"><Palette size={15} /> PALETA DE COLORES VISUAL</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginTop: '0.4rem' }}>
                    {COLOR_THEMES.map((theme) => (
                      <button
                        key={theme.id}
                        type="button"
                        onClick={() => {
                          setEditEmpresaPalette(theme.id);
                          applyCompanyTheme(theme.id);
                        }}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem',
                          padding: '0.45rem 0.75rem',
                          background: editEmpresaPalette === theme.id ? 'var(--primary-glow)' : 'var(--bg-surface-hover)',
                          border: editEmpresaPalette === theme.id ? `2px solid ${theme.primary}` : '1px solid var(--border-color)',
                          borderRadius: '8px',
                          color: 'var(--text-main)',
                          fontSize: '0.82rem',
                          cursor: 'pointer',
                          fontWeight: editEmpresaPalette === theme.id ? 'bold' : 'normal'
                        }}
                      >
                        <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: theme.primary }}></span>
                        {theme.name}
                      </button>
                    ))}
                  </div>

                  {/* COLOR HEXADECIMAL PERSONALIZADO */}
                  <div style={{ marginTop: '0.75rem', background: 'var(--bg-surface-hover)', padding: '0.75rem', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                    <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '0.5rem', display: 'block' }}>
                      O ELIGE UN COLOR PERSONALIZADO (HEXADECIMAL)
                    </label>

                    <div className="hex-picker-container">
                      <div className="hex-color-preview-wrapper">
                        <input 
                          type="color" 
                          value={editEmpresaPalette.startsWith('#') ? editEmpresaPalette : '#6366f1'} 
                          onChange={(e) => {
                            const hex = e.target.value;
                            setEditEmpresaPalette(hex);
                            applyCompanyTheme(hex);
                          }}
                          className="hex-color-picker-input"
                          title="Abre la paleta de colores interactiva"
                        />
                        <div 
                          className="hex-color-preview-circle" 
                          style={{ background: editEmpresaPalette.startsWith('#') ? editEmpresaPalette : 'var(--primary-accent)' }}
                        >
                          <Palette size={16} color="#ffffff" />
                        </div>
                      </div>

                      <div className="hex-input-wrapper">
                        <Hash size={16} className="hex-icon" />
                        <input 
                          type="text" 
                          placeholder="1A3E60"
                          value={editEmpresaPalette.startsWith('#') ? editEmpresaPalette.replace('#', '') : ''}
                          onChange={(e) => {
                            const val = e.target.value.trim();
                            const hex = val ? `#${val}` : 'indigo';
                            setEditEmpresaPalette(hex);
                            if (/^#[0-9A-Fa-f]{6}$/.test(hex)) {
                              applyCompanyTheme(hex);
                            }
                          }}
                          maxLength={6}
                          className="hex-text-input"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setEditingEmpresa(null)}
                    className="btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isUpdatingEmpresa}
                    style={{ flex: 1 }}
                  >
                    {isUpdatingEmpresa ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL DE EDICIÓN COMPLETA DE USUARIO Y ROL */}
        {editingUser && (
          <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div className="modal-content" style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: '460px',
              width: '92%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontFamily: 'Outfit', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Edit2 size={18} style={{ color: 'var(--primary-accent)' }} /> Editar Perfil de Usuario
                </h3>
                <button
                  onClick={() => setEditingUser(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaveEditUser}>
                {editUserErrorMsg && (
                  <div className="error-banner" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={16} /> {editUserErrorMsg}
                  </div>
                )}

                {editUserSuccessMsg && (
                  <div className="success-msg" style={{ marginBottom: '1rem', background: 'rgba(16, 185, 129, 0.15)', padding: '0.75rem', borderRadius: '8px' }}>
                    <CheckCircle2 size={16} /> {editUserSuccessMsg}
                  </div>
                )}

                <div className="input-group">
                  <label className="input-label"><User size={15} /> NOMBRE COMPLETO</label>
                  <input
                    type="text"
                    value={editUserNombre}
                    onChange={(e) => setEditUserNombre(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>

                <div className="input-group" style={{ marginTop: '0.85rem' }}>
                  <label className="input-label"><Mail size={15} /> USUARIO / CORREO</label>
                  <input
                    type="text"
                    value={editUserEmail}
                    onChange={(e) => setEditUserEmail(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>

                <div className="input-group" style={{ marginTop: '0.85rem' }}>
                  <label className="input-label"><Hash size={15} /> CÓDIGO DE USUARIO <span className="opt-tag">(Opcional, Alfanumérico)</span></label>
                  <input
                    type="text"
                    placeholder="Ej. OP-101, EXP88, C001"
                    value={editUserCodUsuario}
                    onChange={(e) => setEditUserCodUsuario(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div className="input-group" style={{ marginTop: '0.85rem' }}>
                  <label className="input-label"><ShieldCheck size={15} /> ROL ASIGNADO</label>
                  <select
                    value={editUserRol}
                    onChange={(e) => setEditUserRol(e.target.value as UserRole)}
                    className="input-field"
                  >
                    <option value="operador">Operador (Ver solo sus propios leads)</option>
                    <option value="admin">Admin (Ver todos los leads de su Empresa)</option>
                    {currentUser.rol === 'superadmin' && (
                      <option value="superadmin">Superadmin (Acceso Global)</option>
                    )}
                  </select>
                </div>

                <div className="input-group" style={{ marginTop: '0.85rem' }}>
                  <label className="input-label"><Lock size={15} /> NUEVA CONTRASEÑA <span className="opt-tag">(Opcional)</span></label>
                  <input
                    type="password"
                    placeholder="Dejar en blanco para mantener contraseña actual"
                    value={editUserPassword}
                    onChange={(e) => setEditUserPassword(e.target.value)}
                    className="input-field"
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={isUpdatingUser}
                    style={{ flex: 1 }}
                  >
                    {isUpdatingUser ? 'Guardando...' : 'Guardar Cambios'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL DE CAMBIO RÁPIDO DE CONTRASEÑA */}
        {editingUserPasswordOnly && (
          <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div className="modal-content" style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: '420px',
              width: '90%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
              animation: 'fadeIn 0.2s ease-out'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontFamily: 'Outfit', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Key size={18} style={{ color: 'var(--primary-accent)' }} /> Cambiar Contraseña
                </h3>
                <button
                  onClick={() => setEditingUserPasswordOnly(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <p style={{ fontSize: '0.88rem', color: 'var(--text-dim)', marginBottom: '1.25rem' }}>
                Asignar nueva contraseña al usuario: <strong>{editingUserPasswordOnly.nombre}</strong>.
              </p>

              <form onSubmit={handleUpdateUserPasswordOnly}>
                {quickPasswordErrorMsg && (
                  <div className="error-banner" style={{ marginBottom: '1rem' }}>
                    <AlertCircle size={16} /> {quickPasswordErrorMsg}
                  </div>
                )}

                {quickPasswordSuccessMsg && (
                  <div className="success-msg" style={{ marginBottom: '1rem', background: 'rgba(16, 185, 129, 0.15)', padding: '0.75rem', borderRadius: '8px' }}>
                    <CheckCircle2 size={16} /> {quickPasswordSuccessMsg}
                  </div>
                )}

                <div className="input-group">
                  <label className="input-label"><Lock size={15} /> NUEVA CONTRASEÑA</label>
                  <input
                    type="password"
                    placeholder="Ingresa la nueva contraseña"
                    value={quickNewPassword}
                    onChange={(e) => setQuickNewPassword(e.target.value)}
                    className="input-field"
                    required
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem' }}>
                  <button
                    type="button"
                    onClick={() => setEditingUserPasswordOnly(null)}
                    className="btn-secondary"
                    style={{ flex: 1 }}
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ flex: 1 }}
                  >
                    Actualizar Clave
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* MODAL DE DETALLE DE LOG Y CARGA JSON COMPLETA */}
        {selectedDetailLog && (
          <div className="modal-overlay" style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}>
            <div className="modal-content" style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-color)',
              borderRadius: '16px',
              padding: '1.75rem',
              maxWidth: '650px',
              width: '92%',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <FileText size={18} style={{ color: 'var(--primary-accent)' }} /> Registro de Envío POST
                </h3>
                <button
                  type="button"
                  onClick={() => setSelectedDetailLog(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', background: 'var(--bg-surface-hover)', padding: '0.85rem', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.82rem' }}>
                  <div>
                    <strong>Prospecto:</strong> {selectedDetailLog.prospecto_nombre} ({selectedDetailLog.prospecto_contacto})
                  </div>
                  <div>
                    <strong>Fecha:</strong> {new Date(selectedDetailLog.created_at).toLocaleString()}
                  </div>
                  <div>
                    <strong>Estado HTTP:</strong> {selectedDetailLog.success ? `✅ 200 OK` : `❌ Error ${selectedDetailLog.status_code || ''}`}
                  </div>
                  <div>
                    <strong>Endpoint:</strong> <span style={{ fontFamily: 'monospace' }}>{selectedDetailLog.endpoint_url}</span>
                  </div>
                </div>

                {selectedDetailLog.error && (
                  <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '0.75rem', borderRadius: '8px', color: '#ef4444', fontSize: '0.8rem' }}>
                    <strong>Detalle de Error:</strong> {selectedDetailLog.error}
                  </div>
                )}

                <div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                    📦 Carga JSON Transmitida (Body):
                  </div>
                  <pre style={{ background: 'var(--bg-surface-hover)', padding: '0.85rem', borderRadius: '8px', fontSize: '0.8rem', fontFamily: 'monospace', overflowX: 'auto', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                    {selectedDetailLog.compiled_body}
                  </pre>
                </div>

                {selectedDetailLog.response_body && (
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.35rem' }}>
                      📩 Respuesta del Servidor:
                    </div>
                    <pre style={{ background: 'var(--bg-surface-hover)', padding: '0.85rem', borderRadius: '8px', fontSize: '0.8rem', fontFamily: 'monospace', overflowX: 'auto', border: '1px solid var(--border-color)', color: 'var(--text-main)' }}>
                      {selectedDetailLog.response_body}
                    </pre>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button
                    type="button"
                    onClick={() => {
                      const logToRetry = selectedDetailLog;
                      setSelectedDetailLog(null);
                      handleRetryWebhookLog(logToRetry);
                    }}
                    className="btn-primary"
                    style={{ fontSize: '0.85rem' }}
                  >
                    <RefreshCw size={14} /> Reintentar Envío Ahora
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
