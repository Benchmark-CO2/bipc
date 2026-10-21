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
import { useTranslation } from "@/i18n";
import { parseApiError } from "@/utils/parseApiError";

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
  const { t } = useTranslation();

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
      toast.success(t.projects.projectTransfer.transferSuccess, {
        description: t.projects.projectTransfer.transferSuccessDescription,
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
        navigate({
          to: "/new_projects",
          search: { activationRequired: true },
        });
      }, 100);
    },
    onError: (error: unknown) => {
      toast.error(t.projects.projectTransfer.transferError, {
        description: parseApiError(error, t),
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
      toast.error(t.projects.projectTransfer.noUserSelectedError, {
        description: t.projects.projectTransfer.noUserSelectedErrorDescription,
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
            {t.projects.projectTransfer.title}
          </DialogTitle>
          <DialogDescription>
            {t.projects.projectTransfer.subtitle}{" "}
            <span className="font-semibold text-foreground">{projectName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-2">
          <div className="bg-yellow-50 dark:bg-yellow-950/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-4">
            <div className="flex gap-3">
              <div className="space-y-2 text-sm">
                <p className="font-semibold text-yellow-900 dark:text-yellow-200 flex items-end gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                  {t.projects.projectTransfer.warning.title}
                </p>
                <ul className="list-disc list-inside space-y-1 text-yellow-800 dark:text-yellow-300">
                  <li>{t.projects.projectTransfer.warning.point1}</li>
                  <li>{t.projects.projectTransfer.warning.point2}</li>
                  <li>{t.projects.projectTransfer.warning.point3}</li>
                  <li>{t.projects.projectTransfer.warning.point4}</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="new-owner">
              {t.projects.projectTransfer.newOwner}
            </Label>
            <Select
              value={selectedUserId}
              onValueChange={setSelectedUserId}
              disabled={isLoading || isPending}
            >
              <SelectTrigger id="new-owner" className="w-full">
                <SelectValue
                  placeholder={t.projects.projectTransfer.newOwnerPlaceholder}
                />
              </SelectTrigger>
              <SelectContent>
                {collaborators.length === 0 ? (
                  <SelectItem value="no-collaborators" disabled>
                    {t.projects.projectTransfer.noCollaborators}
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
                {t.projects.projectTransfer.newOwnerMessage}{" "}
                <Link
                  to={`/new_projects/${projectId}?tab=colaboradores` as string}
                  className="text-primary underline"
                  onClick={() => setOpen(false)}
                >
                  {t.projects.projectTransfer.collaboratorLink}
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
            {t.modal.cancelButton}
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
                {t.modal.loading}
                <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              </>
            ) : (
              t.common.confirm
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
