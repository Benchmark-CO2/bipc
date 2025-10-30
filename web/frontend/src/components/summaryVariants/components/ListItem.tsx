import { Checkbox } from "@/components/ui/checkbox";
import { useSummary } from "@/context/summaryContext";
import { cn } from "@/lib/utils";

type ListItemProps = {
  item: Partial<{
    label: string;
    co2: number;
    id: string;
    energy: number;
  }>;
  selectedProjects: string[];
  handleAddProject: (id: string) => void;
  sum: number;
  color?: string
  type: "co2" | "energy"
};
const ListItem = ({
  item,
  selectedProjects,
  handleAddProject,
  sum,
  color,
  type
}: ListItemProps) => {
  const { isExpanded } = useSummary();
  return (
    <li
      key={item.id}
      className={cn("flex flex-col items-start gap-2 mb-2 max-sm:items-center max-sm:self-start max-sm:w-full", {
        "text-sm": isExpanded,
      })}
      style={{
        width: `${(Number(item[type]) / Number(sum)) * 100}%`,
      }}
      onClick={() => handleAddProject(item.id!)}
    >
      <div className="flex items-center gap-3 cursor-pointer">
        <Checkbox
          checked={selectedProjects.includes(item.id!)}
          onClick={() => handleAddProject(item.id!)}
        />
        <h4 className="whitespace-nowrap flex items-center gap-3 cursor-pointer text-base text-foreground/90">
          {item.label as string}
        </h4>
      </div>
      <div className="flex flex-col gap-2 justify-between h-10 w-full">
        <div
          style={{
            backgroundColor: color,
          }}
          className={cn(`h-[10px] rounded-l-md w-full`, {
            "border-[0.5px] border-gray-300 rounded-md p-2": !item[type] && !isExpanded,
          })}
        ></div>
        <span className="text-sm whitespace-nowrap text-foreground/70">{(item[type] || 0).toFixed(1)} {type === "co2" ? "KgCO₂/m²" : "MJ/m²"}</span>
      </div>
    </li>
  );
};

export default ListItem;
