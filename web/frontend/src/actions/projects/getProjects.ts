import { IProject } from "@/types/projects";

export const getAllProjectsByUser = () => {
  // return api.get<{projects: IProject[]}>('/projects')
  return new Promise<{data:{projects: IProject[]}} >((resolve) => {
    resolve({data:{projects:[]} as {projects: IProject[]}})
  })
}