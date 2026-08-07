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

export function getThemeMode(): 'light' | 'dark' {
  const saved = localStorage.getItem(STORAGE_THEME_MODE);
  return saved === 'dark' ? 'dark' : 'light'; // DEFAULT LIGHT MODE
}

export function setThemeMode(mode: 'light' | 'dark'): void {
  localStorage.setItem(STORAGE_THEME_MODE, mode);
  if (mode === 'dark') {
    document.documentElement.setAttribute('data-theme', 'dark');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

export function applyCompanyTheme(paletteId?: string | null): void {
  const theme = COLOR_THEMES.find(t => t.id === paletteId) || COLOR_THEMES[0];
  const root = document.documentElement;

  root.style.setProperty('--primary-accent', theme.primary);
  root.style.setProperty('--primary-glow', theme.glow);
  root.style.setProperty('--secondary-accent', theme.secondary);
  root.style.setProperty('--border-focus', theme.primary);

  // Asegurar que el modo por defecto (Light/Dark) se aplique
  const currentMode = getThemeMode();
  setThemeMode(currentMode);
}
