import React from 'react';
import { X, Sun, Moon, Check, RotateCcw } from 'lucide-react';
import { COLOR_THEMES, getThemeMode, setThemeMode, applyCompanyTheme } from '../lib/themeEngine';

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

  const handleModeToggle = (newMode: 'light' | 'dark') => {
    setThemeMode(newMode);
    // Forzar renderizado
    window.dispatchEvent(new Event('storage'));
  };

  const handleSelectPalette = (id: string) => {
    applyCompanyTheme(id);
    if (onPaletteChange) onPaletteChange(id);
  };

  return (
    <div className="customizer-drawer">
      {/* ENCABEZADO AZUL/VIOLETA IGUAL A IMAGEN 3 */}
      <div className="customizer-header">
        <h3 style={{ fontFamily: 'Outfit', fontSize: '1.1rem', fontWeight: 800 }}>Theme Customizer</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
          <X size={20} />
        </button>
      </div>

      <div className="customizer-body">
        {/* MODO DE COLOR (LIGHT / DARK) */}
        <div className="customizer-box">
          <div className="customizer-box-title">Color Mode</div>
          <div className="color-mode-toggle">
            <button
              type="button"
              className={`mode-btn ${mode === 'light' ? 'active' : ''}`}
              onClick={() => handleModeToggle('light')}
            >
              <Sun size={15} /> Light {mode === 'light' && <Check size={14} style={{ color: 'var(--primary-accent)' }} />}
            </button>
            <button
              type="button"
              className={`mode-btn ${mode === 'dark' ? 'active' : ''}`}
              onClick={() => handleModeToggle('dark')}
            >
              <Moon size={15} /> Dark {mode === 'dark' && <Check size={14} style={{ color: 'var(--primary-accent)' }} />}
            </button>
          </div>
        </div>

        {/* PALETA DE COLORES DE LA EMPRESA (SIDEBAR & ACCENT COLOR) */}
        <div className="customizer-box">
          <div className="customizer-box-title">Sidebar & Accent Color</div>
          <div className="color-swatch-grid">
            {COLOR_THEMES.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`swatch-btn ${currentPaletteId === t.id ? 'active' : ''}`}
                style={{ background: t.primary }}
                onClick={() => handleSelectPalette(t.id)}
                title={t.name}
              >
                {currentPaletteId === t.id && <Check size={16} color="#ffffff" />}
              </button>
            ))}
          </div>
        </div>

        {/* BOTÓN RESTABLECER */}
        <button
          type="button"
          onClick={() => {
            setThemeMode('light');
            handleSelectPalette('indigo');
          }}
          className="btn-secondary"
          style={{ width: '100%', justifyContent: 'center', marginTop: 'auto' }}
        >
          <RotateCcw size={15} /> Reset Default
        </button>
      </div>
    </div>
  );
};
