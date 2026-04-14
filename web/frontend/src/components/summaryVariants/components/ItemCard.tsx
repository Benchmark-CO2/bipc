import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

type ItemCardProps = {
  item: Partial<{
    id: string;
    label: string;
    co2: number;
    energy: number;
  }>;
  selectedProjects: string[];
  handleAddProject: (id: string) => void;
  sum: number;
  color: string;
  type: "co2" | "energy";
  hasConsumption: boolean;
};
const ItemCard = ({
  item,
  sum,
  color,
  handleAddProject,
  selectedProjects,
  type,
  hasConsumption,
}: ItemCardProps) => {
  return (
    <div className="w-[350px] p-4 gap-3 bg-white dark:bg-sidebar dark:border-1 dark:border-zinc-600 rounded-lg shadow-md flex flex-col justify-center items-start max-sm:w-full">
      <div
        onClick={() => hasConsumption && handleAddProject(item.id!)}
        className="w-full flex justify-between items-center cursor-pointer"
      >
        <h3 className="font-bold text-primary mb-2">
          {item.label}{" "}
          {!hasConsumption && (
            <span className="text-xs text-red-500">
              (Sem consumo registrado)
            </span>
          )}
        </h3>
        <Checkbox
          className="dark:data-[state=checked]:text-foreground dark:data-[state=checked]:bg-primary"
          checked={hasConsumption && selectedProjects.includes(item.id!)}
          disabled={!hasConsumption}
        />
      </div>
      <div className="flex flex-col gap-1 w-full">
        <p className="font-semibold text-lg text-primary">
          Sistema viga /pilar:
        </p>
        <div
          className={cn("h-4 rounded-full", {})}
          style={{
            backgroundColor: color,
            width: `${((item[type] as number) / sum) * 100}%`,
          }}
        />
        {!!item[type] && (
          <p className="text-base text-foreground">
            {(item[type] as number).toFixed(1)} kg CO₂/m²
          </p>
        )}
      </div>
    </div>
  );
};

export default ItemCard;
