import type { TProjectPhase } from "@/types/projects";

// Note: These are now available in i18n translations as t.phase.*
// Kept here for backwards compatibility
export const phaseLabels: Record<TProjectPhase, string> = {
  preliminary_study: "Estudo Preliminar",
  not_defined: "Não Definido",
  basic_project: "Projeto Básico",
  executive_project: "Projeto Executivo",
  released_for_construction: "Liberado para Obra",
  as_built: "Como Construído (As Built)",
};

export const phaseColors: Record<TProjectPhase, string> = {
  preliminary_study: "bg-phase-preliminary-study/90",
  not_defined: "bg-phase-not-defined/90",
  basic_project: "bg-phase-basic-project/90",
  executive_project: "bg-phase-executive-project/90",
  released_for_construction: "bg-phase-released-for-construction/90",
  as_built: "bg-phase-as-built/90",
};
