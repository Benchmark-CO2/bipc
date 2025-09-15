import { Checkbox } from '@/components/ui/checkbox';
import { useSummary } from '@/context/summaryContext';
import { cn } from '@/lib/utils';
import { barColors } from '../utils';

type ListItemProps = {
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
const ListItem = ({ item, selectedProjects, handleAddProject, sum }: ListItemProps) => {
  const { isExpanded } = useSummary();
  return (
   <li
                  key={item.id}
                  className={cn("flex flex-col w-full items-start gap-3 mt-4", {
                    "text-sm": isExpanded,
                  })}
                  onClick={() => handleAddProject(item.id!)}
                >
                  <div className="flex items-center gap-3 cursor-pointer">
                    <Checkbox
                      checked={selectedProjects.includes(item.id!)}
                      onClick={() => handleAddProject(item.id!)}
                    />
                    <h4 className="whitespace-nowrap flex items-center gap-3 cursor-pointer">
                      {item.label as string}
                    </h4>
                  </div>
                  <div className="flex w-full min-h-[50px]! justify-between gap-0">
                    <div
                      className="flex flex-col gap-2 justify-between h-10"
                      style={{
                        width: `${(Number(item.beamColumn) / Number(sum)) * 100}%`,
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: barColors[0],
                        }}
                        className={`h-[10px] rounded-l-md w-full`}
                      ></div>
                      <span className="text-sm">
                        {(item.beamColumn || 0).toFixed(3)} Kg/m2
                      </span>
                    </div>
                    <div
                      className="flex flex-col gap-2 justify-between h-10 w-full"
                      style={{
                        width: `${(Number(item.concreteWall) / Number(sum)) * 100}%`,
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: barColors[1],
                        }}
                        className={`h-[10px] w-full`}
                      ></div>
                      <span className="text-sm">
                        {(item.concreteWall || 0).toFixed(3)} Kg/m2
                      </span>
                    </div>
                    <div
                      className="flex flex-col gap-2 justify-between h-10 w-full"
                      style={{
                        width: `${(Number(item.structural) / Number(sum)) * 100}%`,
                      }}
                    >
                      <div
                        style={{
                          backgroundColor: barColors[2],
                        }}
                        className={`h-[10px] rounded-r-full w-full`}
                      ></div>
                      <span className="text-sm">
                        {(item.structural || 0).toFixed(3)} Kg/m2
                      </span>
                    </div>
                  </div>
                </li>
  )
};

export default ListItem;