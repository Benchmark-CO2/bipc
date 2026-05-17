import Summary from "@/components/ui/summary";
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_private/new_projects")({
  component: RouteComponent,
  loader: ({}) => {
    return {
      crumb: "Empreendimentos",
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
