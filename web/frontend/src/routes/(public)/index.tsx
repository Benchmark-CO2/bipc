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
        search:
          context.auth.activated === false
            ? { activationRequired: true }
            : { activationRequired: false },
      });
    }
  },
});

function RouteComponent() {
  return <div>Hello "/(public)/"!</div>;
}
