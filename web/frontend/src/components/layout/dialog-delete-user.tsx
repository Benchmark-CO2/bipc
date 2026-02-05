import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface DialogDeleteUserProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
}

export default function DialogDeleteUser({
  open,
  onClose,
  onConfirm,
  isPending,
}: DialogDeleteUserProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle className="text-2xl">
              Excluir Conta Permanentemente
            </DialogTitle>
          </div>
          <DialogDescription className="space-y-4 text-base">
            <div className="p-4 bg-red-50 dark:bg-red-950/20 rounded-lg border-2 border-red-200 dark:border-red-800">
              <p className="font-semibold text-red-900 dark:text-red-100 mb-2">
                ⚠️ Esta ação é irreversível!
              </p>
              <p className="text-red-800 dark:text-red-200">
                Ao excluir sua conta, todos os seus dados serão removidos
                permanentemente de nossos sistemas e não poderão ser
                recuperados.
              </p>
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-foreground">
                Antes de prosseguir, certifique-se de:
              </p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
                <li>
                  Ter excluído ou transferido todos os seus projetos para outros
                  usuários
                </li>
                <li>
                  Ter salvo todos os dados importantes que você possa precisar
                  no futuro
                </li>
                <li>
                  Ter certeza de que deseja encerrar permanentemente sua conta
                </li>
              </ul>
            </div>

            <div className="p-4 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm text-yellow-900 dark:text-yellow-100">
                <strong>Nota importante:</strong> Se você possui projetos
                ativos, não será possível excluir sua conta. Você deve primeiro
                excluir ou transferir todos os projetos para outros usuários.
              </p>
            </div>

            <p className="text-foreground font-medium">
              Tem certeza de que deseja continuar com a exclusão da conta?
            </p>
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700 focus:ring-red-600 dark:bg-red-600 dark:hover:bg-red-700"
          >
            {isPending ? "Excluindo..." : "Sim, Excluir Minha Conta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
