import Summary from "@/components/ui/summary";

import { createFileRoute, Outlet } from "@tanstack/react-router";
import { t } from "i18next";

export const Route = createFileRoute("/_private/new_projects")({
  component: RouteComponent,
  loader: ({}) => {
    return {
      crumb: t("common.crumbs.projects"),
    };
  },
});

function RouteComponent() {
  return (
    <>
      <Outlet />
      <Summary />
    </>
  );
}
