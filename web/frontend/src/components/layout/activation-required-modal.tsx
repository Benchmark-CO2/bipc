import { postActivationUser } from "@/actions/users/postActivationUser";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n";
import { parseApiError } from "@/utils/parseApiError";
import { useMutation } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Separator } from "../ui/separator";

interface ActivationRequiredModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ActivationRequiredModal({
  open,
  onOpenChange,
}: ActivationRequiredModalProps) {
  const auth = useAuth();
  const { t } = useTranslation();
  const [message, setMessage] = useState(t.user.activation.modalMessage);
  const [emailSent, setEmailSent] = useState(false);

  const { isPending, mutate } = useMutation({
    mutationFn: postActivationUser,
    onError: (error) => {
      toast.error(t.user.activation.emailSentError, {
        description: parseApiError(error, t),
      });
      setEmailSent(false);
    },
    onSuccess() {
      setMessage(t.user.activation.emailSentSuccess);
      setEmailSent(true);
    },
  });

  const handleActivation = () => {
    if (auth?.email) {
      mutate(auth.email);
    }
  };

  const handleLogout = () => {
    auth.logout();
    onOpenChange(false);
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setMessage(t.user.activation.modalMessage);
      setEmailSent(false);
    }
    onOpenChange(newOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="text-center">
        <DialogHeader>
          <DialogTitle className="text-center">
            {t.user.activation.title}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <p className="text-sm">
            {isPending ? t.user.activation.emailSentPending : message}
          </p>

          <Separator />

          <p className="text-sm text-muted-foreground flex items-center justify-center gap-2 flex-wrap">
            {t.user.activation.alreadyActivatedHint}
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut size={14} />
              {t.common.logout}
            </Button>
          </p>
        </div>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t.modal.cancelButton}
          </Button>
          {!emailSent && (
            <Button
              variant="bipc"
              onClick={handleActivation}
              disabled={isPending}
            >
              {t.user.activation.sendEmail}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
