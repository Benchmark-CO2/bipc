import { cn } from "@/lib/utils";
import { barColors } from "../utils";

type ItemCardProps = {
  item: Partial<{
    id: string;
    label: string;
    beamColumn: number;
    concreteWall: number;
    structural: number;
  }>;
  selectedProjects: string[];
  handleAddProject: (id: string) => void;
  sum: number;
};
const ItemCard = ({ item, sum }: ItemCardProps) => {
  return (
    <div className="w-[350px] p-4 gap-3 bg-white rounded-lg shadow-md flex flex-col justify-center items-start">
      <h3 className="font-bold text-primary mb-2">{item.label}</h3>
      <div className="flex flex-col gap-1 w-full">
        <p className="font-semibold text-lg text-primary">
          Sistema viga /pilar:
        </p>
        <div
          style={{
            backgroundColor: barColors[0],
            width: `${(Number(item.beamColumn) / Number(sum)) * 100}%`,
          }}
          className={cn("h-4 rounded-full", barColors[0], {
            "w-1/2": true,
          })}
        />
        {!!item.beamColumn && (
          <p className="text-base">{item.beamColumn.toFixed(3)} Kg/m2</p>
        )}
      </div>
      <div className="flex flex-col gap-1 w-full">
        <p className="font-semibold text-lg text-primary">Bloco estrutural:</p>
        <div
          style={{
            backgroundColor: barColors[1],
            width: `${(Number(item.structural) / Number(sum)) * 100}%`,
          }}
          className={cn("h-4 rounded-full", barColors[2], {
            "w-1/2": true,
          })}
        />
        {!!item.structural && (
          <p className="text-base">{item.structural.toFixed(3)} Kg/m²</p>
        )}
      </div>
      <div className="flex flex-col gap-1 w-full">
        <p className="font-semibold text-lg text-primary">
          Parede de concreto:
        </p>
        <div
          style={{
            backgroundColor: barColors[2],
          width: `${(Number(item.concreteWall) / Number(sum)) * 100}%`,
          }}
          className={cn("h-4 rounded-full", barColors[1], {
            "w-1/2": true,
          })}
        />
        {!!item.concreteWall && (
          <p className="text-base">{item.concreteWall.toFixed(3)} Kg/m2</p>
        )}
      </div>
    </div>
  );
};

export default ItemCard;
