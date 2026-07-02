import { Button } from "@/components/ui/button";
import { PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import DrawerFormDisciplines from "../drawer-form-disciplines";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getProjectCollaborators } from "@/actions/projectCollaborators/getProjectCollaborators";
import ModalConfirmDelete from "../modal-confirm-delete";
import { deleteDiscipline } from "@/actions/disciplines/deleteDiscipline";
import { toast } from "sonner";
import { queryClient } from "@/utils/queryClient";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { useTranslation } from "@/i18n";
import { parseApiError } from "@/utils/parseApiError";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";

const DisciplinesView = ({ projectId }: { projectId: string }) => {
  const { hasPermission } = useProjectPermissions(projectId);
  const { t } = useTranslation();

  const { data: collaboratorsData, isLoading } = useQuery({
    queryKey: ["project-collaborators", projectId],
    queryFn: () => getProjectCollaborators(projectId),
    staleTime: 0,
    refetchOnMount: true,
  });

  const { mutate: mutateDeleteDiscipline, isPending: isDeletingDiscipline } =
    useMutation({
      mutationFn: (disciplineId: string) =>
        deleteDiscipline(projectId, disciplineId),
      onSuccess: () => {
        toast.success(t.collaboratorsView.successRemoveDiscipline, {
          duration: 5000,
        });
        queryClient.invalidateQueries({
          queryKey: ["project-collaborators", projectId],
        });
        queryClient.invalidateQueries({
          queryKey: ["project-permissions", projectId],
        });
      },
      onError: (error) => {
        toast.error(t.collaboratorsView.errorRemoveDiscipline, {
          description: parseApiError(error, t),
          duration: 5000,
        });
      },
    });

  const collaborators = collaboratorsData?.data?.data?.collaborators || [];
  const roles = collaboratorsData?.data?.data?.roles || [];
  const rolesNames = roles.filter((r) => !r.is_protected).map((r) => r.name);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg dark:border-gray-700">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-h2 text-primary dark:text-gray-200">
            {t.collaboratorsView.disciplines}
          </h2>
          {hasPermission("create:role") && (
            <DrawerFormDisciplines
              componentTrigger={
                <Button variant="bipc" className="text-white">
                  <PlusIcon className="mr-1 h-4 w-4" />
                  {t.collaboratorsView.newDiscipline}
                </Button>
              }
              projectId={projectId}
              projectUsers={collaborators}
              roles={rolesNames}
            />
          )}
        </div>

        <div className="space-y-2">
          {roles.map((discipline) => (
            <div
              key={discipline.id}
              className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg"
            >
              <div className="flex items-center gap-4">
                <div
                  className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex items-center justify-center text-sm font-medium text-gray-700 dark:text-gray-300"
                  aria-label={discipline.name}
                >
                  {discipline.name.slice(0, 2)}
                </div>
                <div>
                  <h3 className="text-h3 text-primary dark:text-gray-100">
                    {discipline.name}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {discipline.description || ""}
                  </p>
                </div>
              </div>
              {!discipline.is_protected && (
                <div className="flex items-center gap-2">
                  {hasPermission("delete:role") && (
                    <ModalConfirmDelete
                      componentTrigger={
                        <SimpleTooltip
                          content={t.disciplines.deleteDiscipline}
                          side="bottom"
                        >
                          <Button
                            variant="outline-destructive"
                            size="icon-lg"
                            aria-label={`${t.disciplines.deleteDiscipline} ${discipline.name}`}
                          >
                            {isDeletingDiscipline ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-1 border-secondary border-t-transparent" />
                            ) : (
                              <TrashIcon className="h-4 w-4" />
                            )}
                          </Button>
                        </SimpleTooltip>
                      }
                      title={t.collaboratorsView.removeDiscipline}
                      onConfirm={() => mutateDeleteDiscipline(discipline.id)}
                    />
                  )}
                  {hasPermission("update:role") && (
                    <DrawerFormDisciplines
                      componentTrigger={
                        <SimpleTooltip
                          content={t.disciplines.editDiscipline}
                          side="bottom"
                        >
                          <Button
                            variant="outline-bipc"
                            size="icon-lg"
                            className="text-primary border-primary"
                            aria-label={`Editar disciplina ${discipline.name}`}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </Button>
                        </SimpleTooltip>
                      }
                      projectId={projectId}
                      roleData={discipline}
                      projectUsers={collaborators}
                      roles={rolesNames}
                    />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DisciplinesView;
