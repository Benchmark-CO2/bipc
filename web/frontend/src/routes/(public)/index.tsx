import { createFileRoute, Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

export const Route = createFileRoute("/(public)/")({
  component: RouteComponent,
  loader: ({ context }) => {
    return {
      auth: context.auth,
    };
  },
});

function RouteComponent() {
  const { auth } = Route.useLoaderData();
  const { t } = useTranslation();

  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <h1 className="text-4xl font-bold sm:text-6xl">
        {t("public.comingSoonTitle")}
      </h1>
      <p className="mt-4 text-lg text-gray-600 sm:text-xl">
        {t("public.comingSoonDescription")}
      </p>
      <div className="mt-8 flex items-center gap-4">
        {auth.isAuthenticated ? (
          <Link
            to="/new_projects"
            className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white shadow-lg transition sm:text-base"
          >
            {t("public.accessProjects")}
          </Link>
        ) : (
          <Link
            to="/login"
            className="rounded-lg bg-primary px-6 py-3 text-sm font-medium text-white shadow-lg transition sm:text-base"
          >
            {t("public.login")}
          </Link>
        )}
      </div>
    </div>
  );
}
