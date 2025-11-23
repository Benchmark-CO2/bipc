import TermsOfUse from "@/components/layout/drawer-documents/terms-of-use";
import { Card, CardContent } from "@/components/ui/card";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(public)/termos-de-uso")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-primary">
          Termos de Uso
        </h1>
        <p className="text-muted-foreground">
          Estes Termos de Uso estabelecem as condições gerais aplicáveis ao
          uso da plataforma BIPc. Leia atentamente antes de utilizar nossos
          serviços.
        </p>
      </div>
      <Card>
        <CardContent className="space-y-6">
          <TermsOfUse />
        </CardContent>
      </Card>
    </div>
  );
}
