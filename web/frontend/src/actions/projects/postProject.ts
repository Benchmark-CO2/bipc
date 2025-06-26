import api from "@/service/api";
import { IProject } from "@/types/projects";

export interface PostProjectRequest {
  number: string;
  name: string;
  cep: string;
  state: string;
  city: string;
  neighborhood: string;
  street: string;
  phase: "preliminary_study" | "draft" | "basic_project" | "executive_project" | "released_for_construction";
  description?: string | undefined;
  image_url?: string | undefined;
}
export const postProject = (projectParams: PostProjectRequest) => {
  return api.post<{ project: IProject }>("/v1/projects", projectParams);
};
