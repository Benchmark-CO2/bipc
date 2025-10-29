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

interface ModalTrainingProps {
  isAuthenticated: boolean;
  onNavigateToSignUp: () => void;
}

const ModalTraining = ({
  isAuthenticated,
  onNavigateToSignUp,
}: ModalTrainingProps) => {
  const [open, setOpen] = useState(false);
  const [showMiniature, setShowMiniature] = useState(false);
  const shouldMinimizeOnCloseRef = useRef(true);

  const formUrl = posLaunchFeatures.trainingModal.formUrl;

  // Verificar se o modal deve ser exibido
  useEffect(() => {
    const completed = trainingModalStorage.isCompleted(isAuthenticated);
    const minimized = trainingModalStorage.isMinimized(isAuthenticated);

    // Debug info (remover em produção se desejar)
    if (import.meta.env.DEV) {
      console.log(
        "[TrainingModal] useEffect executado:",
        trainingModalStorage.getDebugInfo(isAuthenticated),
        { open, showMiniature }
      );
    }

    // Se o usuário já completou o processo, não mostra nada
    if (completed) {
      if (import.meta.env.DEV) {
        console.log("[TrainingModal] Usuário já completou - escondendo tudo");
      }
      setOpen(false);
      setShowMiniature(false);
      return;
    }

    // Se o usuário minimizou, mostra a miniatura
    if (minimized) {
      if (import.meta.env.DEV) {
        console.log("[TrainingModal] Modal minimizado - mostrando miniatura");
      }
      setOpen(false);
      setShowMiniature(true);
      return;
    }

    // Se não completou e não minimizou, mostra o modal
    if (import.meta.env.DEV) {
      console.log("[TrainingModal] Primeira visita - mostrando modal");
    }
    setOpen(true);
    setShowMiniature(false);
  }, [isAuthenticated]);

  const handleHasAccount = () => {
    if (import.meta.env.DEV) {
      console.log("[TrainingModal] Usuário confirmou que tem conta");
    }
    // Completar a ação no localStorage
    trainingModalStorage.setCompleted(isAuthenticated);

    // Desabilitar minimização usando ref (valor imediato, sem re-render)
    shouldMinimizeOnCloseRef.current = false;

    setOpen(false);
    setShowMiniature(false);
  };

  const handleAlreadyRegistered = () => {
    if (import.meta.env.DEV) {
      console.log("[TrainingModal] Usuário confirmou que já se inscreveu");
    }
    // Completar a ação no localStorage
    trainingModalStorage.setCompleted(isAuthenticated);

    // Desabilitar minimização usando ref (valor imediato, sem re-render)
    shouldMinimizeOnCloseRef.current = false;

    setOpen(false);
    setShowMiniature(false);
  };

  const handleNavigateToSignUp = () => {
    if (import.meta.env.DEV) {
      console.log("[TrainingModal] Navegando para sign-up");
    }
    // Desabilitar minimização usando ref (valor imediato, sem re-render)
    shouldMinimizeOnCloseRef.current = false;

    onNavigateToSignUp();
    setOpen(false);
  };

  const handleOpenForm = () => {
    window.open(formUrl, "_blank", "noopener,noreferrer");
  };

  const handleMinimize = () => {
    if (import.meta.env.DEV) {
      console.log("[TrainingModal] Minimizando modal...");
    }
    trainingModalStorage.setMinimized(isAuthenticated);
    setOpen(false);
    setShowMiniature(true);

    if (import.meta.env.DEV) {
      console.log("[TrainingModal] Estado após minimizar:", {
        open: false,
        showMiniature: true,
        storage: trainingModalStorage.getDebugInfo(isAuthenticated),
      });
    }
  };

  const handleRestoreFromMiniature = () => {
    if (import.meta.env.DEV) {
      console.log("[TrainingModal] Restaurando modal da miniatura...");
    }
    trainingModalStorage.clearMinimized(isAuthenticated);

    // Resetar o ref para garantir que minimiza novamente se fechar
    shouldMinimizeOnCloseRef.current = true;

    setShowMiniature(false);
    setOpen(true);

    if (import.meta.env.DEV) {
      console.log("[TrainingModal] Estado após restaurar:", {
        open: true,
        showMiniature: false,
        shouldMinimizeOnClose: shouldMinimizeOnCloseRef.current,
        storage: trainingModalStorage.getDebugInfo(isAuthenticated),
      });
    }
  };

  // Handler para quando o Dialog é fechado (por qualquer meio)
  const handleDialogOpenChange = (newOpen: boolean) => {
    if (import.meta.env.DEV) {
      console.log(
        "[TrainingModal] Dialog onOpenChange:",
        newOpen,
        "shouldMinimizeOnClose:",
        shouldMinimizeOnCloseRef.current
      );
    }

    if (!newOpen) {
      // Se está fechando, verifica se deve minimizar
      if (shouldMinimizeOnCloseRef.current) {
        if (import.meta.env.DEV) {
          console.log(
            "[TrainingModal] Dialog está sendo fechado - minimizando..."
          );
        }
        handleMinimize();
      } else {
        // Apenas fecha sem minimizar (usuário completou a ação)
        if (import.meta.env.DEV) {
          console.log(
            "[TrainingModal] Dialog está sendo fechado - sem minimizar (ação completada)"
          );
        }
        setOpen(false);
        // Resetar para o próximo uso
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
                  Inscreva-se para participar do treinamento para uso da
                  plataforma. Agora o passo final é se inscrever no formulário.
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
                  onClick={handleOpenForm}
                  className="w-full"
                >
                  Cadastre-se no treinamento
                </Button>
                <Button
                  variant="default"
                  onClick={handleAlreadyRegistered}
                  className="mx-auto border-none shadow-none"
                >
                  Já me inscrevi
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="default"
                  onClick={handleNavigateToSignUp}
                  className="w-full"
                >
                  Cadastre-se na plataforma
                </Button>
                <Button
                  variant="outline"
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
      {showMiniature && (
        <div
          onClick={handleRestoreFromMiniature}
          className="fixed bottom-4 right-4 z-50 cursor-pointer bg-primary text-primary-foreground rounded-lg shadow-lg p-4 hover:scale-105 transition-transform animate-pulse"
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
    </>
  );
};

export default ModalTraining;
