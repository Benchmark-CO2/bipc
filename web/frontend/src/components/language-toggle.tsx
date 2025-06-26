import { Languages } from 'lucide-react';

import { flags } from '@/assets/icons/flags';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';

export function LanguageToggle() {
  const { i18n, t } = useTranslation();

  const handleChangeLanguage = async (lng: string) => {
    await i18n.changeLanguage(lng);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon'>
          <Languages className='scale-100 rotate-0 transition-all ' />
          <span className='sr-only'>{t('sidebar.languageToggle.title')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem className='flex w-full justify-between cursor-pointer' onClick={() => void handleChangeLanguage('en-US')}>
          {t('sidebar.en')}
          {flags['en-US'].flag}
        </DropdownMenuItem>
        <DropdownMenuItem className='flex w-full justify-between cursor-pointer' onClick={() => void handleChangeLanguage('pt-BR')}>
          {t('sidebar.ptbr')}
          {flags['pt-BR'].flag}
        </DropdownMenuItem>
        <DropdownMenuItem className='flex w-full justify-between cursor-pointer' onClick={() => void handleChangeLanguage('es-ES')}>
          {t('sidebar.es')}
          {flags['es-ES'].flag}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
