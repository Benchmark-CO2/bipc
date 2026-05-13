import ModalSimple from "./modal-simple";
import { useMutation } from "@tanstack/react-query";
import { postActivationUser } from "@/actions/users/postActivationUser";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";
import { useTranslation } from "@/i18n";

const UserActiveWarning = () => {
  const auth = useAuth();
  const { t } = useTranslation();
  const [message, setMessage] = useState(t.user.activation.modalMessage);
  const [emailSent, setEmailSent] = useState(false);

  const { isPending, mutate } = useMutation({
    mutationFn: postActivationUser,
    onError: (error) => {
      toast.error(t.user.activation.emailSentError, {
        description:
          error instanceof Error ? error.message : t.common.unknownError,
      });
      setEmailSent(false);
    },
    onSuccess() {
      setMessage(t.user.activation.emailSentSuccess);
      setEmailSent(true);
    },
  });

  const handleActivation = () => {
    setEmailSent(false);
    if (auth?.email) {
      mutate(auth.email);
    } else {
      toast.error("No e-mail");
    }
  };

  const handleModalClose = () => {
    setMessage(t.user.activation.modalMessage);
    setEmailSent(false);
  };

  return (
    <div className="w-full p-2 bg-amber-500 text-white border mb-4">
      <p className="text-sm">
        <strong>{t.user.activation.title} - </strong>
        {t.user.activation.description}{" "}
        <ModalSimple
          title={t.user.activation.title}
          componentTrigger={
            <button className="underline hover:no-underline hover:font-bold font-medium">
              {t.user.activation.button}
            </button>
          }
          content={
            isPending && !emailSent
              ? t.user.activation.emailSentPending
              : message
          }
          onConfirm={!isPending && !emailSent ? handleActivation : undefined}
          confirmTitle={t.user.activation.sendEmail}
          onClose={handleModalClose}
        />
      </p>
    </div>
  );
};

export default UserActiveWarning;
