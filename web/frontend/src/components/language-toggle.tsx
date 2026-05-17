import { Globe } from "lucide-react";
import { useTranslation, type Language } from "@/i18n";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const languageLabels: Record<Language, string> = {
  "pt-BR": "Português",
  en: "English",
};

export function LanguageToggle() {
  const { language, setLanguage } = useTranslation();

  return (
    <div className="flex items-center justify-between w-full p-3 border rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
      <div className="flex items-center gap-3">
        <div className="p-1 rounded-full bg-blue-100 text-blue-600">
          <Globe size={14} />
        </div>
        <span className="text-sm font-medium">{languageLabels[language]}</span>
      </div>
      <Select
        value={language}
        onValueChange={(v) => setLanguage(v as Language)}
      >
        <SelectTrigger className="w-32 h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="pt-BR">Português</SelectItem>
          <SelectItem value="en">English</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
