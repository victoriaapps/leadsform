import React, { useState } from 'react';
import { Shield, Lock, UserCheck, LogIn, AlertCircle } from 'lucide-react';
import type { UsuarioPerfil } from '../types/prospecto';
import { supabase, isSupabaseConfigured, getDemoPerfiles, setDemoCurrentUser } from '../lib/supabase';

interface AuthScreenProps {
  onLoginSuccess: (user: UsuarioPerfil) => void;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onLoginSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
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
            setErrorMsg('Contraseña incorrecta. Verifica la contraseña guardada en la base de datos.');
            setLoading(false);
            return;
          }
        }
      }

      // 2. Fallback de verificación en almacenamiento de perfiles
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
    <div className="auth-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '70vh' }}>
      <div className="auth-card" style={{ width: '100%', maxWidth: '440px' }}>
        <div className="form-header" style={{ textAlign: 'center', flexDirection: 'column', gap: '0.5rem' }}>
          <div className="form-icon-circle" style={{ margin: '0 auto' }}>
            <Shield size={26} className="icon-gradient" />
          </div>
          <h2 className="form-title" style={{ fontSize: '1.75rem' }}>Iniciar Sesión</h2>
          <p className="form-subtitle">Autenticación dinámica con la base de datos de perfiles</p>
        </div>

        <form onSubmit={handleLogin} className="prospect-form">
          {errorMsg && (
            <div className="error-banner">
              <AlertCircle size={18} />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="input-group">
            <label className="input-label"><UserCheck size={16} /> USUARIO O CORREO</label>
            <input
              type="text"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Ej. victoria.leads o correo@empresa.com"
              className="input-field"
              required
            />
          </div>

          <div className="input-group">
            <label className="input-label"><Lock size={16} /> CONTRASEÑA</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="input-field"
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={loading}
            style={{ width: '100%', marginTop: '1rem', padding: '0.9rem' }}
          >
            {loading ? (
              <>
                <div className="spinner"></div> Verificando credenciales...
              </>
            ) : (
              <>
                <LogIn size={18} /> Iniciar Sesión
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
