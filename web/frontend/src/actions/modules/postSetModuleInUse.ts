export const postSetModuleInUse = (newVersion: { version: number; type: string }, projectId: string, unitId: string, moduleId: string) => {
  return api.post(`/v1/projects/${projectId}/units/${unitId}/modules/${moduleId}/set-in-use`, newVersion);
}