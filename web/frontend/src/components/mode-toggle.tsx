import { Moon, Settings, Sun } from 'lucide-react';

import { useTheme } from '@/components/theme-provider';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';

export function ModeToggle() {
  const { setTheme } = useTheme()
  const { t } = useTranslation();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon'>
          <Sun className='h-[1.2rem] w-[1.2rem] scale-100 rotate-0 transition-all dark:scale-0 dark:-rotate-90' />
          <Moon className='absolute h-[1.2rem] w-[1.2rem] scale-0 rotate-90 transition-all dark:scale-100 dark:rotate-0' />
          <span className='sr-only'>{t('sidebar.theme')}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end'>
        <DropdownMenuItem className='flex w-full justify-between cursor-pointer' onClick={() => setTheme('light')}>
          {t('sidebar.light')}
          <Sun className='h-4 w-4' />
        </DropdownMenuItem>
        <DropdownMenuItem className='flex w-full justify-between cursor-pointer' onClick={() => setTheme('dark')}>
          {t('sidebar.dark')}
          <Moon className='h-4 w-4' />
        </DropdownMenuItem>
        <DropdownMenuItem className='flex w-full justify-between cursor-pointer' onClick={() => setTheme('system')}>
          {t('sidebar.system')}
          <Settings className='h-4 w-4' />
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
