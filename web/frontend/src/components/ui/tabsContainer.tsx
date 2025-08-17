import { TProjectUnit } from "@/types/projects";
import { useRouter } from "@tanstack/react-router";
import { DrawerFormUnit } from "../layout";

interface TabsContainerProps {
  units: TProjectUnit[];
  projectId: string;
  selectedTab?: number;
  hasAddButton?: boolean;
}

export function TabsContainer({
  units,
  projectId,
  selectedTab,
  hasAddButton = true,
}: TabsContainerProps) {
  const router = useRouter();

  const handleTabClick = (unitId: number) => {
    void router.navigate({
      to: `/projects/${projectId}/${unitId}`,
    });
  };

  const unitId = selectedTab ?? "";

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white p-4 w-fit dark:border-gray-700 dark:bg-gray-800">
        {units.map((unit) => (
          <button
            key={unit.id}
            onClick={() => {
              handleTabClick(unit.id);
            }}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-2 text-sm font-medium transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
              unitId === unit.id
                ? "bg-green-500 text-white shadow-sm dark:bg-green-600 dark:text-white"
                : "text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20"
            }`}
          >
            {unit.name}
          </button>
        ))}
      </div>
      {hasAddButton && <DrawerFormUnit projectId={projectId} />}
    </div>
  );
}
