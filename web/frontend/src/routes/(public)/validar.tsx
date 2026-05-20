import MaintenanceBanner from '@/components/underConstruction';
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/(public)/validar")({
  component: RouteComponent,
});

function RouteComponent() {
 return (
  <MaintenanceBanner  />
 )
}
