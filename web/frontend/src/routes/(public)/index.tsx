import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/(public)/")({
  component: RouteComponent,
  loader: async ({ context }) => {
    if (!context.auth.isAuthenticated) {
      throw redirect({
        to: "/login",
      });
    } else {
      throw redirect({
        to: "/new_projects",
        search: { activationRequired: true },
      });
    }
  },
});

function RouteComponent() {
  return <div>Hello "/(public)/"!</div>;
}
