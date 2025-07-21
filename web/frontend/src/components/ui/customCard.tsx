import { IProject } from "@/types/projects";
import { DropdownMenu } from "@radix-ui/react-dropdown-menu";
import { Edit, EllipsisVertical } from "lucide-react";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { DrawerFormProject } from "../layout";
import DrawerInvite from "../layout/drawer-invite";
import ModalConfirmDelete from "../layout/modal-confirm-delete";
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
}
const CustomCard = ({ onClick, project, onDeleteProject }: CustomCardProps) => {
  const [imageLoaded, setImageLoaded] = useState(false);

  const { city, description, name, state, image_url } = project;

  const handleImageLoadEnd = () => {
    setImageLoaded(true);
  };

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

  useEffect(() => {
    if (!project.image_url) handleImageLoadEnd();
  }, []);

  return (
    <div
      data-action="open-project"
      onClick={handleClickCard}
      className="card w-full max-w-md flex-col items-center justify-center overflow-hidden rounded-lg bg-white shadow-md shadow-zinc-600 transition-all duration-500 hover:cursor-pointer hover:shadow-lg md:w-1/3 lg:w-1/4 xl:max-w-100 dark:bg-dark-950 dark:shadow-dark-900"
    >
      <div className="group relative h-60 w-full max-sm:h-40">
        <CardMenu onDeleteProject={onDeleteProject} project={project} />

        <div className="max-w-md overflow-hidden rounded-lg">
          {!imageLoaded && <CustomCardSkeleton />}
          {image_url && (
            <img
              data-loaded={imageLoaded}
              src={image_url}
              alt=""
              className="relative h-full min-h-60 w-full overflow-hidden rounded-lg object-cover transition-transform delay-200 duration-500 group-hover:scale-125 data-[loaded=false]:hidden"
              onLoad={handleImageLoadEnd}
            />
          )}
        </div>

        {/* dark filter */}
        <div className="absolute top-0 left-0 h-full w-full max-w-md rounded-lg bg-black opacity-50"></div>

        <div className="absolute top-0 left-0 flex h-full w-full max-w-md flex-col items-start justify-end gap-2 p-4 text-white">
          <div className="flex w-full justify-between">
            <span className="text-lg whitespace-nowrap font-bold">{name}</span>
            {city && state && (
              <span className="text-sm text-right">
                {city} | {state}
              </span>
            )}
          </div>
          <p className="text-xs">{description}</p>
          {/* <div className='flex w-full justify-between'>
            {users && (
              <span className='text-md'>
                {users} {t('common.users', { count: users })}
              </span>
            )}
          </div> */}
        </div>
      </div>
    </div>
  );
};

export const CustomCardSkeleton = () => {
  return (
    <div className="relative h-60 w-full max-sm:h-40">
      <div className="h-full w-full animate-pulse rounded-lg bg-gray-300"></div>
      <div className="absolute top-0 left-0 h-full w-full rounded-lg bg-black opacity-50"></div>
    </div>
  );
};

export default CustomCard;
