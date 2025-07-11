import { IInvite } from '@/actions/invites/getInvites';
import useNotifications from '@/hooks/useNotifications';
import { Link } from '@tanstack/react-router';
import { Bell, CircleArrowRight } from 'lucide-react';
import { useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

const NotificationCard = ({ notification, onClick }: { notification: IInvite, onClick: () => void }) => {
  return (
    <Link to="/profile/invites" search={{ inviteId: notification.id.toString() }} onClick={onClick} className="p-2 pl-4 text-sm rounded-r-md my-1 bg-accent-foreground/20 hover:bg-accent/80 transition-colors flex justify-between flex-col gap-3 border-l-4 border-l-primary cursor-pointer">
      <h3 className='font-semibold'>Novo convite</h3>
      <div className='flex items-center justify-between gap-2'>
        <p className='text-xs'>{notification.inviter_name} - {notification.project_name}</p>
        <CircleArrowRight className='text-primary' size={16} />
      </div>
    </Link>
  )
}

const EmptyList = () => (
  <div className='py-3'>
    <h3>Nenhuma notificação</h3>
  </div>
)

interface INotificationProps {
  size?: number
}
export const Notifications = ({ size = 16 }: INotificationProps) => {
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
      <PopoverTrigger ref={ref} className='group-hover:animate-bounce relative'>
          <Bell className="cursor-pointer" size={size}  />
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 scale-75 bg-destructive text-white rounded-full px-1 text-xs">
              {notifications.length}
            </span>
          )}
      </PopoverTrigger>
      <PopoverContent align='start' alignOffset={20} className="w-80 max-h-[400px] overflow-y-auto ">
        <div className="p-2 border-b border-gray-200">
          <h3 className="text-lg font-semibold">{t('sidebar.notifications')}</h3>
        </div>
        {notifications.length ? notifications.map((notification) => (
          <NotificationCard key={notification.id} notification={notification} onClick={handleClickNotification} />
        )) : (
          <EmptyList />
        )}
        </PopoverContent>
    </Popover>
  )
}

