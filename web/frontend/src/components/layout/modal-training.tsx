import { Button } from "../ui/button";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { useEffect, useState, useRef } from "react";
import { X, SquarePlay, Play } from "lucide-react";
import { posLaunchFeatures } from "@/utils/posLaunchFeatures";
import { trainingModalStorage } from "@/utils/trainingModalStorage";
import { useNavigate } from "@tanstack/react-router";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";

interface ModalTrainingProps {
  isAuthenticated: boolean;
  minimizedSidebar?: boolean;
  disableFloating?: boolean;
  hasNavigateToSignUp?: boolean;
}

const ModalTraining = ({
  isAuthenticated,
  minimizedSidebar = false,
  disableFloating = false,
  hasNavigateToSignUp = false,
}: ModalTrainingProps) => {
  const [open, setOpen] = useState(false);
  const [showMiniature, setShowMiniature] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [dismissNextTime, setDismissNextTime] = useState(false);
  const [openedManually, setOpenedManually] = useState(false);
  const shouldMinimizeOnCloseRef = useRef(true);
  const navigate = useNavigate();
  const { t } = useTranslation();

  const formUrl = posLaunchFeatures.trainingModal.formUrl;
  const youtubeUrl = posLaunchFeatures.trainingModal.youtubeUrl;
  const youtubeVideoId = youtubeUrl.split("youtu.be/")[1]?.split("?")[0] ?? "";
  const youtubeThumbnailUrl = `https://img.youtube.com/vi/${youtubeVideoId}/hqdefault.jpg`;

  useEffect(() => {
    const completed = trainingModalStorage.isCompleted(isAuthenticated);
    const minimized = trainingModalStorage.isMinimized(isAuthenticated);
    const autoDismissed = trainingModalStorage.isAutoDismissed(isAuthenticated);

    setIsCompleted(completed);
    setDismissNextTime(autoDismissed);

    if (completed) {
      setOpen(false);
      setShowMiniature(false);
      return;
    }

    if (autoDismissed) {
      setOpen(false);
      setShowMiniature(isAuthenticated ? false : true);
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

  const handleOpenYoutube = () => {
    window.open(youtubeUrl, "_blank", "noopener,noreferrer");
  };

  const handleMinimize = () => {
    if (!isAuthenticated) {
      trainingModalStorage.setMinimized(isAuthenticated);
    }
    setOpen(false);
    setShowMiniature(true);
  };

  const handleRestoreFromMiniature = () => {
    trainingModalStorage.clearMinimized(isAuthenticated);

    shouldMinimizeOnCloseRef.current = true;
    setOpenedManually(true);

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
      setOpenedManually(false);
    } else {
      setOpen(newOpen);
    }
  };

  if (isCompleted) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className="sm:max-w-[500px] bg-primary p-6 border-none max-h-[90vh] overflow-y-auto"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl text-center text-accent">
              {t.training.title}
            </DialogTitle>
            <DialogDescription className="text-center pt-4 text-accent/100">
              {isAuthenticated ? (
                <>{t.training.descriptionAuthenticated}</>
              ) : (
                <>{t.training.descriptionUnauthenticated}</>
              )}
            </DialogDescription>
          </DialogHeader>

          <p className="mt-4 text-center text-sm text-accent/100 leading-relaxed px-2">
            {t.training.videoTrainingDescription}
          </p>

          <Button
            type="button"
            variant="ghost"
            onClick={handleOpenYoutube}
            className="mt-6 group w-full h-auto p-0 flex flex-col items-center gap-2 hover:bg-transparent"
          >
            <div className="relative w-full max-w-[400px] aspect-video rounded-lg overflow-hidden shadow-md ring-2 ring-accent/30 group-hover:ring-accent/60 transition-all">
              <img
                src={youtubeThumbnailUrl}
                alt={t.training.accessVideosOnYoutube}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).style.display = "none";
                }}
              />
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 group-hover:bg-black/50 transition-colors">
                <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-red-600 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                  <Play className="text-white size-7 ml-1" fill="white" />
                </div>
              </div>
            </div>
            <span className="text-accent hover:text-accent/80 transition-colors underline underline-offset-2 font-medium flex items-center gap-2">
              <SquarePlay className="size-5" />
              {t.training.accessVideosOnYoutube}
            </span>
          </Button>

          {!openedManually && (
            <div className="mt-6 mb-2 flex items-center justify-start gap-3 px-1">
              <Checkbox
                id="training-dismiss-next-time"
                checked={dismissNextTime}
                onCheckedChange={(checked: boolean | "indeterminate") => {
                  const next = checked === true;
                  setDismissNextTime(next);
                  if (next) {
                    trainingModalStorage.setAutoDismissed(isAuthenticated);
                  } else {
                    trainingModalStorage.clearAutoDismissed(isAuthenticated);
                  }
                }}
                className="border-2 bg-white dark:bg-dark-900 data-[state=checked]:bg-secondary data-[state=checked]:border-secondary data-[state=checked]:text-white"
              />
              <label
                htmlFor="training-dismiss-next-time"
                className="text-sm font-medium leading-relaxed cursor-pointer select-none text-accent/90 hover:text-accent"
              >
                {t.training.dismissCheckboxLabel}
              </label>
            </div>
          )}

          <DialogFooter className="flex flex-col sm:flex-col gap-3 mt-4">
            {isAuthenticated ? (
              <>
                <Button
                  variant="bipc"
                  size="lg"
                  className="w-full"
                  onClick={handleOpenForm}
                >
                  {t.training.wantToParticipate}
                </Button>
                <Button
                  variant="default"
                  onClick={
                    openedManually
                      ? () => setOpen(false)
                      : handleAlreadyRegistered
                  }
                  className="mx-auto border-none shadow-none"
                >
                  {openedManually
                    ? t.training.close
                    : t.training.alreadyRegistered}
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
                  {t.training.signUp}
                </Button>
                <Button
                  variant="default"
                  onClick={handleHasAccount}
                  className="mx-auto border-none shadow-none"
                >
                  {t.training.alreadyHaveAccount}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Miniatura fixa no canto inferior direito - apenas para usuários deslogados */}
      {!disableFloating && !isAuthenticated && showMiniature && (
        <div
          onClick={handleRestoreFromMiniature}
          className="fixed bottom-4 right-4 z-50 cursor-pointer bg-primary text-primary-foreground rounded-lg shadow-lg p-4 hover:scale-105 transition-transform"
          title={t.training.miniatureTooltip}
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
            <span className="font-semibold text-sm">
              {t.training.miniatureTitle}
            </span>
          </div>
        </div>
      )}

      {/* Item inline no sidebar - apenas para usuários logados */}
      {isAuthenticated && (
        <div
          className={cn(
            "bg-primary text-white p-2 px-4 rounded-lg mx-auto flex items-center w-full hover:bg-primary/90 cursor-pointer border border-primary/50",
            {
              "px-0 justify-center": minimizedSidebar,
            },
          )}
          onClick={() => {
            setOpenedManually(true);
            setOpen(true);
          }}
          title={t.training.miniatureTooltip}
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
            {!minimizedSidebar && <strong>{t.training.miniatureTitle}</strong>}
          </span>
          {!minimizedSidebar && (
            <span className="text-sm ml-auto cursor-pointer">
              {t.training.learnMore}
            </span>
          )}
        </div>
      )}
    </>
  );
};

export default ModalTraining;
