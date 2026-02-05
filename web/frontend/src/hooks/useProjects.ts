import { getAllProjectsByUser } from "@/actions/projects/getProjects";
import {
  generateFakeCo2,
  generateFakeDens,
  generateFakeMJ,
} from "@/utils/faker";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";

export const useProjects = () => {
  const [selectedProjects, setSelectedProjects] = useState<
    Map<string, boolean>
  >(new Map());

  const { data } = useQuery({
    queryKey: ["projects"],
    queryFn: getAllProjectsByUser,
  });

  const modifiedProjects = data?.data?.projects?.map((el) => ({
    ...el,
    created_at: el.created_at.replace('Z', ''),
    co: generateFakeCo2(),
    mj: generateFakeMJ(),
    density: generateFakeDens(),
  }));

  return {
    projects: modifiedProjects || [],
    setSelectedProjects,
    selectedProjects,
  };
};
