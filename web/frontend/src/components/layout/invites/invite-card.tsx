import { IInvite } from "@/actions/invites/getInvites";
import { PutReplyInviteRequest } from "@/actions/invites/putReplyInvite";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { dateUtils } from "@/utils/date";
import { stringUtils } from "@/utils/string";
import { Link } from "@tanstack/react-router";
import {
  Calendar,
  User,
  CheckCircle2,
  XCircle,
  Clock,
  Mail,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

const Skeleton = () => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="h-6 bg-muted rounded w-3/4 animate-pulse"></div>
            <div className="h-4 bg-muted rounded w-24 animate-pulse"></div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg animate-pulse">
          <div className="w-10 h-10 bg-muted rounded-full flex-shrink-0"></div>
          <div className="flex-1 space-y-2">
            <div className="h-3 bg-muted rounded w-20"></div>
            <div className="h-4 bg-muted rounded w-32"></div>
          </div>
        </div>
        <div className="flex gap-3">
          <div className="h-10 bg-muted rounded flex-1"></div>
          <div className="h-10 bg-muted rounded flex-1"></div>
        </div>
      </CardContent>
    </Card>
  );
};

const CardNotFound = () => {
  const { t } = useTranslation();

  return (
    <Card>
      <CardContent className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
          <Mail className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">
          {t("common.inviteNotFound")}
        </h3>
        <p className="text-muted-foreground text-sm mb-6 max-w-sm">
          {t("common.inviteNotFoundDescription")}
        </p>
        <Link to="/notifications">
          <Button variant="outline">{t("common.showAll")}</Button>
        </Link>
      </CardContent>
    </Card>
  );
};

const InviteCardItem = ({
  invite,
  handleSubmitReplyInvite,
  disabled,
}: {
  invite: IInvite;
  handleSubmitReplyInvite: (
    invitedId: number,
    status: PutReplyInviteRequest
  ) => void;
  disabled: boolean;
}) => {
  const { t } = useTranslation();

  const statusConfig = {
    pending: {
      icon: Clock,
      variant: "default" as const,
      label: "Em espera",
    },
    accepted: {
      icon: CheckCircle2,
      variant: "success" as const,
      label: "Aceito",
    },
    declined: {
      icon: XCircle,
      variant: "destructive" as const,
      label: "Recusado",
    },
  };

  const status =
    statusConfig[invite.status as keyof typeof statusConfig] ||
    statusConfig.pending;
  const StatusIcon = status.icon;
  const isPending = invite.status === "pending";

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        isPending && "border-primary/50 shadow-sm hover:shadow-md"
      )}
    >
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              {invite.project_name}
            </CardTitle>
            <CardDescription className="mt-2">
              <Badge variant={status.variant} className="gap-1.5">
                <StatusIcon className="w-3.5 h-3.5" />
                {status.label}
              </Badge>
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Inviter Info */}
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-semibold text-sm flex-shrink-0">
            {stringUtils.getInitials(invite.inviter_name) || (
              <User className="w-5 h-5" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted-foreground">
              {t("common.invitedBy")}
            </p>
            <p className="font-medium truncate">{invite.inviter_name}</p>
          </div>
        </div>

        {/* Date */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Calendar className="w-4 h-4" />
          <span>
            {dateUtils.calculateRelativeTime(new Date(invite.created_at))}
          </span>
        </div>

        {/* Action Buttons */}
        {isPending && (
          <div className="flex gap-3 pt-2">
            <Button
              disabled={disabled}
              onClick={() => handleSubmitReplyInvite(invite.id, "accepted")}
              className="flex-1"
              variant="bipc"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              {t("common.accept")}
            </Button>
            <Button
              variant="outline"
              disabled={disabled}
              onClick={() => handleSubmitReplyInvite(invite.id, "declined")}
              className="flex-1"
            >
              <XCircle className="w-4 h-4 mr-2" />
              {t("common.reject")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export const InviteCard = {
  Card: InviteCardItem,
  Skeleton,
  CardNotFound,
};
