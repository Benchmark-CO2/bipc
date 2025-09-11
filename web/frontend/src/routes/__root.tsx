/* eslint-disable react-hooks/rules-of-hooks */
import { PublicHeader, Sidebar } from "@/components/layout";
import PublicSidebar from '@/components/layout/public-sidebar';
import Screen from "@/components/layout/screen";
import UserActiveWarning from "@/components/layout/user-active-warning";
import BreadCrumbs from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
// import { ModeToggle } from '@/components/mode-toggle'
import { AuthContext } from "@/context/authContext";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { useTranslation } from "react-i18next";
// import { AuthProvider } from "@/providers/authProvider";
// import { ProjectProvider } from "@/providers/projectProvider";
// import Summary from "@/components/ui/summary";

const TanStackRouterDevtools = import.meta.env.PROD
  ? () => null
  : lazy(() =>
      import("@tanstack/router-devtools").then((res) => ({
        default: res.TanStackRouterDevtools,
      }))
    );

export const Route = createRootRouteWithContext<{
  auth: AuthContext;
  queryClient: QueryClient;
}>()({
  component: () => {
    const { logout, isAuthenticated, activated } = useAuth();
    const navigate = useNavigate();
    const path = useLocation()
    const handleLogout = () => {
      logout();
      navigate({
        to: "/login",
        replace: true,
      })
        .then(() => null)
        .catch((err: unknown) => err);
    };

    const isMobile = useIsMobile();

    return (
      <div className="flex h-screen w-full transition-all">
        {isAuthenticated && (
          <div
            className={cn("flex w-full", {
              "flex-col": isMobile,
            })}
          >
            <Sidebar handleLogout={handleLogout} />
            <Screen>
              {activated === false && <UserActiveWarning />}
              <BreadCrumbs />
              <div className="flex-1 overflow-auto p-6 pt-0">
                <Outlet />
              </div>
              {/* <ModeToggle /> */}
            </Screen>
          </div>
        )}
        {!isAuthenticated && (
          <div className={cn("flex flex-1", {
            "flex-col": path.pathname === '/login' || isMobile,
          })}>
            {path.pathname === '/login' ? <PublicHeader /> : <PublicSidebar />}
            <Outlet />
          </div>
        )}
        <Suspense>
          <TanStackRouterDevtools position="bottom-right" />
        </Suspense>
      </div>
    );
  },
  errorComponent: () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const auth = useAuth();
    const handleLogout = () => {
      auth.logout();
      void navigate({
        to: "/login",
        replace: true,
      });
    };
    return (
      <div className="flex flex-col items-center justify-center h-screen w-full">
        <h1 className="text-2xl font-bold">{t("error.sessionExpired")}</h1>
        <Button onClick={handleLogout} className="mt-6" variant="link">
          {t("error.goToLogin")}
        </Button>
      </div>
    );
  },
});
