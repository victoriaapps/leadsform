import { describe, it, expect, beforeEach } from 'vitest';
import { COLOR_THEMES, getThemeMode, setThemeMode, applyCompanyTheme } from '../../lib/themeEngine';

describe('Unidad: Motor de Temas y Paletas (themeEngine)', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.style.cssText = '';
  });

  it('debe tener al menos 6 paletas de colores configuradas', () => {
    expect(COLOR_THEMES.length).toBeGreaterThanOrEqual(6);
    expect(COLOR_THEMES.map(t => t.id)).toContain('indigo');
    expect(COLOR_THEMES.map(t => t.id)).toContain('blue');
    expect(COLOR_THEMES.map(t => t.id)).toContain('green');
  });

  it('debe retornar "light" como modo por defecto', () => {
    expect(getThemeMode()).toBe('light');
  });

  it('debe alternar y guardar correctamente el modo oscuro', () => {
    setThemeMode('dark');
    expect(getThemeMode()).toBe('dark');
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

    setThemeMode('light');
    expect(getThemeMode()).toBe('light');
    expect(document.documentElement.getAttribute('data-theme')).toBeNull();
  });

  it('debe aplicar las variables CSS correspondientes a la paleta de empresa elegida', () => {
    applyCompanyTheme('green');
    const primary = document.documentElement.style.getPropertyValue('--primary-accent');
    expect(primary).toBe('#059669');
  });
});
