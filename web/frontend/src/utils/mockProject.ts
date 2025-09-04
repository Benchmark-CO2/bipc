import { IProject } from "@/types/projects";

export const mockProject: IProject = {
  id: "4",
  name: "Projeto 1",
  description: "Descrição do projeto 1",
  state: "SP",
  city: "São Paulo",
  cep: "01234-567",
  neighborhood: "Bairro Exemplo",
  street: "Rua Exemplo",
  number: "100",
  phase: "not_defined",
  user_id: 1,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  units: [
    {
      id: "1",
      name: "Unidade 1",
      type: "tower",
    },
    {
      id: "2",
      name: "Unidade 2",
      type: "tower",
    },
  ],
};
