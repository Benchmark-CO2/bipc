import ModalSimple from "./modal-simple";
import { useMutation } from "@tanstack/react-query";
import { postActivationUser } from "@/actions/users/postActivationUser";
import { useAuth } from "@/hooks/useAuth";
import { useState } from "react";
import { toast } from "sonner";

const UserActiveWarning = () => {
  const auth = useAuth();
  const [message, setMessage] = useState(
    "Confirme abaixo para ativar sua conta. Você receberá um e-mail com o link de ativação.",
  );
  const [emailSent, setEmailSent] = useState(false);

  const { isPending, mutate } = useMutation({
    mutationFn: postActivationUser,
    onError: (error) => {
      toast.error(
        "Erro ao enviar o e-mail de ativação. Tente novamente mais tarde.",
        {
          description:
            error instanceof Error ? error.message : "Erro desconhecido",
        },
      );
      setEmailSent(false);
    },
    onSuccess() {
      setMessage(
        "E-mail de ativação enviado com sucesso. Verifique sua caixa de entrada.",
      );
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
    setMessage(
      "Confirme abaixo para ativar sua conta. Você receberá um e-mail com o link de ativação.",
    );
    setEmailSent(false);
  };

  return (
    <div className="w-full p-2 bg-amber-500 text-white border mb-4">
      <p className="text-sm">
        <strong>Usuário não ativo - </strong>
        Verifique seu e-mail para continuar usando o sistema. Se já ativou, faça
        login novamente. Se não recebeu, confira sua caixa de spam ou{" "}
        <ModalSimple
          title="Usuário não ativo"
          componentTrigger={
            <button className="underline hover:no-underline hover:font-bold font-medium">
              solicite um novo acesso.
            </button>
          }
          content={
            isPending && !emailSent ? "Enviando e-mail de ativação..." : message
          }
          onConfirm={!isPending && !emailSent ? handleActivation : undefined}
          confirmTitle="Enviar E-mail"
          onClose={handleModalClose}
        />
      </p>
    </div>
  );
};

export default UserActiveWarning;
