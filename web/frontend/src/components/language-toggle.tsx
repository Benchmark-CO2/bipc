import { Languages } from "lucide-react";
import { flags } from "@/assets/icons/flags";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const languageMap = {
  "en-US": { label: "English", flag: flags["en-US"].flag },
  "pt-BR": { label: "Português", flag: flags["pt-BR"].flag },
  "es-ES": { label: "Español", flag: flags["es-ES"].flag },
};

export function LanguageToggle() {
  const { i18n } = useTranslation();

  const handleChangeLanguage = async (lng: string) => {
    await i18n.changeLanguage(lng);
  };

  const currentLanguage =
    languageMap[i18n.language as keyof typeof languageMap] ||
    languageMap["pt-BR"];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-between h-auto p-3 bg-muted/20 hover:bg-muted/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-1 rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300">
              <Languages size={14} />
            </div>
            <span className="text-sm font-medium">{currentLanguage.label}</span>
          </div>
          <span className="text-lg">{currentLanguage.flag}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {Object.entries(languageMap).map(([lng, config]) => (
          <DropdownMenuItem
            key={lng}
            className="flex w-full justify-between cursor-pointer"
            onClick={() => void handleChangeLanguage(lng)}
          >
            <span>{config.label}</span>
            <span className="text-lg">{config.flag}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
