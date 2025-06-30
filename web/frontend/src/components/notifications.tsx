import useNotifications, { INotification } from '@/hooks/useNotifications';
import { Link } from '@tanstack/react-router';
import { Bell, CircleArrowRight } from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from './ui/button';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

const NotificationCard = ({ notification, onClick }: { notification: INotification, onClick: () => void }) => {
  return (
    <Link to="/profile/invites/$inviteId" params={{ inviteId: String(notification.inviteId) }} onClick={onClick} className="p-2 pl-4 text-sm bg-accent my-1 rounded-md hover:bg-accent/80 transition-colors flex justify-between">
      <p className='text-xs'>{notification.message}</p>
      <CircleArrowRight className='text-primary' size={16} />
    </Link>
  )
}
export const Notifications = () => {
  const { notifications } = useNotifications()
  const { t } = useTranslation();
  const ref = useRef<HTMLButtonElement>(null);
  const handleClickNotification = () => {
    if (ref.current) {
      ref.current.click();
    }
  }
  return (
    <Popover modal i18nIsDynamicList>
      <PopoverTrigger ref={ref}>
        <Button variant='ghost' size='icon' className="relative cursor-pointer">
          <Bell className="cursor-pointer" size={16} />
          {notifications.length > 0 && (
            <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full px-1 text-xs scale-75">
              {notifications.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align='start' alignOffset={20} className="w-80 max-h-[400px] overflow-y-auto ">
        <div className="p-2 border-b border-gray-200">
          <h3 className="text-lg font-semibold">{t('sidebar.notifications')}</h3>
        </div>
        {notifications.map((notification) => (
          <NotificationCard key={notification.id} notification={notification} onClick={handleClickNotification} />
        ))}
        </PopoverContent>
    </Popover>
  )
}

