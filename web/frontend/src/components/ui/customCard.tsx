import { IProject } from "@/types/projects";
import { Edit } from "lucide-react";
import React, { useState } from "react";
// import { useTranslation } from "react-i18next";
import ModalConfirmDelete from "../layout/modal-confirm-delete";
import { DrawerFormProject } from "../layout";

interface CustomCardProps {
  project: IProject;
  onClick: () => void;
}
const CustomCard = ({ onClick, project }: CustomCardProps) => {
  // const { t } = useTranslation();
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
      return;
    } else if (dataType === "open-project") {
      onClick();
    }
  };

  return (
    <div
      data-action="open-project"
      onClick={handleClickCard}
      className="card w-full max-w-md flex-col items-center justify-center overflow-hidden rounded-lg bg-white shadow-md shadow-zinc-600 transition-all duration-500 hover:cursor-pointer hover:shadow-lg md:w-1/3 lg:w-1/4 xl:max-w-100 dark:bg-zinc-800 dark:shadow-zinc-900"
    >
      <div className="group relative h-60 w-full max-sm:h-40">
        <ModalConfirmDelete key={project.id} projectUUID={project.id} />
        <DrawerFormProject
          componentTrigger={
            <Edit
              size={20}
              color="#FFF"
              className="delete-project z-50 absolute right-10 top-2 hover:shadow-md"
            />
          }
          projectData={project}
        />
        <div className="max-w-md overflow-hidden rounded-lg">
          {!imageLoaded && <CustomCardSkeleton />}
          <img
            data-loaded={imageLoaded}
            src={image_url}
            alt=""
            className="relative h-full min-h-60 w-full overflow-hidden rounded-lg object-cover transition-transform delay-200 duration-500 group-hover:scale-125 data-[loaded=false]:hidden"
            onLoad={handleImageLoadEnd}
          />
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
