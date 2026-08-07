export interface ColorTheme {
  id: string;
  name: string;
  primary: string;
  glow: string;
  secondary: string;
}

export const COLOR_THEMES: ColorTheme[] = [
  {
    id: 'indigo',
    name: 'Indigo Violeta',
    primary: '#6366f1',
    glow: 'rgba(99, 102, 241, 0.25)',
    secondary: '#06b6d4',
  },
  {
    id: 'blue',
    name: 'Azul Océano',
    primary: '#0284c7',
    glow: 'rgba(2, 132, 199, 0.25)',
    secondary: '#38bdf8',
  },
  {
    id: 'green',
    name: 'Verde Esmeralda',
    primary: '#059669',
    glow: 'rgba(5, 150, 105, 0.25)',
    secondary: '#10b981',
  },
  {
    id: 'red',
    name: 'Rojo Carmesí',
    primary: '#e11d48',
    glow: 'rgba(225, 29, 72, 0.25)',
    secondary: '#fb7185',
  },
  {
    id: 'amber',
    name: 'Dorado Ámbar',
    primary: '#d97706',
    glow: 'rgba(217, 119, 6, 0.25)',
    secondary: '#fbbf24',
  },
  {
    id: 'rose',
    name: 'Rosa Elegante',
    primary: '#db2777',
    glow: 'rgba(219, 39, 119, 0.25)',
    secondary: '#f472b6',
  },
];

const STORAGE_THEME_MODE = 'prospectos_theme_mode_v1';
const STORAGE_CUSTOM_HEX = 'prospectos_custom_hex_v1';

export function getThemeMode(): 'light' | 'dark' {
  const saved = localStorage.getItem(STORAGE_THEME_MODE);
  return saved === 'dark' ? 'dark' : 'light';
}

export function setThemeMode(mode: 'light' | 'dark'): void {
  localStorage.setItem(STORAGE_THEME_MODE, mode);
  if (mode === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

export function getCustomHexColor(): string | null {
  return localStorage.getItem(STORAGE_CUSTOM_HEX);
}

export function applyCustomHexColor(hexColor: string): void {
  let cleanHex = hexColor.trim();
  if (!cleanHex.startsWith('#')) {
    cleanHex = '#' + cleanHex;
  }
  if (!/^#[0-9A-Fa-f]{6}$/.test(cleanHex)) return;

  localStorage.setItem(STORAGE_CUSTOM_HEX, cleanHex);
  const root = document.documentElement;

  root.style.setProperty('--primary-accent', cleanHex);
  root.style.setProperty('--primary-glow', `${cleanHex}33`);
  root.style.setProperty('--secondary-accent', cleanHex);
  root.style.setProperty('--border-focus', cleanHex);

  const currentMode = getThemeMode();
  setThemeMode(currentMode);

  window.dispatchEvent(new Event('themeChange'));
  window.dispatchEvent(new Event('storage'));
}

export function applyCompanyTheme(paletteIdOrHex?: string | null): void {
  const root = document.documentElement;
  
  if (!paletteIdOrHex) {
    paletteIdOrHex = 'indigo';
  }

  // Verificar si es un valor hexadecimal
  let hexColor: string | null = null;
  if (/^#[0-9A-Fa-f]{6}$/.test(paletteIdOrHex)) {
    hexColor = paletteIdOrHex;
  } else if (/^[0-9A-Fa-f]{6}$/.test(paletteIdOrHex)) {
    hexColor = `#${paletteIdOrHex}`;
  }

  if (hexColor) {
    applyCustomHexColor(hexColor);
    return;
  }

  // Si no hay hex personalizado activo, remover el storage custom hex
  localStorage.removeItem(STORAGE_CUSTOM_HEX);
  const theme = COLOR_THEMES.find(t => t.id === paletteIdOrHex) || COLOR_THEMES[0];

  root.style.setProperty('--primary-accent', theme.primary);
  root.style.setProperty('--primary-glow', theme.glow);
  root.style.setProperty('--secondary-accent', theme.secondary);
  root.style.setProperty('--border-focus', theme.primary);

  const currentMode = getThemeMode();
  setThemeMode(currentMode);

  window.dispatchEvent(new Event('themeChange'));
  window.dispatchEvent(new Event('storage'));
}

export function generateThemePalette(baseHexColor: string, count: number = 8): string[] {
  let hex = (baseHexColor || '#6366f1').replace('#', '').trim();
  if (hex.length === 3) hex = hex.split('').map(c => c + c).join('');
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) hex = '6366f1';

  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  const hDeg = Math.round(h * 360);
  const sPct = Math.round(s * 100);
  const lPct = Math.round(l * 100);

  // Si la saturación es muy baja (negro/gris/blanco)
  if (sPct < 10) {
    const grayStops = [45, 65, 28, 78, 18, 55, 38, 85];
    return Array.from({ length: count }, (_, i) => `hsl(220, 8%, ${grayStops[i % grayStops.length]}%)`);
  }

  // Generar graduación armónica manteniendo el tono (hue) de la marca
  const lightnessStops = [
    Math.min(lPct, 52),
    Math.min(lPct + 18, 72),
    Math.max(lPct - 18, 30),
    Math.min(lPct + 30, 84),
    Math.max(lPct - 28, 20),
    Math.min(lPct + 10, 62),
    Math.max(lPct - 10, 42),
    Math.min(lPct + 24, 78)
  ];

  return Array.from({ length: count }, (_, i) => {
    const targetL = lightnessStops[i % lightnessStops.length];
    return `hsl(${hDeg}, ${Math.max(sPct, 45)}%, ${targetL}%)`;
  });
}
