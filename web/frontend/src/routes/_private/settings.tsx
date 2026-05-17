import { createFileRoute } from "@tanstack/react-router";
import { GenerateApiKey } from "@/components/apiKey";
import { LanguageToggle } from "@/components/language-toggle";
import { SettingsSection } from "@/components/settings-section";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { CustomLink } from "@/components/ui/custom-link";
import { Separator } from "@/components/ui/separator";
import { UserInfo } from "@/components/user-info";
import { useTranslation } from "@/i18n";
import { posLaunchFeatures } from "@/utils/posLaunchFeatures";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import {
  Globe,
  KeySquare,
  Palette,
  ShieldCheck,
  ShieldHalf,
  TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/_private/settings")({
  component: RouteComponent,
});

function RouteComponent() {
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  return (
    <div
      className={cn("container mx-auto p-6 max-w-4xl", { "px-0": isMobile })}
    >
      {/* Header */}
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-primary dark:text-foreground">
          {t.settings.title}
        </h1>
        <p className="text-muted-foreground">{t.settings.manage}</p>
      </div>

      <div className="space-y-6">
        {/* User Information Section */}
        <UserInfo />

        {/* Divider */}
        <div className="flex items-center gap-4">
          <Separator className="flex-1" />
          <span className="text-sm text-muted-foreground font-medium">
            {t.settings.preferences}
          </span>
          <Separator className="flex-1" />
        </div>

        {/* Appearance and Language Settings */}
        <div className="grid gap-6 md:grid-cols-2">
          <SettingsSection
            title={t.settings.appearance.title}
            description={t.settings.appearance.description}
            icon={Palette}
          >
            <div className="space-y-3">
              <label className="text-sm font-medium">
                {t.settings.appearance.themeLabel}
              </label>
              <ThemeToggle />
            </div>
          </SettingsSection>

          <SettingsSection
            title={t.settings.language.title}
            description={t.settings.language.description}
            icon={Globe}
          >
            <div className="space-y-3">
              <label className="text-sm font-medium">
                {t.settings.language.label}
              </label>
              <LanguageToggle />
            </div>
          </SettingsSection>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-4">
          <Separator className="flex-1" />
          <span className="text-sm text-muted-foreground font-medium">
            {t.settings.learnMore}
          </span>
          <Separator className="flex-1" />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <SettingsSection
            title={t.settings.privacy.title}
            description={t.settings.privacy.description}
            icon={ShieldHalf}
          >
            <div className="space-y-3">
              <CustomLink linkKey="privacy">
                <Button variant="link" className="p-0 h-auto">
                  {t.settings.learnMoreLink}
                </Button>
              </CustomLink>
            </div>
          </SettingsSection>

          <SettingsSection
            title={t.settings.dataUsage.title}
            description={t.settings.dataUsage.description}
            icon={TrendingUp}
          >
            <div className="space-y-3">
              <CustomLink linkKey="faq">
                <Button variant="link" className="p-0 h-auto">
                  {t.settings.learnMoreLink}
                </Button>
              </CustomLink>
            </div>
          </SettingsSection>

          {posLaunchFeatures.formExerciseRights.enabled && (
            <SettingsSection
              title={t.settings.rights.title}
              description={t.settings.rights.description}
              icon={ShieldCheck}
            >
              <div className="space-y-3">
                <a
                  href={posLaunchFeatures.formExerciseRights.formUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="link" className="p-0 h-auto">
                    {t.settings.rights.formLink}
                  </Button>
                </a>
              </div>
            </SettingsSection>
          )}
        </div>
        <div className="flex items-center gap-4">
          <Separator className="flex-1" />
          <span className="text-sm text-muted-foreground font-medium">
            {t.settings.development}
          </span>
          <Separator className="flex-1" />
        </div>

        <div className="grid gap-6 md:grid-cols-1">
          <SettingsSection
            title={t.settings.apiKey.title}
            description={t.settings.apiKey.description}
            icon={KeySquare}
          >
            <GenerateApiKey />
          </SettingsSection>
        </div>
      </div>
    </div>
  );
}
