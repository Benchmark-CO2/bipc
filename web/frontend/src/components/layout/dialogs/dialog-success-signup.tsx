import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";

interface DialogSuccessSignupProps {
  handleClose: () => void;
}
export const DialogSuccessSignup = ({
  handleClose,
}: DialogSuccessSignupProps) => {
  return (
    <Dialog onOpenChange={handleClose} open={true}>
      <DialogContent>
        <DialogTitle>Cadastro realizado com sucesso</DialogTitle>
        <DialogDescription>
          <div className="my-8">
            <p className="text-base text-muted-foreground">
              Um e-mail de confirmação foi enviado para o seu endereço de
              e-mail.
            </p>
          </div>
          Você pode acessar sua conta agora.
        </DialogDescription>

        <Button onClick={handleClose} className="mt-6 w-full" variant="default">
          <span className="text-sm">Ir para Login</span>
          <span className="ml-2">→</span>
        </Button>
      </DialogContent>
    </Dialog>
  );
};
