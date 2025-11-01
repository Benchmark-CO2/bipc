import { Button } from "@/components/ui/button";
import { PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import DrawerFormDisciplines from "../drawer-form-disciplines";
import { useQuery } from "@tanstack/react-query";
import { getProjectCollaborators } from "@/actions/projectCollaborators/getProjectCollaborators";
import DrawerInvite from "../drawer-invite";
import ModalConfirmDelete from "../modal-confirm-delete";
import { useAuth } from "@/hooks/useAuth";

const CollaboratorsView = ({ projectId }: { projectId: string }) => {
  const { user } = useAuth();
  const { data: collaboratorsData } = useQuery({
    queryKey: ["project-collaborators", projectId],
    queryFn: () => getProjectCollaborators(projectId),
  });

  const collaborators = collaboratorsData?.data.data?.collaborators || [];
  const roles = collaboratorsData?.data.data?.roles || [];

  // Ordenar colaboradores: Administradores primeiro
  const sortedCollaborators = [...collaborators].sort((a, b) => {
    const aIsAdmin = (a.roles as unknown as string[])?.some(
      (role) => role?.toLowerCase() === "administrador"
    );
    const bIsAdmin = (b.roles as unknown as string[])?.some(
      (role) => role?.toLowerCase() === "administrador"
    );

    if (aIsAdmin && !bIsAdmin) return -1;
    if (!aIsAdmin && bIsAdmin) return 1;
    return 0;
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg dark:border-gray-700">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-md font-semibold text-primary dark:text-gray-200">
            Disciplinas
          </h2>
          <DrawerFormDisciplines
            componentTrigger={
              <Button variant="bipc" className="text-white">
                <PlusIcon className="mr-1 h-4 w-4" />
                Nova Disciplina
              </Button>
            }
            projectId={projectId}
            projectUsers={collaborators}
          />
        </div>

        <div className="space-y-2">
          {roles.map((discipline) => (
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
              {!discipline.is_protected && (
                <div className="flex items-center gap-2">
                  <ModalConfirmDelete
                    componentTrigger={
                      <Button variant="outline-destructive" size="icon-lg">
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    }
                    title="Remover Disciplina"
                    onConfirm={() => console.log("remve")}
                  />
                  <DrawerFormDisciplines
                    componentTrigger={
                      <Button
                        variant="outline-bipc"
                        size="icon-lg"
                        className="text-primary border-primary"
                      >
                        <PencilIcon className="h-4 w-4" />
                      </Button>
                    }
                    projectId={projectId}
                    roleData={discipline}
                    projectUsers={collaborators}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg dark:border-gray-700">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-md font-semibold text-primary dark:text-gray-200">
            Todos os Colaboradores
          </h2>

          <DrawerInvite projectId={projectId} />
        </div>

        <div className="space-y-2">
          {sortedCollaborators.map((collaborator) => (
            <div
              key={collaborator.id}
              className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-primary dark:bg-secondary rounded-full flex items-center justify-center text-sm font-medium text-accent dark:text-gray-300">
                  {collaborator.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2)}
                </div>
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-gray-100">
                    {collaborator.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {collaborator.email}
                  </p>
                  {collaborator?.roles && collaborator.roles.length > 0 && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {(collaborator.roles as unknown as string[]).join(" | ")}
                    </p>
                  )}
                </div>
              </div>
              {!collaborator?.roles?.some(
                (role) => role?.toLowerCase() === "administrador"
              ) && (
                <div className="flex items-center gap-2">
                  <ModalConfirmDelete
                    componentTrigger={
                      <Button variant="outline-destructive" size="icon-lg">
                        <TrashIcon className="h-4 w-4" />
                      </Button>
                    }
                    title="Remover Colaborador"
                    onConfirm={() => console.log("remve")}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CollaboratorsView;
