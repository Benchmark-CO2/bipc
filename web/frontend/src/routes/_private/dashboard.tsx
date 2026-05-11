import Chart from "@/components/charts";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_private/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  return (
    <div>
      <h1>Dashboard</h1>
      <p>Esta é a página do dashboard.</p>
      <Chart />
    </div>
  );
}
