import { FlaskConical } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

export const DevelopmentWarning = ({ minimizedSidebar = false }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-[500px] bg-amber-600 p-10 border-none"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl text-center text-accent flex items-center gap-2 justify-center">
              <FlaskConical />
              Ambiente de Testes
            </DialogTitle>
            <DialogDescription className="text-center pt-4 text-accent/100">
              <p className="text-md mb-1">
                Esta é uma versão de testes da plataforma, onde novas funcionalidades são experimentadas antes de serem lançadas para todos os usuários.
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-col gap-3 mt-4">
            <Button
              variant="noStyles"
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
        className="bg-amber-600 text-white p-2 px-4 rounded-lg mx-auto flex items-center w-full hover:bg-amber-500/90 cursor-pointer border border-amber-500/50"
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-2">
          <FlaskConical size={16} />
          {!minimizedSidebar && <strong>Ambiente de Testes</strong>}
        </span>
      </div>
    </>
  );
};
