import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { transferOwnership } from "@/actions/projects/transferOwnership";
import { getProjectCollaborators } from "@/actions/projectCollaborators/getProjectCollaborators";
import { queryClient } from "@/utils/queryClient";
import { AlertTriangle, UserCheck } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

interface DialogTransferOwnershipProps {
  componentTrigger: React.ReactNode;
  projectId: string;
  projectName: string;
  preselectedUserId?: string;
}

export default function DialogTransferOwnership({
  componentTrigger,
  projectId,
  projectName,
  preselectedUserId,
}: DialogTransferOwnershipProps) {
  const [open, setOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>(
    preselectedUserId || "",
  );
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: collaboratorsData, isLoading } = useQuery({
    queryKey: ["project-collaborators", projectId],
    queryFn: () => getProjectCollaborators(projectId),
    enabled: open,
  });

  const { mutate: transferOwnershipMutation, isPending } = useMutation({
    mutationFn: () =>
      transferOwnership(projectId, { new_owner_id: selectedUserId }),
    onSuccess: async () => {
      toast.success("Propriedade transferida com sucesso!", {
        description: "Você não é mais o administrador deste empreendimento.",
        duration: 5000,
      });

      // Invalidar queries e aguardar para garantir atualização
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: ["projects"],
        }),
        queryClient.invalidateQueries({
          queryKey: ["project", projectId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["project-collaborators", projectId],
        }),
        queryClient.invalidateQueries({
          queryKey: ["project-permissions", projectId],
        }),
      ]);

      setOpen(false);

      // Aguardar um pouco antes de navegar para garantir que as queries foram atualizadas
      setTimeout(() => {
        navigate({ to: "/new_projects" });
      }, 100);
    },
    onError: (error: unknown) => {
      toast.error("Erro ao transferir propriedade", {
        description:
          error instanceof Error
            ? error.message
            : "Ocorreu um erro ao transferir a propriedade do empreendimento.",
        duration: 5000,
      });
    },
  });

  const collaborators =
    collaboratorsData?.data?.data?.collaborators?.filter((c) => {
      if (c.id === user?.id) return false;
      if (preselectedUserId) return c.id === preselectedUserId;
      return true;
    }) || [];

  const handleConfirm = () => {
    if (!selectedUserId) {
      toast.error("Selecione um colaborador", {
        description: "Você precisa selecionar um novo proprietário.",
      });
      return;
    }
    transferOwnershipMutation();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
        {componentTrigger}
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-[500px]"
        onClick={(e) => e.stopPropagation()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-primary" />
            Transferir Propriedade do Empreendimento
          </DialogTitle>
          <DialogDescription>
            Você está prestes a transferir a propriedade de{" "}
            <span className="font-semibold text-foreground">{projectName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="bg-yellow-50 dark:bg-yellow-950/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-4">
            <div className="flex gap-3">
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-yellow-900 dark:text-yellow-200 flex items-end gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                  Atenção: Esta ação é irreversível!
                </p>
                <ul className="list-disc list-inside space-y-1 text-yellow-800 dark:text-yellow-300">
                  <li>Você perderá acesso administrativo completo</li>
                  <li>
                    O novo proprietário terá controle total do empreendimento
                  </li>
                  <li>
                    Você permanecerá como colaborador sem permissões especiais
                  </li>
                  <li>
                    Apenas o novo proprietário poderá transferir novamente
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="new-owner">Novo Proprietário *</Label>
            <Select
              value={selectedUserId}
              onValueChange={setSelectedUserId}
              disabled={isLoading || isPending}
            >
              <SelectTrigger id="new-owner" className="w-full">
                <SelectValue placeholder="Selecione um colaborador..." />
              </SelectTrigger>
              <SelectContent>
                {collaborators.length === 0 ? (
                  <SelectItem value="no-collaborators" disabled>
                    Nenhum colaborador disponível
                  </SelectItem>
                ) : (
                  collaborators.map((collaborator) => (
                    <SelectItem key={collaborator.id} value={collaborator.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{collaborator.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {collaborator.email}
                        </span>
                      </div>
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            {collaborators.length === 0 && !isLoading && (
              <p className="text-sm text-muted-foreground">
                Você precisa ter pelo menos um colaborador no empreendimento
                para transferir a propriedade.{" "}
                <Link
                  to={`/new_projects/${projectId}?tab=colaboradores` as string}
                  className="text-primary underline"
                  onClick={() => setOpen(false)}
                >
                  Adicione colaboradores aqui.
                </Link>
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex-row gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={isPending}
            className="flex-1"
          >
            Cancelar
          </Button>
          <Button
            variant="bipc"
            onClick={handleConfirm}
            disabled={
              isPending || !selectedUserId || collaborators.length === 0
            }
            className="flex-1"
          >
            {isPending ? (
              <>
                Transferindo...
                <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              </>
            ) : (
              "Confirmar Transferência"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
