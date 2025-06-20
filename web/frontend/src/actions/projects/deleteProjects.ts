import api from "@/service/api";


export const deleteProject = (projectId: string) => {
  return api.delete(`/projects/${projectId}`)
}