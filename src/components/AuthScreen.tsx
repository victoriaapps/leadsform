import React, { useState } from 'react';
import { 
  Lock, 
  UserCheck, 
  LogIn, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Sparkles, 
  ShieldCheck, 
  Building2 
} from 'lucide-react';
import type { UsuarioPerfil } from '../types/prospecto';
import { supabase, isSupabaseConfigured, getDemoPerfiles, setDemoCurrentUser } from '../lib/supabase';

interface AuthScreenProps {
  onLoginSuccess: (user: UsuarioPerfil) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    const cleanInput = identifier.trim().toLowerCase();

    try {
      // 1. Consulta dinámica a la Base de Datos de Supabase en la tabla 'perfiles'
      if (isSupabaseConfigured && supabase) {
        const { data: perfilesData, error: dbError } = await supabase
          .from('perfiles')
          .select('*')
          .or(`email.eq.${cleanInput},email.eq.${cleanInput}@prospectador.com`);

        if (dbError) {
          console.error('Error buscando perfil en Supabase:', dbError);
          setErrorMsg('Error de conexión a Supabase: ' + dbError.message);
          setLoading(false);
          return;
        }

        if (perfilesData && perfilesData.length > 0) {
          const userFound = perfilesData[0];

          // Verificar contraseña almacenada en la base de datos
          if (userFound.password && userFound.password === password) {
            setDemoCurrentUser(userFound);
            onLoginSuccess(userFound);
            setLoading(false);
            return;
          } else {
            setErrorMsg('Contraseña incorrecta. Verifica las credenciales guardadas.');
            setLoading(false);
            return;
          }
        } else {
          setErrorMsg('Usuario no encontrado en la base de datos.');
          setLoading(false);
          return;
        }
      }

      // 2. Fallback de verificación en almacenamiento de perfiles demo solo cuando NO hay Supabase
      const perfiles = getDemoPerfiles();
      const matched = perfiles.find(
        (p) => p.email.toLowerCase() === cleanInput || p.email.toLowerCase().startsWith(cleanInput)
      );

      if (matched && matched.password && matched.password === password) {
        setDemoCurrentUser(matched);
        onLoginSuccess(matched);
      } else {
        setErrorMsg('Usuario no encontrado o contraseña incorrecta.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error durante la autenticación.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-fullscreen-container">
      {/* Dynamic Ambient Background Glows */}
      <div className="auth-ambient-glow glow-1"></div>
      <div className="auth-ambient-glow glow-2"></div>
      <div className="auth-bg-grid"></div>

      <div className="auth-glass-card">
        {/* Header & Branding */}
        <div className="auth-card-header">
          <div className="auth-brand-badge">
            <Building2 size={26} className="auth-brand-icon" />
            <Sparkles size={14} className="auth-sparkle-icon" />
          </div>
          <h1 className="auth-title">Victoria Leads</h1>
          <p className="auth-subtitle">Sistema prospectador externo</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="auth-form">
          {errorMsg && (
            <div className="auth-error-banner">
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="auth-input-group">
            <label className="auth-input-label">
              <UserCheck size={15} /> USUARIO O CORREO
            </label>
            <div className="auth-input-wrapper">
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="Usuario o correo"
                className="auth-input-field"
                required
                autoComplete="username"
              />
            </div>
          </div>

          <div className="auth-input-group">
            <label className="auth-input-label">
              <Lock size={15} /> CONTRASEÑA
            </label>
            <div className="auth-input-wrapper">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña"
                className="auth-input-field"
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="auth-password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="auth-session-badge">
            <ShieldCheck size={15} />
            <span>Sesión guardada de forma segura en este dispositivo</span>
          </div>

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="auth-spinner"></div>
                <span>Verificando credenciales...</span>
              </>
            ) : (
              <>
                <span>Iniciar Sesión</span>
                <LogIn size={18} />
              </>
            )}
          </button>
        </form>

        {/* Card Footer */}
        <div className="auth-card-footer">
          <span>Victoria Leads &copy; 2026 • Plataforma de Prospectos</span>
        </div>
      </div>
    </div>
  );
};
