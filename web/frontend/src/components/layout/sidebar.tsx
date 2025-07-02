import { useAuth } from '@/hooks/useAuth';
import { stringUtils } from '@/utils/string';
import { Link } from '@tanstack/react-router';
import { Settings, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LanguageToggle } from '../language-toggle';
import { ModeToggle } from '../mode-toggle';
import { Notifications } from '../notifications';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Button } from '../ui/button';
import DrawerInvite from './drawer-invite';

interface ISidebar {
  handleLogout: () => void
}

const activeProps = {
  style: {
    fontWeight: 'bold'
  }
}

const Sidebar = ({ handleLogout }: ISidebar) => {
  const { user } = useAuth()
  const { t } = useTranslation();
  return (
    <div className='flex h-screen w-64 flex-col bg-zinc-800 p-4 text-white'>
      <h2 className='text-xl font-semibold'>{t('common.appName')}</h2>
      <ul className='mt-4 flex h-full flex-col gap-2'>
        <li>
          <Link to='/' className='hover:text-gray-400' activeProps={activeProps}>
            {t(['home.title'])}
          </Link>
        </li>
        {/* <li>
          <Link to='/dashboard' className='hover:text-gray-400' activeProps={activeProps}>
            Dashboard
          </Link>
        </li> */}
        <li>
          <Link to='/projects' className='hover:text-gray-400' activeProps={activeProps}>
            {t('projects.title')}
          </Link>
          <ul className='mt-2 flex flex-col gap-1 pl-4'>
            <li className='hover:text-gray-400'>
              <DrawerInvite  />
            </li>
          </ul>
        </li>
        <li className='mt-auto'>
          <div className='flex items-center justify-between'>
            <span className='text-sm'>{t('sidebar.notifications')}</span>
            <Notifications  />
          </div>
          <div className='flex items-center justify-between my-2'>
                <span className='text-sm'>{t('sidebar.profile')}</span>
              <Link to='/profile' className='hover:text-gray-400 flex justify-between items-center' activeProps={activeProps}>
                <Settings size={16} className='w-9!' />
              </Link>
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-sm'>{t('sidebar.theme')}</span>
            <ModeToggle />
          </div>
          <div className='flex items-center justify-between'>
            <span className='text-sm'>{t('sidebar.language')}</span>
            <LanguageToggle />
          </div>
          
        </li>
        <li className='flex items-center gap-4 border-t border-zinc-700 pt-4'>
          <div className='flex items-center gap-2'>
            <Avatar>
              {/* <AvatarImage src='https://github.com/shadcn.png' /> */}
              <AvatarFallback className='bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200'>
                {stringUtils.getInitials(user?.name || '') || <User className='w-4 h-4' />}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className='text-sm font-medium'>{user?.name}</p>
              <p className='text-xs text-gray-400'>{user?.email}</p>
            </div>
          </div>
        </li>
        <div className='flex justify-end gap-2'>
          <Button
            variant='ghost'
            size='sm'
            onClick={handleLogout}
            className='mt-2 ml-auto bg-zinc-600 hover:bg-zinc-700'
          >
            {t('common.logout')}
          </Button>
        </div>
      </ul>
    </div>
  )
}

export default Sidebar
