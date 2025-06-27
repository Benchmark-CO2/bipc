import { putActivateUser } from "@/actions/users/putActivateUser";
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
import { useMutation } from "@tanstack/react-query";
import {
  createFileRoute,
  useNavigate,
  useSearch,
} from "@tanstack/react-router";
import { CheckCircle, Loader2, Mail, XCircle } from "lucide-react";
import { toast } from "sonner";

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
  const { tkn: token } = useSearch({ from: "/(public)/activate" });

  const activationMutation = useMutation({
    mutationFn: putActivateUser,
    onSuccess: () => {
      toast.success("Conta ativada", {
        description: "Vá ao login e acesse nossa plataforma",
      });
    },
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
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <XCircle className="h-6 w-6 text-red-600" />
            </div>
            <CardTitle className="text-xl">Link Inválido</CardTitle>
            <CardDescription>
              O link de ativação é inválido ou expirou. Solicite um novo email
              de confirmação.
            </CardDescription>
          </CardHeader>
          <CardFooter className="flex justify-center">
            <Button variant="outline" onClick={handleNavigateToLogin}>
              Voltar ao Login
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (activationMutation.isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
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
            <Button onClick={handleNavigateToLogin}>Fazer Login</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (activationMutation.isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
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
            <Button variant="outline" onClick={handleTryAgain}>
              Tentar Novamente
            </Button>
            {/* <Button variant="outline" onClick={handleNavigateToContact}>
              Contatar Suporte
            </Button> */}
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (activationMutation.isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
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
          <Button onClick={handleActivateAccount} size="lg">
            Confirmar Cadastro
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
