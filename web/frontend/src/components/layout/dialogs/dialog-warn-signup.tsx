import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { TriangleAlert } from "lucide-react";
import { useTranslation } from "react-i18next";

interface DialogSuccessSignupProps {
  handleClose: () => void;
  handleConfirm: () => void;
}
export const DialogWarnSignup = ({
  handleClose,
  handleConfirm,
}: DialogSuccessSignupProps) => {
  const { t } = useTranslation();
  return (
    <Dialog onOpenChange={handleClose} open={true}>
      <DialogContent>
        <DialogTitle className="flex items-end gap-4">
          <TriangleAlert className="fill-amber-300" /> Atenção{" "}
        </DialogTitle>
        <DialogDescription>
          <div className="my-8">
            <p className="text-base text-muted-foreground">
              Os dados dos empreendimentos de construção são utilizados apenas
              de forma anonimizada e agregada, sem permitir a identificação
              individual. Mesmo após a exclusão da conta, esses dados poderão
              ser mantidos exclusivamente para fins estatísticos e de modelagem,
              enquanto os dados pessoais do usuário serão eliminados.
            </p>
          </div>
        </DialogDescription>

        <div className="flex justify-end max-md:flex-col-reverse">
          <Button onClick={handleClose} className="mt-6 " variant="ghost">
            <span className="text-sm">Cancelar</span>
          </Button>
          <Button
            onClick={handleConfirm}
            className="mt-6  md:ml-4"
            variant="bipc"
          >
            <span className="text-sm">Confirmar</span>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
