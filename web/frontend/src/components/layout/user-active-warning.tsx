import { useTranslation } from "react-i18next";
import ModalSimple from "./modal-simple";
import { useMutation } from "@tanstack/react-query";
import { postActivationUser } from "@/actions/users/postActivationUser";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";

const UserActiveWarning = () => {
  const { t } = useTranslation();
  const auth = useAuth();
  const [message, setMessage] = useState(
    t("common.activeUserWarning.modalMessage")
  );
  const [emailSent, setEmailSent] = useState(false);

  const { isPending, mutate } = useMutation({
    mutationFn: postActivationUser,
    onError: (error) => {
      toast.error(t("common.activeUserWarning.emailSentError"), {
        description:
          error instanceof Error ? error.message : t("error.errorUnknown"),
      });
      setEmailSent(false);
    },
    onSuccess() {
      setMessage(t("common.activeUserWarning.emailSentSuccess"));
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
    setMessage(t("common.activeUserWarning.modalMessage"));
    setEmailSent(false);
  };

  return (
    <div className="w-full p-2 bg-amber-500 text-white border mb-4">
      <p className="text-sm">
        <strong>{t("common.activeUserWarning.title")} - </strong>
        {t("common.activeUserWarning.description")}{" "}
        <ModalSimple
          title={t("common.activeUserWarning.title")}
          componentTrigger={
            <button className="underline hover:no-underline hover:font-bold font-medium">
              {t("common.activeUserWarning.button")}
            </button>
          }
          content={
            isPending && !emailSent
              ? t("common.activeUserWarning.emailSentPending")
              : message
          }
          onConfirm={!isPending && !emailSent ? handleActivation : undefined}
          confirmTitle={t("common.activeUserWarning.sendEmail")}
          onClose={handleModalClose}
        />
      </p>
    </div>
  );
};

export default UserActiveWarning;
