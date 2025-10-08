import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { Switch } from "@/components/ui/switch";
import { useTranslation } from "react-i18next";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  const isDark = theme === "dark";

  const handleToggle = (checked: boolean) => {
    setTheme(checked ? "dark" : "light");
  };

  return (
    <div className="flex items-center justify-between w-full p-3 border rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
      <div className="flex items-center gap-3">
        <div
          className={`p-1 rounded-full transition-colors ${isDark ? "bg-slate-700 text-slate-200" : "bg-amber-100 text-amber-600"}`}
        >
          {isDark ? <Moon size={14} /> : <Sun size={14} />}
        </div>
        <span className="text-sm font-medium">
          {isDark ? t("sidebar.dark") : t("sidebar.light")}
        </span>
      </div>
      <Switch
        checked={isDark}
        onCheckedChange={handleToggle}
        className="data-[state=checked]:bg-blue-600"
      />
    </div>
  );
}
