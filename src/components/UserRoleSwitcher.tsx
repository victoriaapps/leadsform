import React, { useState, useEffect } from 'react';
import { Shield, Building2, User, ChevronDown, Check, Sparkles } from 'lucide-react';
import type { UsuarioPerfil, Empresa } from '../types/prospecto';
import { getDemoPerfiles, setDemoCurrentUser, getDemoEmpresas, isSupabaseConfigured, supabase } from '../lib/supabase';

interface UserRoleSwitcherProps {
  currentUser: UsuarioPerfil;
  onUserChange: (user: UsuarioPerfil) => void;
}

export const UserRoleSwitcher: React.FC<UserRoleSwitcherProps> = ({ currentUser, onUserChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [perfiles, setPerfiles] = useState<UsuarioPerfil[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);

  useEffect(() => {
    const loadSwitcherData = async () => {
      if (isSupabaseConfigured && supabase) {
        const { data: dbPerf } = await supabase.from('perfiles').select('*').order('created_at', { ascending: false });
        const { data: dbEmp } = await supabase.from('empresas').select('*');

        const finalPerfiles = (dbPerf && dbPerf.length > 0) ? dbPerf : getDemoPerfiles();
        const finalEmpresas = (dbEmp && dbEmp.length > 0) ? dbEmp : getDemoEmpresas();

        setPerfiles(finalPerfiles);
        setEmpresas(finalEmpresas);
      } else {
        setPerfiles(getDemoPerfiles());
        setEmpresas(getDemoEmpresas());
      }
    };

    loadSwitcherData();
  }, [isOpen]);

  const handleSelectUser = (perfil: UsuarioPerfil) => {
    setDemoCurrentUser(perfil);
    onUserChange(perfil);
    setIsOpen(false);
  };

  const getRoleBadge = (rol: string) => {
    switch (rol) {
      case 'superadmin':
        return <span className="role-badge superadmin"><Shield size={12} /> SUPERADMIN</span>;
      case 'admin':
        return <span className="role-badge admin"><Building2 size={12} /> ADMIN EMPRESA</span>;
      default:
        return <span className="role-badge operador"><User size={12} /> OPERADOR</span>;
    }
  };

  const getEmpresaName = (empresaId?: string | null) => {
    if (!empresaId) return 'Todas (Global)';
    const emp = empresas.find(e => e.id === empresaId);
    return emp ? emp.nombre : 'Empresa';
  };

  return (
    <div className="user-switcher-container">
      <div className="user-profile-card" onClick={() => setIsOpen(!isOpen)}>
        <div className="avatar-circle">
          {currentUser.nombre.charAt(0).toUpperCase()}
        </div>
        <div className="user-info">
          <div className="user-top-row">
            <span className="user-name">{currentUser.nombre}</span>
            {getRoleBadge(currentUser.rol)}
          </div>
          <div className="user-bottom-row">
            <span className="empresa-name"><Building2 size={12} /> {getEmpresaName(currentUser.empresa_id)}</span>
          </div>
        </div>
        <ChevronDown size={18} className={`chevron-icon ${isOpen ? 'open' : ''}`} />
      </div>

      {isOpen && (
        <div className="switcher-dropdown">
          <div className="dropdown-header">
            <Sparkles size={14} className="icon-gradient" />
            <span>Simulador de Roles y Usuarios</span>
          </div>
          <div className="dropdown-list">
            {perfiles.map((p) => {
              const isSelected = p.id === currentUser.id;
              return (
                <div
                  key={p.id}
                  className={`dropdown-item ${isSelected ? 'selected' : ''}`}
                  onClick={() => handleSelectUser(p)}
                >
                  <div className="item-left">
                    <div className="item-avatar">
                      {p.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="item-name">{p.nombre}</div>
                      <div className="item-sub">
                        {p.email} • {getEmpresaName(p.empresa_id)}
                      </div>
                    </div>
                  </div>
                  <div className="item-right">
                    {getRoleBadge(p.rol)}
                    {isSelected && <Check size={16} className="check-icon" />}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="dropdown-footer">
            <span>Cambia de usuario para probar los permisos de Superadmin, Admin u Operador</span>
          </div>
        </div>
      )}
    </div>
  );
};
