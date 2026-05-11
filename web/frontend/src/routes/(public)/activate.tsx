import { putActivateUser } from "@/actions/users/putActivateUser";
import FullLogo from "@/assets/logo_full.svg";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Divider from "@/components/ui/divider";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import { useMutation } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { CheckCircle, Loader2, Mail, XCircle } from "lucide-react";

type ActivateSearch = {
  tkn?: string;
};

export const Route = createFileRoute("/(public)/activate")({
  component: RouteComponent,
  validateSearch: (search: Record<string, unknown>): ActivateSearch => {
    return {
      tkn: typeof search.tkn === "string" ? search.tkn : undefined,
    };
  },
});

function RouteComponent() {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { tkn: token } = useSearch({ from: "/(public)/activate" });

  const activationMutation = useMutation({
    mutationFn: putActivateUser,
  });

  const handleActivateAccount = () => {
    if (!token) return;
    activationMutation.mutate(token);
  };

  const handleNavigateToLogin = () => {
    navigate({ to: "/login" });
  };

  const handleTryAgain = () => {
    activationMutation.reset();
  };

  if (!token) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center transition-all overflow-auto bg-sidebar",
          {
            block: isMobile,
          },
        )}
      >
        <Card className="w-full max-w-md rounded-md">
          <CardHeader className="text-center">
            <div>
              <img src={FullLogo} alt="" className="w-full mx-auto mb-2" />
            </div>
            <Divider className="bg-accent-foreground/10" />
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl">Link Inválido</CardTitle>
            <CardDescription>
              O link de ativação é inválido ou expirou. Solicite um novo e-mail
              de confirmação.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button
              variant="outline"
              onClick={handleNavigateToLogin}
              className="w-full"
            >
              Voltar ao Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (activationMutation.isSuccess) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center transition-all overflow-auto bg-sidebar",
          {
            block: isMobile,
          },
        )}
      >
        <Card className="w-full max-w-md rounded-md">
          <CardHeader className="text-center">
            <div>
              <img src={FullLogo} alt="" className="w-full mx-auto mb-2" />
            </div>
            <Divider className="bg-accent-foreground/10" />
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-xl">Conta Ativada!</CardTitle>
            <CardDescription>
              Sua conta foi ativada com sucesso. Agora você pode fazer login e
              começar a usar nossa plataforma.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button
              onClick={handleNavigateToLogin}
              variant="bipc"
              className="w-full"
            >
              Fazer Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (activationMutation.isError) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center transition-all overflow-auto bg-sidebar",
          {
            block: isMobile,
          },
        )}
      >
        <Card className="w-full max-w-md rounded-md">
          <CardHeader className="text-center">
            <div>
              <img src={FullLogo} alt="" className="w-full mx-auto mb-2" />
            </div>
            <Divider className="bg-accent-foreground/10" />
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl">Erro na Ativação</CardTitle>
            <CardDescription>
              Não foi possível ativar sua conta. Tente novamente ou entre em
              contato com o suporte.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>
                {activationMutation.error?.message || "Erro desconhecido"}
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex gap-2 justify-center">
            <Button
              variant="outline"
              onClick={handleTryAgain}
              className="w-full"
            >
              Tentar Novamente
            </Button>
            {/* <Button variant="outline" onClick={handleNavigateToContact}>
              Entrar em contato com suporte
            </Button> */}
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (activationMutation.isPending) {
    return (
      <div
        className={cn(
          "flex h-full w-full items-center justify-center transition-all overflow-auto bg-sidebar",
          {
            block: isMobile,
          },
        )}
      >
        <Card className="w-full max-w-md rounded-md">
          <CardHeader className="text-center">
            <div>
              <img src={FullLogo} alt="" className="w-full mx-auto mb-2" />
            </div>
            <Divider className="bg-accent-foreground/10" />
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
              <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
            </div>
            <CardTitle className="text-xl">Ativando Conta...</CardTitle>
            <CardDescription>
              Aguarde enquanto processamos a ativação da sua conta.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center transition-all overflow-auto bg-sidebar",
        {
          block: isMobile,
        },
      )}
    >
      <Card className="w-full max-w-md rounded-md">
        <CardHeader className="text-center">
          <div>
            <img src={FullLogo} alt="" className="w-full mx-auto mb-2" />
          </div>
          <Divider className="bg-accent-foreground/10" />
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-xl">Confirmar Cadastro</CardTitle>
          <CardDescription>
            Clique no botão abaixo para ativar sua conta e começar a usar nossa
            plataforma.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex justify-center">
          <Button
            onClick={handleActivateAccount}
            size="lg"
            variant="bipc"
            className="w-full"
          >
            Confirmar
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
