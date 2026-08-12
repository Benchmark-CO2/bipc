/* eslint-disable react-hooks/rules-of-hooks */
import { PublicHeader, Sidebar } from "@/components/layout";
import Screen from "@/components/layout/screen";
import UserActiveWarning from "@/components/layout/user-active-warning";
import ModalTraining from "@/components/layout/modal-training";
import BreadCrumbs from "@/components/ui/breadcrumbs";
import { Button } from "@/components/ui/button";
// import { ModeToggle } from '@/components/mode-toggle'
import { AuthContext } from "@/context/authContext";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import { ENV } from "@/utils/constants";
import { posLaunchFeatures } from "@/utils/posLaunchFeatures";
import { useTranslation } from "@/i18n";
import { AlertTriangle, Home, MessageSquare, RefreshCw } from "lucide-react";
import { QueryClient } from "@tanstack/react-query";
import {
  createRootRouteWithContext,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { trainingModalStorage } from "@/utils/trainingModalStorage";
const TanStackRouterDevtools = import.meta.env.PROD
  ? () => null
  : lazy(() =>
      import("@tanstack/router-devtools").then((res) => ({
        default: res.TanStackRouterDevtools,
      })),
    );

export const Route = createRootRouteWithContext<{
  auth: AuthContext;
  queryClient: QueryClient;
}>()({
  component: () => {
    const { logout, isAuthenticated, activated } = useAuth();
    const navigate = useNavigate();
    const path = useLocation();
    const handleLogout = () => {
      logout();
      trainingModalStorage.clearAuthMinimizedOnLogout();
      navigate({
        to: "/login",
        replace: true,
      })
        .then(() => null)
        .catch((err: unknown) => err);
    };

    const isMobile = useIsMobile();

    // Verificar se o modal de capacitação deve ser exibido
    const shouldShowTrainingModal = () => {
      const { enabled, endDate } = posLaunchFeatures.trainingModal;
      if (!enabled) return false;

      const now = new Date();
      const deadline = new Date(endDate);

      return now <= deadline;
    };

    // Verificar se está nas páginas de login ou sign-up
    const isAuthPage =
      path.pathname === "/login" || path.pathname === "/sign-up";

    return (
      <div className="flex h-screen w-full transition-all">
        {isAuthenticated && (
          <div
            className={cn("flex w-full ", {
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
          <div className={"flex flex-1 flex-col"}>
            {isMobile ? (
              <Sidebar handleLogout={handleLogout} />
            ) : (
              <PublicHeader />
            )}
            <Screen>
              <Outlet />
            </Screen>
          </div>
        )}

        {/* Modal de Capacitação - não aparece nas páginas de login e sign-up */}
        {shouldShowTrainingModal() && !isAuthPage && !isAuthenticated && (
          <ModalTraining
            isAuthenticated={isAuthenticated}
            hasNavigateToSignUp={true}
          />
        )}

        {/* 
          DEBUG: Para facilitar o teste do modal de capacitação, descomente a linha abaixo:
          
          import { TrainingModalDebugPanel } from "@/components/layout/training-modal-debug-panel";
          
          {import.meta.env.DEV && (
            <TrainingModalDebugPanel isAuthenticated={isAuthenticated} />
          )}
        */}

        <Suspense>
          <TanStackRouterDevtools position="bottom-right" />
        </Suspense>
      </div>
    );
  },
  errorComponent: ({ error, reset }) => {
    const { t } = useTranslation();
    const { isAuthenticated, logout } = useAuth();
    const navigate = useNavigate();
    const isMobile = useIsMobile();

    const handleLogout = () => {
      logout();
      void navigate({ to: "/login", replace: true });
    };

    const handleGoHome = () => {
      reset();
      void navigate({ to: "/" });
    };

    const errorDetails =
      ENV === "development" && error ? (
        <div className="mt-8 w-full max-w-2xl overflow-auto rounded-lg bg-red-50 p-4 font-mono text-sm text-red-600 dark:bg-red-950/40 dark:text-red-400">
          <pre className="whitespace-pre-wrap break-words">
            {error instanceof Error
              ? `${error.name}: ${error.message}\n\n${error.stack ?? ""}`
              : JSON.stringify(error, null, 2)}
          </pre>
        </div>
      ) : null;

    const errorContent = (
      <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8">
        <AlertTriangle
          size={56}
          strokeWidth={1.5}
          className="text-destructive"
        />
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">{t.errors.crashTitle}</h1>
          <p className="max-w-md text-muted-foreground">
            {t.errors.crashDescription}
          </p>
        </div>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Button onClick={handleGoHome}>
            <Home size={16} />
            {t.errors.goHome}
          </Button>
          <Button variant="outline" onClick={reset}>
            <RefreshCw size={16} />
            {t.errors.tryAgain}
          </Button>
          <Button variant="outline" asChild>
            <a
              href="https://bipc.org.br/contact/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageSquare size={16} />
              {t.errors.reportProblem}
            </a>
          </Button>
        </div>
        {errorDetails}
      </div>
    );

    if (isAuthenticated) {
      return (
        <div className="flex h-screen w-full transition-all">
          <div className={cn("flex w-full", { "flex-col": isMobile })}>
            <Sidebar handleLogout={handleLogout} />
            <Screen>{errorContent}</Screen>
          </div>
        </div>
      );
    }

    return (
      <div className="flex h-screen w-full items-center justify-center">
        {errorContent}
      </div>
    );
  },
});
