import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";

export function SidebarThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  const isDark = theme === "dark";

  const handleToggle = (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
  };

  return (
    <div className="flex items-center justify-between w-full px-2">
      <div className="flex items-center gap-3 text-inherit">
        {isDark ? <Moon size={16} /> : <Sun size={16} />}
        <span>{isDark ? t("sidebar.dark") : t("sidebar.light")}</span>
      </div>
      <Switch
        checked={isDark}
        onCheckedChange={handleToggle}
        className="data-[state=checked]:bg-blue-600"
      />
    </div>
  );
}
