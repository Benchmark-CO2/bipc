import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";
import { CheckCircle2, Edit2, XCircle } from "lucide-react";
import { Step1UnitsViewProps } from "@/types/ifc";
import { useTranslation } from "@/i18n";

export function Step1UnitsView({
  state,
  setUnitNameInline,
  setUnitSimulationNameInline,
  onEditUnit,
}: Step1UnitsViewProps) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold">
          {t.stepper.units.title} ({state.units.length})
        </h3>
      </div>

      {state.units.length === 0 ? (
        <div className="text-sm text-muted-foreground p-8 border rounded-lg text-center">
          {t.stepper.units.noneFound}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t.stepper.units.columnName}</TableHead>
              <TableHead>{t.stepper.units.columnSimulationName}</TableHead>
              <TableHead>{t.stepper.units.columnFloors}</TableHead>
              <TableHead>{t.stepper.units.columnStatus}</TableHead>
              <TableHead className="w-[120px] text-right">
                {t.stepper.units.columnAction}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {state.units.map((u) => (
              <TableRow key={u.tempId}>
                <TableCell>
                  <Input
                    type="text"
                    value={u.name}
                    onChange={(e) =>
                      setUnitNameInline(u.tempId, e.target.value)
                    }
                    className="w-full max-w-xs h-8 px-2 py-1"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="text"
                    value={u.simulationName}
                    onChange={(e) =>
                      setUnitSimulationNameInline(u.tempId, e.target.value)
                    }
                    placeholder={t.stepper.units.simulationNamePlaceholder}
                    className="w-full max-w-xs h-8 px-2 py-1"
                  />
                </TableCell>
                <TableCell>
                  {u.formData.data.floors.reduce(
                    (acc, f) => acc + ((f as any).repetition || 1),
                    0,
                  )}
                </TableCell>
                <TableCell>
                  {u.isValid ? (
                    <SimpleTooltip content={t.stepper.statusValid} side="top">
                      <span className="inline-flex">
                        <Badge
                          variant="success"
                          className="gap-1 w-auto justify-center"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                          {t.stepper.statusValid}
                        </Badge>
                      </span>
                    </SimpleTooltip>
                  ) : (
                    <SimpleTooltip
                      side="top"
                      content={
                        <div className="flex flex-col gap-1 max-w-xs">
                          <p className="font-medium text-xs">
                            {t.stepper.validationErrors}
                          </p>
                          <ul className="list-disc pl-4 text-xs space-y-0.5">
                            {u.validationErrors.length > 0 ? (
                              u.validationErrors.map((msg, i) => (
                                <li key={i}>{msg}</li>
                              ))
                            ) : (
                              <li>{t.stepper.units.errorsUnknown}</li>
                            )}
                          </ul>
                        </div>
                      }
                    >
                      <span className="inline-flex">
                        <Badge
                          variant="destructive"
                          className="gap-1 w-auto justify-center"
                        >
                          <XCircle className="h-3 w-3" />
                          {u.validationErrors.length}{" "}
                          {u.validationErrors.length === 1
                            ? t.stepper.units.errors
                            : t.stepper.units.errorsPlural}
                        </Badge>
                      </span>
                    </SimpleTooltip>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onEditUnit(u.tempId)}
                    className="gap-1"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    {t.stepper.btnEdit}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
