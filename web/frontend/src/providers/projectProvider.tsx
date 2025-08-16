import Summary from "@/components/ui/summary";
import { AuthContext } from "@/context/authContext";
import { ProjectContext, PropsByVariants, SummaryVariants } from "@/context/projectContext";
import { TUser } from "@/types/user";
import { useEffect, useState } from "react";

export const storageUserKey = "tanstack.auth.user";
export const storageTokenKey = "tanstack.auth.token";


export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [type, setType] = useState<SummaryVariants>('projects');
  const [projectData, setProjectData] = useState<any>({
    id: 1,
    name: 'project name',
    description: 'project description',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [projectSummary, setProjectSummary] = useState<any>(null);
  const [moduleData, setModuleData] = useState<any>(null);

  const [projects, setProjects] = useState<PropsByVariants['projects']['states']['projects']>([]);
  const [units, setUnits] = useState<PropsByVariants['units']['states']['units']>([]);
  const [layers, setLayers] = useState<PropsByVariants['layers']['states']['layers']>([]);

  const handleChangeType = (newType: SummaryVariants) => {
    setType(newType);
  };

  const inferActions = (): PropsByVariants[SummaryVariants]['actions'] => {
  switch (type) {
    case 'projects':
      return {
        setProjects,
        addProject: (project) => setProjects(prev => [...prev, project]),
        deleteProject: (projectId) => setProjects(prev => prev.filter(p => p.id !== projectId)),
      };
    case 'units':
      return {
        setUnits,
        addUnit: (unit) => setUnits(prev => [...prev, unit]),
        deleteUnit: (unitId) => setUnits(prev => prev.filter(u => u.id !== unitId)),
      };
    case 'layers':
      return {
        setLayers,
        addLayer: (layer) => setLayers(prev => [...prev, layer]),
        deleteLayer: (layerId) => setLayers(prev => prev.filter(l => l.id !== layerId)),
      };
    default:
      throw new Error(`Unknown type: ${type}`);
  }
};
const inferState = (): PropsByVariants[SummaryVariants]['states'] => {
  switch (type) {
    case 'projects':
      return { projects };
    case 'units':
      return { units };
    case 'layers':
      return { layers };
    default:
      throw new Error(`Unknown type: ${type}`);
  }
};

  console.log('ProjectProvider', {
    type,
    inferActions: inferActions(),
    inferState: inferState(),
  });

  return (
    <ProjectContext.Provider
      value={{
        type,
        setType: handleChangeType,
        props: {
          actions: inferActions(),
          states: inferState(),
        },
      } as ProjectContext}
    >
      {children}
    </ProjectContext.Provider>
  );
}
