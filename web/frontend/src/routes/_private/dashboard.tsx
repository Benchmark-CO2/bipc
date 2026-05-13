import Chart from "@/components/charts";
import { useTranslation } from "@/i18n";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_private/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { t } = useTranslation();
  return (
    <div>
      <h1>{t.dashboard.title}</h1>
      <p>{t.dashboard.description}</p>
      <Chart />
    </div>
  );
}
