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
  Trash2
} from 'lucide-react';
import type { Empresa, UsuarioPerfil, UserRole } from '../types/prospecto';
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
  uploadCompanyLogoFile,
  supabase,
  isSupabaseConfigured,
  generateUUID,
  isUuid
} from '../lib/supabase';
import { COLOR_THEMES, applyCompanyTheme } from '../lib/themeEngine';

interface AdminPanelProps {
  currentUser: UsuarioPerfil;
  onEmpresaUpdated?: () => void;
  activeSubTab?: 'empresas' | 'catalogos' | 'usuarios';
  onSubTabChange?: (tab: 'empresas' | 'catalogos' | 'usuarios') => void;
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
  const [userRol, setUserRol] = useState<UserRole>('operador');
  const [userEmpresaId, setUserEmpresaId] = useState(currentUser.empresa_id || '');
  const [userSuccess, setUserSuccess] = useState(false);
  const [userError, setUserError] = useState('');

  // Modal de Edición Completa de Usuario
  const [editingUser, setEditingUser] = useState<UsuarioPerfil | null>(null);
  const [editUserNombre, setEditUserNombre] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
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

  const loadData = async () => {
    let currentEmpresas: Empresa[] = [];
    let currentPerfiles: UsuarioPerfil[] = [];

    if (isSupabaseConfigured && supabase) {
      try {
        const { data: dbEmp, error: empErr } = await supabase
          .from('empresas')
          .select('*')
          .order('created_at', { ascending: false });

        if (!empErr && dbEmp && dbEmp.length > 0) {
          currentEmpresas = dbEmp;
        } else {
          currentEmpresas = getDemoEmpresas();
        }

        const { data: dbPerf, error: perfErr } = await supabase
          .from('perfiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (!perfErr && dbPerf && dbPerf.length > 0) {
          currentPerfiles = dbPerf;
        } else {
          currentPerfiles = getDemoPerfiles();
        }
      } catch (e) {
        currentEmpresas = getDemoEmpresas();
        currentPerfiles = getDemoPerfiles();
      }
    } else {
      currentEmpresas = getDemoEmpresas();
      currentPerfiles = getDemoPerfiles();
    }

    setEmpresas(currentEmpresas);
    setPerfiles(currentPerfiles);

    if (currentEmpresas.length > 0) {
      const initialEmpId = (currentUser.rol === 'admin' && currentUser.empresa_id) 
        ? currentUser.empresa_id 
        : currentEmpresas[0].id;
      
      setSelectedCatalogEmpresaId(initialEmpId);
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
      }
    }
  };

  useEffect(() => {
    loadData();
  }, []);

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

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('perfiles').insert([
        {
          id: newUserId,
          nombre: userNombre.trim(),
          email: userEmail.trim().toLowerCase(),
          password: userPassword.trim(),
          rol: assignedRol,
          empresa_id: targetEmpresaId,
        }
      ]);

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
      },
      newUserId
    );

    setUserNombre('');
    setUserEmail('');
    setUserPassword('');
    setUserSuccess(true);
    setTimeout(() => setUserSuccess(false), 3000);
    await loadData();
  };

  // Abrir Modal de Edición Completa de Usuario
  const openEditUserModal = (u: UsuarioPerfil) => {
    setEditingUser(u);
    setEditUserNombre(u.nombre);
    setEditUserEmail(u.email);
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

    const updates: Partial<UsuarioPerfil> = {
      nombre: editUserNombre.trim(),
      email: editUserEmail.trim().toLowerCase(),
      rol: editUserRol
    };

    if (editUserPassword.trim()) {
      updates.password = editUserPassword.trim();
    }

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase
          .from('perfiles')
          .update(updates)
          .eq('id', editingUser.id);

        if (error) throw error;
      }

      updateDemoPerfil(editingUser.id, updates);

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
  const modelsForSelectedMarca = selectedMarcaForModels ? (catalogModelosPorMarca[selectedMarcaForModels] || []) : [];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div className="card-victoria">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
          <div className="kpi-icon-badge purple">
            {activeSubTab === 'empresas' && <Building2 size={24} />}
            {activeSubTab === 'catalogos' && <Sliders size={24} />}
            {activeSubTab === 'usuarios' && <Users size={24} />}
          </div>
          <div>
            <h2 className="card-victoria-title" style={{ fontSize: '1.35rem' }}>
              {activeSubTab === 'empresas' && (currentUser.rol === 'superadmin' ? 'Empresas Registradas' : 'Mi Empresa')}
              {activeSubTab === 'catalogos' && 'Catálogos y Desplegables'}
              {activeSubTab === 'usuarios' && 'Usuarios y Roles'}
            </h2>
            <p className="card-victoria-sub">
              {activeSubTab === 'empresas' && 'Administración de la información y logotipos de empresa'}
              {activeSubTab === 'catalogos' && 'Configuración de ciudades, marcas y modelos vehiculares'}
              {activeSubTab === 'usuarios' && `Administración de cuentas de acceso (${visiblePerfiles.length} usuarios registrados)`}
            </p>
          </div>
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
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginTop: '0.1rem' }}>
                            {p.email} • <strong style={{ color: 'var(--text-muted)' }}>{emp ? emp.nombre : 'Global (Superadmin)'}</strong>
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
      </div>
    </div>
  );
};
