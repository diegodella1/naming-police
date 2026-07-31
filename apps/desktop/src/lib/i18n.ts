import type { Locale } from "@naming-police/contracts";

const copy = {
  es: {
    inbox: "Bandeja",
    folders: "Carpetas",
    history: "Historial",
    privacy: "Privacidad y uso",
    settings: "Ajustes",
    pending: "pendientes",
    addFolder: "Agregar carpeta",
    noSuggestions: "Todo bajo control",
    noSuggestionsDetail: "Las propuestas nuevas aparecerán acá.",
  },
  en: {
    inbox: "Inbox",
    folders: "Folders",
    history: "History",
    privacy: "Privacy & usage",
    settings: "Settings",
    pending: "pending",
    addFolder: "Add folder",
    noSuggestions: "Everything under control",
    noSuggestionsDetail: "New suggestions will appear here.",
  },
} as const;

export function t(locale: Locale) {
  return copy[locale];
}
