import { TUser } from "@/types/user";
import { createContext } from "react";

export type SummaryVariants = 'projects' | 'units' | 'layers';

export type PropsByVariants = {
  projects: {
    states: {
      projects: Array<{
        id: string;
        name: string;
        pink: number;
        yellow: number;
        green: number;
      }>;
    },
    actions: {
      setProjects: (projects: Array<{ id: string; name: string; pink: number; yellow: number; green: number }>) => void;
      addProject: (project: { id: string; name: string; pink: number; yellow: number; green: number }) => void;
      deleteProject: (projectId: string) => void;
    };
  };
  units: {
    states: {
      units: Array<{
      id: string;
      name: string;
      description: string;
    }>;
  }
    actions: {
      setUnits: (units: Array<{ id: string; name: string; description: string }>) => void;
      addUnit: (unit: { id: string; name: string; description: string }) => void;
      deleteUnit: (unitId: string) => void;
    };
  };
  layers: {
    states: {
      layers: Array<{
        id: string;
        name: string;
        description: string;
      }>;
    };
    actions: {
      setLayers: (layers: Array<{ id: string; name: string; description: string }>) => void;
      addLayer: (layer: { id: string; name: string; description: string }) => void;
      deleteLayer: (layerId: string) => void;
    };
  };
};

type SummaryProps = {
  [K in SummaryVariants]: {
    type: K;
    props: PropsByVariants[K];
    setType: (type: SummaryVariants) => void;
  };
}[SummaryVariants];

export type ProjectContext = SummaryProps

export const ProjectContext = createContext<ProjectContext | null>(null);
