import Chart from '@/components/charts';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

export const Route = createFileRoute('/_private/dashboard')({
  component: Dashboard,
})

function Dashboard() {
  const { t } = useTranslation()
  return (
    <div>
      <h1>{t('dashboard.title')}</h1>
      <p>{t('dashboard.description')}</p>
      <Chart />
    </div>
  )
}