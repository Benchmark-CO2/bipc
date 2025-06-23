import { TProjectUnit } from "@/types/projects";
// import { useRouter } from "@tanstack/react-router";
import {
  MoreHorizontal,
  // Pen, Trash
} from "lucide-react";
// import { useState } from "react";
import DrawerAddUnit from "../layout/drawer-add-unit";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "./dropdown-menu";

interface TabsContainerProps {
  units: TProjectUnit[];
  projectId: string;
  selectedTab?: number;
  // handleAddNewUnit: (data: AddUnitFormSchema) => void;
  // handleEditUnit: (data: TProjectUnit) => void;
  // handleDeleteUnit: (unitId: string) => void;
}

export function TabsContainer({
  units,
  projectId,
  selectedTab,
  // handleAddNewUnit,
  // handleEditUnit,
  // handleDeleteUnit,
}: TabsContainerProps) {
  // const router = useRouter();
  // const [isOpen, setIsOpen] = useState(false);

  // const handleOpen = () => {
  //   setIsOpen(!isOpen);
  // };
  // const handleTabClick = (unitId: number) => {
  //   void router.navigate({
  //     to: `/projects/${projectId}/${unitId}`,
  //   });
  // };

  const unitId = selectedTab ?? "";

  return (
    <div className="flex items-center gap-2 border-b">
      {units.map((unit) => (
        <button
          key={unit.id}
          onClick={() => {
            // handleTabClick(unit.id);
          }}
          className={`cursor-pointer rounded-t-lg px-4 py-2 transition-all flex items-center justify-between gap-2 ${
            unitId === unit.id
              ? "border-b-2 border-primary bg-background font-bold text-primary"
              : "bg-muted text-muted-foreground hover:bg-accent"
          }`}
        >
          {unit.name}
          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger className="ml-2">
              <MoreHorizontal size={16} className="text-primary" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {/* <DrawerEditUnit
                // isOpen={drawerIsOpen}
                // setIsOpen={setDrawerIsOpen}
                callback={handleEditUnit}
                unit={unit}
                triggerComponent={
                  <DropdownMenuItem
                    className="flex justify-between"
                    onSelect={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                  >
                    Editar
                    <Pen size={16} className="text-primary" />
                  </DropdownMenuItem>
                }
              /> */}

              {/* <ModalConfirmDeleteUnit
                // isOpen={modalIsOpen}
                // setIsOpen={setModalIsOpen}
                callback={() => handleDeleteUnit(unit.id)}
                componentTrigger={
                  <DropdownMenuItem
                    className="flex justify-between"
                    onSelect={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                  >
                    Excluir
                    <Trash size={16} className="text-destructive" />
                  </DropdownMenuItem>
                }
              /> */}
            </DropdownMenuContent>
          </DropdownMenu>
        </button>
      ))}

      <DrawerAddUnit projectId={projectId} />
    </div>
  );
}
