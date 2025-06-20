import { ModeToggle } from '@/components/mode-toggle'
import { useTranslation } from 'react-i18next'

import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_private/settings')({
  component: RouteComponent
})

function RouteComponent() {
  const { t } = useTranslation()
  return (
    <div>
      <h1 className='text-2xl font-semibold'>{t('settings.title')}</h1>

      <div className='mt-14'>
        <h2>{t('settings.theme')}</h2>
        <ModeToggle />
      </div>
    </div>
  )
}
