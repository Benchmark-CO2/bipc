import { useEffect, useState } from "react";
import { useTranslation } from "@/i18n";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogFooter, DialogTitle } from "../ui/dialog";
import { TFloorMismatchError } from "@/types/ifc";
import { AlertTriangle, Building } from "lucide-react";

interface ModalMismatchFloorsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: TFloorMismatchError | null;
}

export function ModalMismatchFloors({
  open,
  onOpenChange,
  data,
}: ModalMismatchFloorsProps) {
  const [mounted, setMounted] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    if (open) setMounted(true);
  }, [open]);

  if (!mounted) return null;

  const compat = t.stepper.compat;

  const importedFloorsLabel =
    data && data.importedFloorsCount === 1
      ? t.stepper.units.floors
      : t.stepper.units.floorsPlural;

  const contextFloorsLabel =
    data && data.contextFloorsCount === 1
      ? t.stepper.units.floors
      : t.stepper.units.floorsPlural;

  const bodyText = data
    ? compat.floorMismatchBody
        .replace("{importedUnitName}", data.importedUnitName)
        .replace("{importedFloorsCount}", String(data.importedFloorsCount ?? 0))
        .replace("{importedFloorsLabel}", importedFloorsLabel)
        .replace("{contextUnitName}", data.contextUnitName ?? "-")
        .replace("{contextFloorsCount}", String(data.contextFloorsCount ?? 0))
        .replace("{contextFloorsLabel}", contextFloorsLabel)
    : "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden">
        <div className="relative bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 dark:from-red-950/30 dark:via-orange-950/20 dark:to-amber-950/20 border-b border-red-100 dark:border-red-900/30 px-6 pt-8 pb-6">
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none">
            <div className="absolute -top-12 -right-12 w-64 h-64 rounded-full bg-red-500 blur-3xl" />
            <div className="absolute -bottom-16 -left-8 w-48 h-48 rounded-full bg-orange-500 blur-3xl" />
          </div>

          <div className="relative flex items-start gap-4">
            <div className="shrink-0 w-12 h-12 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 dark:from-red-400 dark:to-orange-400 shadow-lg shadow-red-500/20 flex items-center justify-center text-white">
              <AlertTriangle className="w-6 h-6" strokeWidth={2.25} />
            </div>
            <div className="flex-1 pt-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-red-600 dark:text-red-400 mb-1.5">
                {t.drawerIFC.titleImport}
              </p>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-50 text-left leading-tight">
                {compat.floorMismatchTitle}
              </DialogTitle>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 space-y-5">
          <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
            {bodyText}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div className="group relative rounded-xl border border-red-200/70 dark:border-red-900/40 bg-white dark:bg-slate-900/40 p-4 overflow-hidden hover:border-red-300 dark:hover:border-red-800/60 transition-colors">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500 opacity-80" />
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
                  <Building
                    className="w-3.5 h-3.5 text-red-600 dark:text-red-400"
                    strokeWidth={2}
                  />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">
                  {t.stepper.import.fromFile}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {data?.importedUnitName ?? "-"}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">
                  {data?.importedFloorsCount ?? 0}
                  <span className="ml-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                    {importedFloorsLabel}
                  </span>
                </p>
              </div>
            </div>

            <div className="group relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-4 overflow-hidden hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
              <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-slate-500 via-slate-400 to-slate-500 opacity-60" />
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Building
                    className="w-3.5 h-3.5 text-slate-600 dark:text-slate-300"
                    strokeWidth={2}
                  />
                </div>
                <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                  {t.stepper.simulation.contextLabel}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  {data?.contextUnitName ?? "-"}
                </p>
                <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 tabular-nums">
                  {data?.contextFloorsCount ?? 0}
                  <span className="ml-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                    {contextFloorsLabel}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/50 border border-slate-200/70 dark:border-slate-800 p-3.5">
            <svg
              className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {compat.floorMismatchActionHelp}
            </p>
          </div>
        </div>

        <DialogFooter className="px-6 pb-6 pt-1 flex sm:justify-end gap-2">
          <Button
            variant="bipc"
            size="default"
            className="w-full sm:w-auto min-w-[140px]"
            onClick={() => onOpenChange(false)}
          >
            {t.common.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ModalMismatchFloors;
