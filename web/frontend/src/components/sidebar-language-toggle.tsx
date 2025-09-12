import { Languages, ChevronDown } from "lucide-react";
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

export function SidebarLanguageToggle() {
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
          variant="ghost"
          size="sm"
          className="w-full justify-between h-auto p-2 hover:bg-zinc-700/30"
        >
          <div className="flex items-center gap-3">
            <Languages size={16} />
            <span className="text-md">{currentLanguage.label}</span>
          </div>
          <ChevronDown size={12} />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
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
