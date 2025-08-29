import { IProject } from "@/types/projects";
import { DropdownMenu } from "@radix-ui/react-dropdown-menu";
import { Edit, EllipsisVertical } from "lucide-react";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { DrawerFormProject } from "../layout";
import DrawerInvite from "../layout/drawer-invite";
import ModalConfirmDelete from "../layout/modal-confirm-delete";
import { Checkbox } from "./checkbox";
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./dropdown-menu";

const CardMenu = ({
  onDeleteProject,
  project,
}: {
  onDeleteProject?: (projectUid: string) => void;
  project: IProject;
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <DropdownMenu
      open={open}
      onOpenChange={setOpen}
      dir="ltr"
      modal
      key={project.id}
    >
      <DropdownMenuTrigger asChild>
        <EllipsisVertical className="z-5 absolute right-1 top-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent className="relative flex flex-col w-[200px]">
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <DrawerInvite projectId={project.id} />
        </DropdownMenuItem>
        <DropdownMenuItem>
          <DrawerFormProject
            componentTrigger={
              <div className="w-full flex items-center justify-between">
                {t("common.edit")}
                <Edit
                  size={20}
                  color="#FFF"
                  className="delete-project hover:shadow-md"
                />
              </div>
            }
            projectData={project}
          />
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <ModalConfirmDelete
            key={project.id}
            title={t("modalConfirmDelete.projectTitle")}
            onConfirm={() => onDeleteProject?.(project.id)}
          />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
interface CustomCardProps {
  project: IProject;
  onClick: () => void;
  onDeleteProject?: (projectUid: string) => void;
  selectedProjects: Map<string, boolean>;
  handleSelectProject: (projectUid: string, isSelected: boolean) => void;
}
const CustomCard = ({
  onClick,
  project,
  onDeleteProject,
  selectedProjects,
  handleSelectProject,
}: CustomCardProps) => {
  // const [setImageLoaded] = useState(false);

  const { description, name } = project;

  // const handleImageLoadEnd = () => {
  //   // setImageLoaded(true);
  // };

  const handleClickCard = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const dataType = target
      .closest("[data-action]")
      ?.getAttribute("data-action");
    if (dataType === "delete-project" || dataType === "edit-project") {
      console.log("Action not handled for:", dataType);
      return;
    } else if (dataType === "open-project") {
      onClick();
    }
  };

  // useEffect(() => {
  //   if (!project.image_url) handleImageLoadEnd();
  // }, []);

  const handleClickCheck = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    handleSelectProject(project.id!, !selectedProjects.get(project.id!));
  };

  return (
    <div
      data-action="open-project"
      onClick={handleClickCard}
      className="card w-full md:max-w-md flex-col items-center justify-center overflow-hidden rounded-lg bg-primary shadow-md shadow-zinc-600 transition-all duration-500 hover:cursor-pointer hover:shadow-lg md:w-1/3 lg:w-1/4 xl:max-w-100 dark:shadow-dark-900 h-[100px]"
    >
      <div className="group w-full h-full">
        <CardMenu onDeleteProject={onDeleteProject} project={project} />
        <div className="flex h-full w-full max-w-md flex-col justify-between gap-2 p-3 pt-5 text-white">
          <div className="flex w-full justify-between items-start">
            <Checkbox
              onClick={handleClickCheck}
              data-checked={selectedProjects.get(project.id!)}
              checked={selectedProjects.get(project.id!)}
              className="data-[checked=true]:bg-white! data-[checked=true]:text-primary! scale-125 border-white bg-primary!"
            />
            <span className="text-sm">{description}</span>
          </div>
          <span className="text-xl whitespace-nowrap font-bold text-left">
            {name}
          </span>
        </div>
      </div>
    </div>
  );
};

export const CustomCardSkeleton = () => {
  return (
    <div className="relative h-[100px] w-full">
      <div className="h-full w-full animate-pulse rounded-lg bg-gray-300"></div>
      <div className="absolute top-0 left-0 h-full w-full rounded-lg bg-black opacity-50"></div>
    </div>
  );
};

export default CustomCard;
