export interface ThemeDef {
  id: string;
  label: string;
  color: string;
  border: string;
  icon: string;
  exclusive: boolean;
}

export const ALL_THEMES: ThemeDef[] = [
  { id: "light",         label: "Claro",          color: "#ffffff", border: "#d1d5db", icon: "☀️",  exclusive: false },
  { id: "dark",          label: "Escuro",          color: "#1a1a1a", border: "#4b5563", icon: "🌙",  exclusive: false },
  { id: "midnight-blue", label: "Azul Meia-Noite", color: "#2e3a6e", border: "#3b4db8", icon: "🌌",  exclusive: false },
  { id: "pink",          label: "Rosa",            color: "#fce7f3", border: "#f472b6", icon: "🌸",  exclusive: true  },
];

export const DEFAULT_ALLOWED = ALL_THEMES.filter((t) => !t.exclusive).map((t) => t.id);
// ["light", "dark", "midnight-blue"]

export const EXCLUSIVE_THEMES = ALL_THEMES.filter((t) => t.exclusive);
