import React, { useState, useEffect } from 'react';
import { X, Sun, Moon, Check, RotateCcw, Palette, Hash } from 'lucide-react';
import { COLOR_THEMES, getThemeMode, setThemeMode, applyCompanyTheme, applyCustomHexColor, getCustomHexColor } from '../lib/themeEngine';

interface ThemeCustomizerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentPaletteId?: string | null;
  onPaletteChange?: (paletteId: string) => void;
}

export const ThemeCustomizerDrawer: React.FC<ThemeCustomizerDrawerProps> = ({
  isOpen,
  onClose,
  currentPaletteId = 'indigo',
  onPaletteChange
}) => {
  if (!isOpen) return null;

  const mode = getThemeMode();
  
  // Determinar si la paleta actual es un código HEX personalizado o un ID de tema
  const initialIsHex = Boolean(currentPaletteId && /^#?[0-9A-Fa-f]{6}$/.test(currentPaletteId));
  const [customHex, setCustomHex] = useState<string>(() => {
    if (initialIsHex && currentPaletteId) {
      return currentPaletteId.startsWith('#') ? currentPaletteId : `#${currentPaletteId}`;
    }
    return getCustomHexColor() || '#6366f1';
  });

  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(() => {
    if (initialIsHex) return null;
    return currentPaletteId || 'indigo';
  });

  useEffect(() => {
    if (currentPaletteId) {
      if (/^#?[0-9A-Fa-f]{6}$/.test(currentPaletteId)) {
        const hex = currentPaletteId.startsWith('#') ? currentPaletteId : `#${currentPaletteId}`;
        setCustomHex(hex);
        setSelectedThemeId(null);
      } else {
        setSelectedThemeId(currentPaletteId);
      }
    }
  }, [currentPaletteId, isOpen]);

  const handleModeToggle = (newMode: 'light' | 'dark') => {
    setThemeMode(newMode);
    window.dispatchEvent(new Event('storage'));
  };

  const handleSelectPreset = (id: string) => {
    setSelectedThemeId(id);
    localStorage.removeItem('prospectos_custom_hex_v1');
    applyCompanyTheme(id);
    if (onPaletteChange) onPaletteChange(id);
  };

  const handleHexChange = (hexInput: string) => {
    let cleanHex = hexInput.trim();
    if (!cleanHex.startsWith('#')) {
      cleanHex = '#' + cleanHex;
    }
    setCustomHex(cleanHex);
    if (/^#[0-9A-Fa-f]{6}$/.test(cleanHex)) {
      setSelectedThemeId(null);
      applyCustomHexColor(cleanHex);
      if (onPaletteChange) onPaletteChange(cleanHex);
    }
  };

  const handleReset = () => {
    localStorage.removeItem('prospectos_custom_hex_v1');
    setThemeMode('light');
    setSelectedThemeId('indigo');
    setCustomHex('#6366f1');
    applyCompanyTheme('indigo');
    if (onPaletteChange) onPaletteChange('indigo');
  };

  return (
    <>
      {/* OVERLAY DE FONDO CON DIFUMINADO */}
      <div className="customizer-overlay" onClick={onClose} />

      {/* DRAWER LATERAL DE CONFIGURACIÓN DE TEMA */}
      <div className="customizer-drawer">
        {/* ENCABEZADO */}
        <div className="customizer-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Palette size={20} />
            <h3 style={{ fontFamily: 'Outfit', fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Theme Customizer</h3>
          </div>
          <button 
            onClick={onClose} 
            className="customizer-close-btn"
            title="Cerrar ventana"
          >
            <X size={18} />
          </button>
        </div>

        <div className="customizer-body">
          {/* MODO DE COLOR (LIGHT / DARK) */}
          <div className="customizer-box">
            <div className="customizer-box-title">COLOR MODE (MODO DEL TEMA)</div>
            <div className="color-mode-toggle">
              <button
                type="button"
                className={`mode-btn ${mode === 'light' ? 'active' : ''}`}
                onClick={() => handleModeToggle('light')}
              >
                <Sun size={16} /> Light {mode === 'light' && <Check size={14} style={{ color: 'var(--primary-accent)', marginLeft: 'auto' }} />}
              </button>
              <button
                type="button"
                className={`mode-btn ${mode === 'dark' ? 'active' : ''}`}
                onClick={() => handleModeToggle('dark')}
              >
                <Moon size={16} /> Dark {mode === 'dark' && <Check size={14} style={{ color: 'var(--primary-accent)', marginLeft: 'auto' }} />}
              </button>
            </div>
          </div>

          {/* PALETA DE COLORES VISUAL (UNIFICADA CON EDITAR EMPRESA) */}
          <div className="customizer-box">
            <div className="customizer-box-title">PALETA DE COLORES VISUAL</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', marginTop: '0.4rem' }}>
              {COLOR_THEMES.map((theme) => {
                const isSelected = selectedThemeId === theme.id;
                return (
                  <button
                    key={theme.id}
                    type="button"
                    onClick={() => handleSelectPreset(theme.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.5rem 0.75rem',
                      background: isSelected ? 'var(--primary-glow)' : 'var(--bg-surface)',
                      border: isSelected ? `2px solid ${theme.primary}` : '1px solid var(--border-color)',
                      borderRadius: '8px',
                      color: 'var(--text-main)',
                      fontSize: '0.82rem',
                      cursor: 'pointer',
                      fontWeight: isSelected ? 'bold' : 'normal',
                      transition: 'all 0.2s ease'
                    }}
                  >
                    <span style={{ width: '14px', height: '14px', borderRadius: '50%', background: theme.primary, flexShrink: 0 }}></span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{theme.name}</span>
                    {isSelected && <Check size={14} style={{ marginLeft: 'auto', color: theme.primary }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* SELECTOR DE COLOR HEXADECIMAL PERSONALIZADO */}
          <div className="customizer-box">
            <div className="customizer-box-title">SELECTOR DE COLOR PERSONALIZADO (HEXADECIMAL)</div>
            
            <div className="hex-picker-container">
              {/* Muestra de color + Color Picker Nativo */}
              <div className="hex-color-preview-wrapper">
                <input 
                  type="color" 
                  value={/^#[0-9A-Fa-f]{6}$/.test(customHex) ? customHex : '#6366f1'} 
                  onChange={(e) => handleHexChange(e.target.value)}
                  className="hex-color-picker-input"
                  title="Abre la paleta de colores nativa"
                />
                <div 
                  className="hex-color-preview-circle" 
                  style={{ background: /^#[0-9A-Fa-f]{6}$/.test(customHex) ? customHex : 'var(--primary-accent)' }}
                >
                  <Palette size={16} color="#ffffff" />
                </div>
              </div>

              {/* Campo de texto código Hex */}
              <div className="hex-input-wrapper">
                <Hash size={16} className="hex-icon" />
                <input 
                  type="text" 
                  value={customHex.replace('#', '')} 
                  onChange={(e) => handleHexChange(e.target.value)}
                  placeholder="1A3E60"
                  maxLength={6}
                  className="hex-text-input"
                />
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: '0.6rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>Hex Seleccionado:</span>
              <strong style={{ color: 'var(--primary-accent)', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                {/^#[0-9A-Fa-f]{6}$/.test(customHex) ? customHex.toUpperCase() : customHex}
              </strong>
            </div>
          </div>

          {/* BOTÓN RESTABLECER VALORES POR DEFECTO */}
          <button
            type="button"
            onClick={handleReset}
            className="btn-secondary customizer-reset-btn"
          >
            <RotateCcw size={15} /> Reset Default
          </button>
        </div>
      </div>
    </>
  );
};
