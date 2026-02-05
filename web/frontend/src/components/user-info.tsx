import { User, Mail, Calendar, Edit, Trash2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";
import { Button } from "@/components/ui/button";
import DrawerFormUser from "@/components/layout/drawer-form-user";
import DialogDeleteUser from "@/components/layout/dialog-delete-user";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { deleteUser } from "@/actions/users/deleteUser";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { Separator } from "@/components/ui/separator";

export function UserInfo() {
  const { user, logout } = useAuth();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { t } = useTranslation();
  const navigate = useNavigate();

  // Extrai os dados do usuário corretamente (pode estar aninhado)
  const userData = (user as any)?.user || user;

  const { isPending: isDeletePending, mutate: mutateDelete } = useMutation({
    mutationFn: deleteUser,
    onError: (error: any) => {
      if (error.response?.status === 403) {
        toast.error("Não é possível excluir a conta", {
          description:
            "Você possui projetos ativos. Exclua ou transfira todos os projetos antes de excluir sua conta.",
          duration: 7000,
        });
      } else {
        toast.error("Erro ao excluir conta", {
          description:
            error.message ||
            "Não foi possível excluir a conta. Tente novamente.",
          duration: 5000,
        });
      }
      setDeleteDialogOpen(false);
    },
    onSuccess: () => {
      toast.success("Conta excluída com sucesso", {
        description: "Sua conta foi removida permanentemente.",
        duration: 5000,
      });
      logout();
      navigate({ to: "/login" });
    },
  });

  const handleDeleteAccount = () => {
    mutateDelete();
  };

  if (!userData) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User size={20} />
          {t("settings.userInfo.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User Header with Avatar */}
        <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border">
          <UserAvatar
            name={userData?.name || "Usuário"}
            email={userData?.email || ""}
            size="lg"
          />
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{userData.name}</h3>
            <p className="text-sm text-muted-foreground">{userData.email}</p>
            {userData.activated && (
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                  {t("settings.userInfo.accountActivated")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* User Details */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Mail size={16} className="text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {t("settings.userInfo.email")}
              </p>
              <p className="text-sm text-muted-foreground">{userData.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Calendar size={16} className="text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {t("settings.userInfo.memberSince")}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDate(userData.created_at)}
              </p>
            </div>
          </div>
        </div>

        {/* Account Actions */}
        <Separator className="my-4" />
        <div className="space-y-3">
          <p className="text-sm font-medium text-muted-foreground">
            Gerenciamento de Conta
          </p>
          <div className="flex gap-3 flex-wrap">
            <DrawerFormUser
              componentTrigger={
                <Button variant="outline" className="flex-1 min-w-[200px]">
                  <Edit className="mr-2 h-4 w-4" />
                  Editar Dados
                </Button>
              }
            />
            <Button
              variant="outline"
              className="flex-1 min-w-[200px] text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-950/20 border-red-200 dark:border-red-800"
              onClick={() => setDeleteDialogOpen(true)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir Conta
            </Button>
          </div>
        </div>
      </CardContent>

      <DialogDeleteUser
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteAccount}
        isPending={isDeletePending}
      />
    </Card>
  );
}
