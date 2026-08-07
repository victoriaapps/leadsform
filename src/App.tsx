import { useState, useEffect } from 'react';
import { 
  BarChart3, 
  UserPlus, 
  ListFilter, 
  Building2, 
  Moon, 
  Sun, 
  Settings, 
  Maximize2,
  Sliders,
  Users
} from 'lucide-react';
import type { UsuarioPerfil, Empresa } from './types/prospecto';
import { getDemoCurrentUser, clearDemoCurrentUser, getDemoEmpresas, isSupabaseConfigured, supabase } from './lib/supabase';
import { applyCompanyTheme, getThemeMode, setThemeMode } from './lib/themeEngine';
import { ProspectForm } from './components/ProspectForm';
import { ProspectList } from './components/ProspectList';
import { CompanyDashboard } from './components/CompanyDashboard';
import { AdminPanel } from './components/AdminPanel';
import { ThemeCustomizerDrawer } from './components/ThemeCustomizerDrawer';
import { AuthScreen } from './components/AuthScreen';
import { UserProfileBadge } from './components/UserProfileBadge';

export function App() {
  // Inicialización de tema claro/oscuro
  useEffect(() => {
    applyCompanyTheme();
  }, []);

  const [currentUser, setCurrentUser] = useState<UsuarioPerfil | null>(getDemoCurrentUser());
  const [activeTab, setActiveTab] = useState<'dashboard' | 'form' | 'list' | 'catalogos' | 'usuarios' | 'admin'>('dashboard');
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [themeMode, setThemeModeState] = useState<'light' | 'dark'>(getThemeMode());
  const [isCustomizerOpen, setIsCustomizerOpen] = useState(false);

  // Cargar lista de empresas desde Supabase o Demo
  const loadEmpresasData = async () => {
    let currentEmpresas: Empresa[] = [];
    if (isSupabaseConfigured && supabase) {
      try {
        const { data: dbEmp } = await supabase.from('empresas').select('*');
        if (dbEmp && dbEmp.length > 0) {
          currentEmpresas = dbEmp;
        } else {
          currentEmpresas = getDemoEmpresas();
        }
      } catch (e) {
        currentEmpresas = getDemoEmpresas();
      }
    } else {
      currentEmpresas = getDemoEmpresas();
    }
    setEmpresas(currentEmpresas);
  };

  useEffect(() => {
    loadEmpresasData();
  }, []);

  const currentEmpresa = currentUser ? empresas.find(e => e.id === currentUser.empresa_id) : null;

  const refreshEmpresas = async () => {
    await loadEmpresasData();
  };

  // Aplicar paleta de colores de la empresa activa del usuario
  useEffect(() => {
    if (currentEmpresa && currentEmpresa.color_palette) {
      applyCompanyTheme(currentEmpresa.color_palette);
    } else {
      applyCompanyTheme('indigo');
    }
  }, [currentUser, currentEmpresa]);

  useEffect(() => {
    if (currentUser && currentUser.rol === 'operador' && (activeTab === 'admin' || activeTab === 'dashboard' || activeTab === 'catalogos' || activeTab === 'usuarios')) {
      setActiveTab('form');
    }
  }, [currentUser, activeTab]);

  const toggleThemeMode = () => {
    const nextMode = themeMode === 'light' ? 'dark' : 'light';
    setThemeModeState(nextMode);
    setThemeMode(nextMode);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) document.exitFullscreen().catch(() => {});
    }
  };

  const handleLogout = () => {
    clearDemoCurrentUser();
    setCurrentUser(null);
  };

  if (!currentUser) {
    return <AuthScreen onLoginSuccess={(u) => setCurrentUser(u)} />;
  }

  const canViewAdminModules = currentUser.rol === 'admin' || currentUser.rol === 'superadmin';

  const getTabTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Dashboard';
      case 'form': return 'Nuevo Prospecto';
      case 'list': return 'Gestión de Leads';
      case 'catalogos': return 'Catálogos';
      case 'usuarios': return 'Usuarios y Roles';
      case 'admin': return 'Configuración de Empresa';
    }
  };

  return (
    <div className="app-layout">
      {/* SIDEBAR LATERAL IZQUIERDO (DESKTOP) */}
      <aside className="sidebar">
        <div>
          {/* HEADER DEL SIDEBAR CON LOGO DE LA EMPRESA */}
          <div className="sidebar-header">
            {currentEmpresa && currentEmpresa.logo_url ? (
              <img src={currentEmpresa.logo_url} alt={currentEmpresa.nombre} className="sidebar-logo" />
            ) : (
              <div className="sidebar-logo" style={{ background: 'var(--primary-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                <Building2 size={20} />
              </div>
            )}
            <div className="sidebar-brand-info">
              <span className="sidebar-brand-name">
                {currentEmpresa ? currentEmpresa.nombre : 'Victoria'}
              </span>
              <span className="sidebar-brand-sub">App Prospectador</span>
            </div>
          </div>

          {/* MENÚ PRINCIPAL */}
          <div className="sidebar-nav-section">
            <div className="nav-section-title">MENÚ PRINCIPAL</div>
            <ul className="sidebar-nav-list">
              {canViewAdminModules && (
                <li>
                  <button
                    type="button"
                    className={`sidebar-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                    onClick={() => setActiveTab('dashboard')}
                  >
                    <BarChart3 size={18} /> Dashboard
                  </button>
                </li>
              )}
              <li>
                <button
                  type="button"
                  className={`sidebar-nav-item ${activeTab === 'form' ? 'active' : ''}`}
                  onClick={() => setActiveTab('form')}
                >
                  <UserPlus size={18} /> Registrar Prospecto
                </button>
              </li>
              <li>
                <button
                  type="button"
                  className={`sidebar-nav-item ${activeTab === 'list' ? 'active' : ''}`}
                  onClick={() => setActiveTab('list')}
                >
                  <ListFilter size={18} /> Leads
                </button>
              </li>
            </ul>
          </div>

          {/* MÓDULOS SEPARADOS DE ADMINISTRACIÓN (ADMIN & SUPERADMIN) */}
          {canViewAdminModules && (
            <div className="sidebar-nav-section">
              <div className="nav-section-title">ADMINISTRACIÓN</div>
              <ul className="sidebar-nav-list">
                <li>
                  <button
                    type="button"
                    className={`sidebar-nav-item ${activeTab === 'catalogos' ? 'active' : ''}`}
                    onClick={() => setActiveTab('catalogos')}
                  >
                    <Sliders size={18} /> Catálogos
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className={`sidebar-nav-item ${activeTab === 'usuarios' ? 'active' : ''}`}
                    onClick={() => setActiveTab('usuarios')}
                  >
                    <Users size={18} /> Usuarios y Roles
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    className={`sidebar-nav-item ${activeTab === 'admin' ? 'active' : ''}`}
                    onClick={() => setActiveTab('admin')}
                  >
                    <Building2 size={18} /> Mi Empresa
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </aside>

      {/* ÁREA PRINCIPAL MÓVIL / RESPONSIVE */}
      <div className="main-wrapper">
        {/* BARRA DE NAVEGACIÓN SUPERIOR (TOP NAVBAR MÓVIL Y DESKTOP) */}
        <header className="top-navbar">
          <div className="top-navbar-left">
            {currentEmpresa && currentEmpresa.logo_url && (
              <img src={currentEmpresa.logo_url} alt={currentEmpresa.nombre} className="mobile-header-logo" />
            )}
            <h1 className="page-title">{getTabTitle()}</h1>
          </div>

          <div className="top-navbar-right">
            {/* BOTÓN PANTALLA COMPLETA */}
            <button type="button" className="icon-btn mobile-hide" onClick={toggleFullscreen} title="Pantalla Completa">
              <Maximize2 size={16} />
            </button>

            {/* BOTÓN MODO CLARO / OSCURO */}
            <button type="button" className="icon-btn" onClick={toggleThemeMode} title={themeMode === 'light' ? 'Cambiar a Modo Oscuro' : 'Cambiar a Modo Claro'}>
              {themeMode === 'light' ? <Moon size={16} /> : <Sun size={16} />}
            </button>

            {/* BOTÓN CUSTOMIZER DRAWER */}
            <button type="button" className="icon-btn" onClick={() => setIsCustomizerOpen(true)} title="Personalizar Apariencia">
              <Settings size={16} />
            </button>

            {/* PERFIL DE USUARIO POPOVER DROPDOWN */}
            <UserProfileBadge 
              currentUser={currentUser} 
              empresas={empresas}
              onOpenCustomizer={() => setIsCustomizerOpen(true)}
              onLogout={handleLogout}
            />
          </div>
        </header>

        {/* CONTENIDO PRINCIPAL BODY */}
        <main className="content-body">
          {activeTab === 'dashboard' && canViewAdminModules && (
            <CompanyDashboard currentUser={currentUser} />
          )}
          {activeTab === 'form' && (
            <ProspectForm currentUser={currentUser} onSuccess={() => {}} />
          )}
          {activeTab === 'list' && (
            <ProspectList currentUser={currentUser} />
          )}
          {activeTab === 'catalogos' && canViewAdminModules && (
            <AdminPanel 
              currentUser={currentUser} 
              activeSubTab="catalogos"
              onSubTabChange={(t) => setActiveTab(t === 'empresas' ? 'admin' : t as any)}
              onEmpresaUpdated={refreshEmpresas} 
            />
          )}
          {activeTab === 'usuarios' && canViewAdminModules && (
            <AdminPanel 
              currentUser={currentUser} 
              activeSubTab="usuarios"
              onSubTabChange={(t) => setActiveTab(t === 'empresas' ? 'admin' : t as any)}
              onEmpresaUpdated={refreshEmpresas} 
            />
          )}
          {activeTab === 'admin' && canViewAdminModules && (
            <AdminPanel 
              currentUser={currentUser} 
              activeSubTab="empresas"
              onSubTabChange={(t) => setActiveTab(t === 'empresas' ? 'admin' : t as any)}
              onEmpresaUpdated={refreshEmpresas} 
            />
          )}
        </main>

        {/* BARRA DE NAVEGACIÓN INFERIOR ESTILO APP MÓVIL (BOTTOM TAB BAR) */}
        <nav className="mobile-bottom-nav">
          {canViewAdminModules && (
            <button
              type="button"
              className={`bottom-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              <BarChart3 size={20} />
              <span>Inicio</span>
            </button>
          )}

          <button
            type="button"
            className={`bottom-nav-item ${activeTab === 'form' ? 'active' : ''}`}
            onClick={() => setActiveTab('form')}
          >
            <UserPlus size={20} />
            <span>Registrar</span>
          </button>

          <button
            type="button"
            className={`bottom-nav-item ${activeTab === 'list' ? 'active' : ''}`}
            onClick={() => setActiveTab('list')}
          >
            <ListFilter size={20} />
            <span>Leads</span>
          </button>

          {canViewAdminModules && (
            <button
              type="button"
              className={`bottom-nav-item ${activeTab === 'catalogos' ? 'active' : ''}`}
              onClick={() => setActiveTab('catalogos')}
            >
              <Sliders size={20} />
              <span>Catálogos</span>
            </button>
          )}

          {canViewAdminModules && (
            <button
              type="button"
              className={`bottom-nav-item ${activeTab === 'usuarios' ? 'active' : ''}`}
              onClick={() => setActiveTab('usuarios')}
            >
              <Users size={20} />
              <span>Usuarios</span>
            </button>
          )}

          {canViewAdminModules && (
            <button
              type="button"
              className={`bottom-nav-item ${activeTab === 'admin' ? 'active' : ''}`}
              onClick={() => setActiveTab('admin')}
            >
              <Building2 size={20} />
              <span>Empresa</span>
            </button>
          )}
        </nav>
      </div>

      {/* THEME CUSTOMIZER DRAWER LATERAL */}
      <ThemeCustomizerDrawer
        isOpen={isCustomizerOpen}
        onClose={() => setIsCustomizerOpen(false)}
        currentPaletteId={currentEmpresa?.color_palette || 'indigo'}
        onPaletteChange={(paletteId) => {
          if (currentEmpresa) {
            currentEmpresa.color_palette = paletteId;
          }
          applyCompanyTheme(paletteId);
        }}
      />
    </div>
  );
}

export default App;
