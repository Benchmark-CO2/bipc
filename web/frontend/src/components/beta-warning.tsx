import { FlaskConical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { useState } from "react";
import { Button } from "./ui/button";

export const BetaWarning = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-[500px] bg-primary p-10 border-none"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl text-center text-accent flex items-center gap-2 justify-center">
              <FlaskConical />
              Em Beta
            </DialogTitle>
            <DialogDescription className="text-center pt-4 text-accent/100">
              <p className="text-md mb-1">
                A plataforma segue em desenvolvimento e recebe melhorias
                constantes.
              </p>
              <p className="text-md ">
                Tem alguma sugestão de melhoria? Envie um e-mail para:{" "}
                <a
                  href="mailto:contato@bipc.org.br"
                  className="font-bold hover:underline"
                >
                  contato@bipc.org.br
                </a>
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-col gap-3 mt-4">
            <Button
              variant="bipc"
              size="lg"
              className="w-full"
              onClick={() => setOpen(false)}
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div
        className="bg-primary text-white p-2 px-4 rounded-lg mx-auto flex items-center w-full hover:bg-primary/90 cursor-pointer border border-primary/50"
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-2">
          <FlaskConical size={16} />
          <strong>Em beta</strong>
        </span>
        <span className="text-sm ml-auto cursor-pointer">Saiba mais...</span>
      </div>
    </>
  );
};
