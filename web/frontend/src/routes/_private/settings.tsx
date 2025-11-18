import { useTranslation } from "react-i18next";
import { createFileRoute } from "@tanstack/react-router";
import { UserInfo } from "@/components/user-info";
import { ThemeToggle } from "@/components/theme-toggle";
import { LanguageToggle } from "@/components/language-toggle";
import { SettingsSection } from "@/components/settings-section";
import { Separator } from "@/components/ui/separator";
import { Palette, Globe, ShieldHalf, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import DrawerDocuments from "@/components/layout/drawer-documents";

export const Route = createFileRoute("/_private/settings")({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-primary">
          {t("settings.title")}
        </h1>
        <p className="text-muted-foreground">
          Gerencie suas preferências e informações de conta
        </p>
      </div>

      <div className="space-y-6">
        {/* User Information Section */}
        <UserInfo />

        {/* Divider */}
        <div className="flex items-center gap-4">
          <Separator className="flex-1" />
          <span className="text-sm text-muted-foreground font-medium">
            Preferências
          </span>
          <Separator className="flex-1" />
        </div>

        {/* Appearance and Language Settings */}
        <div className="grid gap-6 md:grid-cols-2">
          <SettingsSection
            title={t("settings.appearance.title")}
            description={t("settings.appearance.themeDescription")}
            icon={Palette}
          >
            <div className="space-y-3">
              <label className="text-sm font-medium">
                {t("settings.theme")}
              </label>
              <ThemeToggle />
            </div>
          </SettingsSection>

          <SettingsSection
            title={t("settings.language")}
            description={t("settings.appearance.languageDescription")}
            icon={Globe}
          >
            <div className="space-y-3">
              <label className="text-sm font-medium">
                {t("settings.language")}
              </label>
              <LanguageToggle />
            </div>
          </SettingsSection>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <Separator className="flex-1" />
          <span className="text-sm text-muted-foreground font-medium">
            Saiba mais
          </span>
          <Separator className="flex-1" />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <SettingsSection
            title={"Privacidade e Proteção de Dados"}
            description={"Entenda como tratamos seus dados pessoais"}
            icon={ShieldHalf}
          >
            <div className="space-y-3">
              <DrawerDocuments
                documentType="privacy-policy"
                triggerComponent={
                  <Button variant="link" className="p-0 h-auto">
                    Exercer meus direitos ➡️
                  </Button>
                }
              />
            </div>
          </SettingsSection>

          <SettingsSection
            title={"Uso de dados da plataforma"}
            description={"Saiba como utilizamos os dados coletados"}
            icon={TrendingUp}
          >
            <div className="space-y-3">
              <DrawerDocuments
                documentType="terms-of-use"
                triggerComponent={
                  <Button variant="link" className="p-0 h-auto">
                    Acessar para saber mais ➡️
                  </Button>
                }
              />
            </div>
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}
