import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/i18n";
import type { ModuleFormSource } from "./index";

export const RequiredAsterisk = () => (
  <span className="text-red-500 font-semibold ml-0.5" aria-hidden="true">
    *
  </span>
);

interface RequiredLegendProps {
  legend: string;
}

export const RequiredLegend = ({ legend }: RequiredLegendProps) => (
  <p className="text-xs text-muted-foreground mb-1 pb-1 border-b border-gray-100">
    <span className="text-red-500 font-semibold mr-1 align-middle">*</span>
    {legend}
  </p>
);

interface RequiredFieldBadgeProps {
  variant?: "ifc" | "tqs" | "default";
  source?: ModuleFormSource;
}

export const RequiredFieldBadge = ({
  variant = "ifc",
  source,
}: RequiredFieldBadgeProps) => {
  const { t } = useTranslation();
  const actual = source ?? variant;
  if (actual === "ifc") {
    return (
      <Badge
        variant="secondary"
        className="h-6 text-[11px] px-2 py-0 gap-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 shrink-0"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 flex-shrink-0" />
        {t.modules.form.ifcSourceLabel}
      </Badge>
    );
  }
  if (actual === "tqs") {
    return (
      <Badge
        variant="secondary"
        className="h-6 text-[11px] px-2 py-0 gap-1.5 bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 shrink-0"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500 flex-shrink-0" />
        {t.modules.form.tqsSourceLabel}
      </Badge>
    );
  }
  return null;
};
