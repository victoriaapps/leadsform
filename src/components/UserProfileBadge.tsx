import React, { useState, useRef, useEffect } from 'react';
import { User, LogOut, Settings, Globe, Shield, Building2 } from 'lucide-react';
import type { UsuarioPerfil, Empresa } from '../types/prospecto';
import { getDemoEmpresas } from '../lib/supabase';

interface UserProfileBadgeProps {
  currentUser: UsuarioPerfil;
  empresas?: Empresa[];
  onOpenCustomizer?: () => void;
  onLogout?: () => void;
}

export const UserProfileBadge: React.FC<UserProfileBadgeProps> = ({ 
  currentUser, 
  empresas, 
  onOpenCustomizer,
  onLogout 
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const allEmpresas: Empresa[] = (empresas && empresas.length > 0) ? empresas : getDemoEmpresas();
  const currentEmpresa = allEmpresas.find(e => e.id === currentUser.empresa_id);

  // Cerrar al hacer clic afuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="user-popover-wrapper" ref={dropdownRef}>
      {/* BOTÓN AVATAR CIRCULAR EN LA ESQUINA SUPERIOR DERECHA */}
      <button 
        type="button" 
        className="user-avatar-btn" 
        onClick={() => setIsOpen(!isOpen)}
        title={`${currentUser.nombre} (${currentUser.rol.toUpperCase()})`}
      >
        {currentEmpresa && currentEmpresa.logo_url ? (
          <img src={currentEmpresa.logo_url} alt={currentEmpresa.nombre} />
        ) : (
          currentUser.nombre.charAt(0).toUpperCase()
        )}
      </button>

      {/* MENU DESPLEGABLE POPOVER (ESTILO EXACTO IMAGEN 2 DE LA REFERENCIA) */}
      {isOpen && (
        <div className="user-popover-dropdown">
          {/* FICHA DEL USUARIO AUTENTICADO */}
          <div className="popover-user-card">
            <div className="popover-avatar">
              {currentUser.nombre.charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="popover-user-name">{currentUser.nombre}</div>
              <div className="popover-user-email">{currentUser.email}</div>
              <div className="popover-user-role">
                {currentUser.rol === 'superadmin' ? (
                  <span><Shield size={11} /> SUPERADMIN</span>
                ) : currentUser.rol === 'admin' ? (
                  <span><Building2 size={11} /> ADMIN</span>
                ) : (
                  <span><User size={11} /> OPERADOR</span>
                )}
              </div>
            </div>
          </div>

          {/* OPCIONES DEL MENÚ DE CONFIGURACIÓN */}
          <div className="popover-menu-list">
            <button 
              className="popover-menu-item"
              onClick={() => {
                setIsOpen(false);
                if (onOpenCustomizer) onOpenCustomizer();
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Settings size={16} /> Apariencia y Colores
              </span>
            </button>

            <div className="popover-menu-item" style={{ cursor: 'default' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Globe size={16} /> Idioma UI
              </span>
              <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: 'var(--primary-accent)' }}>
                Español
              </span>
            </div>

            {onLogout && (
              <button 
                className="popover-menu-item logout" 
                onClick={() => {
                  setIsOpen(false);
                  onLogout();
                }}
              >
                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <LogOut size={16} /> Cerrar sesión
                </span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
