import PrivacyPolicy from "@/components/layout/drawer-documents/privacy-policy";
import { Card, CardContent } from "@/components/ui/card";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(public)/privacidade")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-primary">
          Política de Privacidade
        </h1>
        <p className="text-muted-foreground">
          Esta Política de Privacidade descreve como coletamos, usamos e
          protegemos suas informações pessoais ao utilizar nossa plataforma de
          benchmark de emissões de CO2. Ao acessar ou usar nossa plataforma,
          você concorda com os termos desta política.
        </p>
      </div>
      <Card>
        <CardContent className="space-y-6">
          <PrivacyPolicy />
        </CardContent>
      </Card>
    </div>
  );
}
