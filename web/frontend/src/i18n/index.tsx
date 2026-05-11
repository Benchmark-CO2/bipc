import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { ptBR, type Translations } from "./translations/pt-BR";
import { en } from "./translations/en";

export type Language = "pt-BR" | "en";

const STORAGE_KEY = "bipc:language";

const translationsMap: Record<Language, Translations> = {
  "pt-BR": ptBR,
  en,
};

function getInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "pt-BR" || saved === "en") return saved;
  } catch {
    // localStorage not available
  }
  return "pt-BR";
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "pt-BR",
  setLanguage: () => {},
  t: ptBR,
});

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(getInitialLanguage);

  const setLanguage = useCallback((lang: Language) => {
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // localStorage not available
    }
    setLanguageState(lang);
  }, []);

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, t: translationsMap[language] }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  return useContext(LanguageContext);
}
