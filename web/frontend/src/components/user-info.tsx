import { User, Mail, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";

export function UserInfo() {
  const { user } = useAuth();
  const { t } = useTranslation();

  if (!user) {
    return null;
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User size={20} />
          {t("settings.userInfo.title")}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* User Header with Avatar */}
        <div className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 border">
          <UserAvatar name={user.name} email={user.email} size="lg" />
          <div className="flex-1">
            <h3 className="text-lg font-semibold">{user.name}</h3>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {user.activated && (
              <div className="flex items-center gap-2 mt-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                  {t("settings.userInfo.accountActivated")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* User Details */}
        <div className="grid gap-4 md:grid-cols-2">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Mail size={16} className="text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {t("settings.userInfo.email")}
              </p>
              <p className="text-sm text-muted-foreground">{user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
            <Calendar size={16} className="text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {t("settings.userInfo.memberSince")}
              </p>
              <p className="text-sm text-muted-foreground">
                {formatDate(user.created_at)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
