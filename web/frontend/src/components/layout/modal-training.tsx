import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { useEffect, useState, useRef } from "react";
import { X } from "lucide-react";
import { posLaunchFeatures } from "@/utils/posLaunchFeatures";
import { trainingModalStorage } from "@/utils/trainingModalStorage";
import { useNavigate } from "@tanstack/react-router";

interface ModalTrainingProps {
  isAuthenticated: boolean;
  minimizedSidebar?: boolean;
  hasNavigateToSignUp?: boolean;
}

const ModalTraining = ({
  isAuthenticated,
  minimizedSidebar = false,
  hasNavigateToSignUp = false,
}: ModalTrainingProps) => {
  const [open, setOpen] = useState(false);
  const [showMiniature, setShowMiniature] = useState(false);
  const shouldMinimizeOnCloseRef = useRef(true);
  const navigate = useNavigate();

  const formUrl = posLaunchFeatures.trainingModal.formUrl;

  useEffect(() => {
    const completed = trainingModalStorage.isCompleted(isAuthenticated);
    const minimized = trainingModalStorage.isMinimized(isAuthenticated);

    if (completed) {
      setOpen(false);
      setShowMiniature(false);
      return;
    }

    if (minimized) {
      setOpen(false);
      setShowMiniature(true);
      return;
    }

    // Para usuários deslogados ou logados que não completaram nem minimizaram
    // Só abre se não estiver já minimizado
    if (!showMiniature) {
      setOpen(true);
      setShowMiniature(false);
    }
  }, [isAuthenticated]);

  const onNavigateToSignUp = () => {
    if (!hasNavigateToSignUp) return;

    navigate({
      to: "/sign-up",
    })
      .then(() => null)
      .catch((err: unknown) => err);
  };

  const handleHasAccount = () => {
    // Sempre minimiza, nunca marca como completed
    handleMinimize();
    navigate({
      to: "/login",
    })
      .then(() => null)
      .catch((err: unknown) => err);
  };

  const handleAlreadyRegistered = () => {
    // Apenas minimiza, nunca marca como completed
    handleMinimize();
  };

  const handleNavigateToSignUp = () => {
    shouldMinimizeOnCloseRef.current = false;

    onNavigateToSignUp();
    setOpen(false);
  };

  const handleOpenForm = () => {
    window.open(formUrl, "_blank", "noopener,noreferrer");
  };

  const handleMinimize = () => {
    trainingModalStorage.setMinimized(isAuthenticated);
    setOpen(false);
    setShowMiniature(true);
  };

  const handleRestoreFromMiniature = () => {
    trainingModalStorage.clearMinimized(isAuthenticated);

    shouldMinimizeOnCloseRef.current = true;

    setShowMiniature(false);
    setOpen(true);
  };

  const handleDialogOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      if (shouldMinimizeOnCloseRef.current) {
        handleMinimize();
      } else {
        setOpen(false);
        shouldMinimizeOnCloseRef.current = true;
      }
    } else {
      setOpen(newOpen);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className="sm:max-w-[500px] bg-primary p-10 border-none"
          showCloseButton={false}
        >
          <button
            onClick={handleMinimize}
            className="absolute text-accent right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground"
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Close</span>
          </button>

          <DialogHeader>
            <DialogTitle className="text-2xl text-center text-accent">
              Participe da Capacitação
            </DialogTitle>
            <DialogDescription className="text-center pt-4 text-accent/100">
              {isAuthenticated ? (
                <>
                  O primeiro grupo de capacitação para a plataforma BIPc está
                  completo. Se você tem interesse em participar dos próximos
                  grupos indique aqui.
                </>
              ) : (
                <>
                  Inscreva-se para participar do treinamento para uso da
                  plataforma. O primeiro passo é criar sua conta na plataforma.
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="flex flex-col sm:flex-col gap-3 mt-4">
            {isAuthenticated ? (
              <>
                <Button
                  variant="bipc"
                  size="lg"
                  className="w-full"
                  onClick={handleOpenForm}
                >
                  Quero participar
                </Button>
                <Button
                  variant="default"
                  onClick={handleAlreadyRegistered}
                  className="mx-auto border-none shadow-none"
                >
                  Já preenchi minha inscrição
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="bipc"
                  size="lg"
                  onClick={handleNavigateToSignUp}
                  className="w-full"
                >
                  Cadastre-se na plataforma
                </Button>
                <Button
                  variant="default"
                  onClick={handleHasAccount}
                  className="mx-auto border-none shadow-none"
                >
                  Já tenho minha conta
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Miniatura fixa no canto inferior direito */}
      {!isAuthenticated && showMiniature && (
        <div
          onClick={handleRestoreFromMiniature}
          className="fixed bottom-4 right-4 z-50 cursor-pointer bg-primary text-primary-foreground rounded-lg shadow-lg p-4 hover:scale-105 transition-transform"
          title="Clique para abrir"
        >
          <div className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            <span className="font-semibold text-sm">Capacitação</span>
          </div>
        </div>
      )}

      {isAuthenticated && (
        <div
          className="bg-primary text-white p-2 px-4 rounded-lg mx-auto flex items-center w-full hover:bg-primary/90 cursor-pointer border border-primary/50"
          onClick={() => setOpen(true)}
          title="Clique para abrir"
        >
          <span className="flex items-center gap-2">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
            {!minimizedSidebar && <strong>Capacitação</strong>}
          </span>
          {!minimizedSidebar && (
            <span className="text-sm ml-auto cursor-pointer">
              Saiba mais...
            </span>
          )}
        </div>
      )}
    </>
  );
};

export default ModalTraining;
