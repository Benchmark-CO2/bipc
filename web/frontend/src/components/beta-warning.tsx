import { FlaskConical } from "lucide-react";

export const BetaWarning = () => {
  return (
    <div className="bg-primary text-white p-2 px-4 rounded-lg mx-auto">
      <div className="flex items-center gap-2 my-1">
        <FlaskConical size={16} />
        <span className="font-bold">Estamos em beta</span>
      </div>
      <p className="text-sm mb-1">
        A plataforma segue em desenvolvimento e recebe melhorias constantes.
      </p>
      <p className="text-sm ">
        Tem alguma sugestão de melhoria? Envie um e-mail para:{" "}
        <a
          href="mailto:contato@bipc.org.br"
          className="font-bold hover:underline"
        >
          contato@bipc.org.br
        </a>
      </p>
    </div>
  );
};
