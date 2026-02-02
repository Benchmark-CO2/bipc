import { FlaskConical } from "lucide-react";

export const BetaWarning = () => {
  return (
    <div className="bg-primary text-white p-2 px-4 rounded-lg mx-auto">
      <div className="flex items-center gap-2 my-1">
        <FlaskConical size={16} />
        <span>Estamos em beta</span>
      </div>
      <p className="text-sm ">
        A plataforma segue em desenvolvimento e recebe melhorias constantes.
        Para sugestões, entre em contato pelo email:{" "}
        <strong>contato@bipc.org.br</strong>
      </p>
    </div>
  );
};
