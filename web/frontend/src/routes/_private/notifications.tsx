import { createFileRoute } from "@tanstack/react-router";
import { InviteCard } from "@/components/layout/invites/invite-card";
import { useInvites } from "@/hooks/useInvites";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";
import { Mail } from "lucide-react";

type InvitesSearch = {
  inviteId?: string;
};

export const Route = createFileRoute("/_private/notifications")({
  component: RouteComponent,
  validateSearch: (search: InvitesSearch) => {
    return search;
  },
});

function RouteComponent() {
  const { t } = useTranslation();
  const navigate = Route.useNavigate();
  const search = Route.useSearch();
  const inviteId = search?.inviteId;

  const { invites, isLoading, handleSubmitReplyInvite } = useInvites({
    navigate,
    inviteId,
  });

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      {/* Header */}
      <div className="space-y-2 mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-2">
          <Mail className="w-8 h-8" />
          {t("common.invite_other", { count: 2 })}
        </h1>
        <p className="text-muted-foreground">
          Gerencie seus convites de projetos e colaborações
        </p>
      </div>

      <Separator className="mb-6" />

      <div className="space-y-4">
        {isLoading ? (
          <>
            <InviteCard.Skeleton />
            <InviteCard.Skeleton />
            <InviteCard.Skeleton />
          </>
        ) : invites && invites.length > 0 ? (
          invites.map((invite) => (
            <InviteCard.Card
              key={invite.id}
              invite={invite}
              handleSubmitReplyInvite={handleSubmitReplyInvite}
              disabled={isLoading}
            />
          ))
        ) : (
          <InviteCard.CardNotFound />
        )}
      </div>
    </div>
  );
}
