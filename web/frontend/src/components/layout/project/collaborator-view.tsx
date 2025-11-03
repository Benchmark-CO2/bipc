import { Button } from "@/components/ui/button";
import { PencilIcon, PlusIcon, TrashIcon } from "lucide-react";
import DrawerFormDisciplines from "../drawer-form-disciplines";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getProjectCollaborators } from "@/actions/projectCollaborators/getProjectCollaborators";
import DrawerInvite from "../drawer-invite";
import ModalConfirmDelete from "../modal-confirm-delete";
import { deleteProjectCollaborator } from "@/actions/projectCollaborators/deleteProjectCollaborator";
import { deleteDiscipline } from "@/actions/disciplines/deleteDiscipline";
import { toast } from "sonner";
import { queryClient } from "@/utils/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "@tanstack/react-router";
import { useProjectPermissions } from "@/hooks/useProjectPermissions";
import { getProjectInvites } from "@/actions/invites/getProjectInvites";
import { deleteProjectInvite } from "@/actions/invites/deleteProjectInvite";

const CollaboratorsView = ({ projectId }: { projectId: string }) => {
  const { email } = useAuth();
  const { hasPermission } = useProjectPermissions(projectId);
  const navigate = useNavigate();

  const { data: collaboratorsData, isLoading } = useQuery({
    queryKey: ["project-collaborators", projectId],
    queryFn: () => getProjectCollaborators(projectId),
    staleTime: 0,
    refetchOnMount: true,
  });

  const { data: projectInvites } = useQuery({
    queryKey: ["project-invites", projectId],
    queryFn: async () => {
      const response = await getProjectInvites(projectId);
      return response.data.invitations;
    },
  });

  const {
    mutate: mutateDeleteCollaborator,
    isPending: isDeletingCollaborator,
  } = useMutation({
    mutationFn: (collaboratorId: string) =>
      deleteProjectCollaborator(projectId, collaboratorId),
    onSuccess: (_, collaboratorId) => {
      const deletedCollaborator = collaborators.find(
        (c) => c.id === collaboratorId
      );

      toast.success("Colaborador removido com sucesso", {
        duration: 5000,
      });
      queryClient.invalidateQueries({
        queryKey: ["project-collaborators", projectId],
      });

      if (deletedCollaborator?.email === email) {
        navigate({ to: "/new_projects" });
      }
    },
    onError: (error) => {
      toast.error("Erro ao remover colaborador", {
        description: error.message || "Erro desconhecido",
        duration: 5000,
      });
    },
  });

  const { mutate: mutateDeleteDiscipline, isPending: isDeletingDiscipline } =
    useMutation({
      mutationFn: (disciplineId: string) =>
        deleteDiscipline(projectId, disciplineId),
      onSuccess: () => {
        toast.success("Disciplina removida com sucesso", {
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
        toast.error("Erro ao remover disciplina", {
          description: error.message || "Erro desconhecido",
          duration: 5000,
        });
      },
    });

  const { mutate: mutateDeleteInvite, isPending: isDeletingInvite } =
    useMutation({
      mutationFn: (inviteId: string) =>
        deleteProjectInvite(projectId, inviteId),
      onSuccess: () => {
        toast.success("Convite removido com sucesso", {
          duration: 5000,
        });
        queryClient.invalidateQueries({
          queryKey: ["project-invites", projectId],
        });
      },
      onError: (error) => {
        toast.error("Erro ao remover convite", {
          description: error.message || "Erro desconhecido",
          duration: 5000,
        });
      },
    });

  const collaborators = collaboratorsData?.data?.data?.collaborators || [];
  const roles = collaboratorsData?.data?.data?.roles || [];

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
          <h2 className="text-md font-semibold text-primary dark:text-gray-200">
            Disciplinas
          </h2>
          {hasPermission("create:role") && (
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
          )}
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
                        <Button variant="outline-destructive" size="icon-lg">
                          {isDeletingDiscipline ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-1 border-secondary border-t-transparent" />
                          ) : (
                            <TrashIcon className="h-4 w-4" />
                          )}
                        </Button>
                      }
                      title="Remover Disciplina"
                      onConfirm={() => mutateDeleteDiscipline(discipline.id)}
                    />
                  )}
                  {hasPermission("update:role") && (
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
                  )}
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

          {hasPermission("create:invite") && (
            <DrawerInvite projectId={projectId} />
          )}
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
              ) &&
                hasPermission("delete:collaborator") && (
                  <div className="flex items-center gap-2">
                    <ModalConfirmDelete
                      componentTrigger={
                        <Button variant="outline-destructive" size="icon-lg">
                          {isDeletingCollaborator ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-1 border-secondary border-t-transparent" />
                          ) : (
                            <TrashIcon className="h-4 w-4" />
                          )}
                        </Button>
                      }
                      title="Remover Colaborador"
                      onConfirm={() =>
                        mutateDeleteCollaborator(collaborator.id)
                      }
                    />
                  </div>
                )}
            </div>
          ))}
        </div>
      </div>

      {projectInvites && projectInvites.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg dark:border-gray-700">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-md font-semibold text-primary dark:text-gray-200">
              Convites Pendentes
            </h2>
            <span className="text-sm text-gray-500 dark:text-gray-400">
              {projectInvites.length}{" "}
              {projectInvites.length === 1 ? "convite" : "convites"}
            </span>
          </div>

          <div className="space-y-2">
            {projectInvites.map((invite) => (
              <div
                key={invite.id}
                className="flex items-center justify-between p-4 border border-yellow-200 dark:border-yellow-600 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-yellow-200 dark:bg-yellow-600 rounded-full flex items-center justify-center text-sm font-medium text-yellow-700 dark:text-yellow-300">
                    {invite.email.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                      {invite.email}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Enviado em{" "}
                      {new Date(invite.created_at).toLocaleDateString("pt-BR")}
                    </p>
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      Expira em{" "}
                      {new Date(invite.expires_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 text-xs font-medium bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 rounded-full">
                    Pendente
                  </span>
                  {hasPermission("delete:invite") && (
                    <ModalConfirmDelete
                      componentTrigger={
                        <Button variant="outline-destructive" size="icon-lg">
                          {isDeletingInvite ? (
                            <div className="h-4 w-4 animate-spin rounded-full border-1 border-secondary border-t-transparent" />
                          ) : (
                            <TrashIcon className="h-4 w-4" />
                          )}
                        </Button>
                      }
                      title="Remover Convite"
                      onConfirm={() => mutateDeleteInvite(invite.id)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CollaboratorsView;
