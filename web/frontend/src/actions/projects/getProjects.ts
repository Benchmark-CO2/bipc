import api from "@/service/api";
import { IProject } from "@/types/projects";

export const getAllProjectsByUser = () => {
  return api.get<{ projects: IProject[] }>("/v1/projects");
};
