import { Button } from "@/components/ui/button";
import { PencilIcon, TrashIcon } from "lucide-react";
const collaborators = [
  {
    id: "1",
    name: "Mariana Costa de Andrade",
    role: "Arquitetura | Coordenação",
    email: "marianaca@construtora.com",
    status: "Ativo",
  },
  {
    id: "2",
    name: "Felipe Nogueira Bastos",
    role: "Estrutura",
    email: "felipehb@construtora.com",
    status: "Ativo",
  },
  {
    id: "3",
    name: "Camila Rocha Tavares",
    role: "Vedação",
    email: "camilart@construtora.com",
    status: "Ativo",
  },
];

const disciplines = [
  { id: "1", name: "Administração", status: "Ativo" },
  { id: "2", name: "Arquitetura", status: "Ativo" },
  { id: "3", name: "Estrutura", status: "Ativo" },
  { id: "4", name: "Fundações", status: "Não ativo" },
];

const CollaboratorsView = ({ projectId }: { projectId: string }) => {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-md font-semibold text-primary dark:text-gray-200">
            Disciplinas
          </h2>
          <Button variant="secondary" size="lg" className="text-white">
            Nova Disciplina
          </Button>
        </div>

        <div className="space-y-2">
          {disciplines.map((discipline) => (
            <div
              key={discipline.id}
              className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-sm font-medium text-gray-700 dark:text-gray-300">
                  {discipline.name.slice(0, 2)}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {discipline.name}
                  </h3>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  Remover
                  <TrashIcon className="ml-1 h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-secondary">
                  Editar
                  <PencilIcon className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-md font-semibold text-primary dark:text-gray-200">
            Todos os Colaboradores
          </h2>
          <Button variant="secondary" size="lg" className="text-white">
            Novo colaborador
          </Button>
        </div>

        <div className="space-y-2">
          {collaborators.map((collaborator) => (
            <div
              key={collaborator.id}
              className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-sm font-medium text-gray-700 dark:text-gray-300">
                  {collaborator.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {collaborator.name}
                    <span className="ml-2 text-sm text-green-600 dark:text-green-400">
                      ({collaborator.status})
                    </span>
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {collaborator.role}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {collaborator.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  Remover
                  <TrashIcon className="ml-1 h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" className="text-secondary">
                  Editar
                  <PencilIcon className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CollaboratorsView;
