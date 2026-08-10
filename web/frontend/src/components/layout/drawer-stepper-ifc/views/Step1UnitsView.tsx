import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit2 } from "lucide-react";
import { Step1UnitsViewProps } from "@/types/ifc";
import { useTranslation } from "@/i18n";

export function Step1UnitsView({
  state,
  toggleUnitSelected,
  setUnitNameInline,
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
              <TableHead className="w-[44px]">
                <span className="sr-only">Selecionar</span>
              </TableHead>
              <TableHead>{t.stepper.units.columnName}</TableHead>
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
                  <Checkbox
                    checked={u.selected}
                    onCheckedChange={() => toggleUnitSelected(u.tempId)}
                  />
                </TableCell>
                <TableCell>
                  <input
                    type="text"
                    value={u.name}
                    onChange={(e) =>
                      setUnitNameInline(u.tempId, e.target.value)
                    }
                    className="w-full max-w-xs bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary focus:outline-none px-1 py-0.5"
                  />
                </TableCell>
                <TableCell>
                  {u.formData.data.floors.length}{" "}
                  {u.formData.data.floors.length === 1
                    ? t.stepper.units.floors
                    : t.stepper.units.floorsPlural}
                </TableCell>
                <TableCell>
                  {u.isValid ? (
                    <Badge variant="success">{t.stepper.statusValid}</Badge>
                  ) : (
                    <Badge variant="destructive">
                      {u.validationErrors.length}{" "}
                      {u.validationErrors.length === 1
                        ? t.stepper.units.errors
                        : t.stepper.units.errorsPlural}
                    </Badge>
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
