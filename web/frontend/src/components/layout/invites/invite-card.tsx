import { IInvite } from '@/actions/invites/getInvites';
import { PutReplyInviteRequest } from '@/actions/invites/putReplyInvite';
import { Button } from '@/components/ui/button';
import { dateUtils } from '@/utils/date';
import { stringUtils } from '@/utils/string';
import { Link } from '@tanstack/react-router';
import { Calendar, User } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Skeleton = () => {
  const { t } = useTranslation();
  return (
    <div className="p-4 bg-white shadow-md rounded-lg dark:bg-zinc-800 dark:shadow-zinc-900 animate-pulse">
      <div className='flex items-center gap-2'>
        <h3 className="text-lg font-semibold bg-gray-300 dark:bg-gray-700 w-1/2 h-6"></h3>
        <p className="text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-600 w-3/4 h-4"></p>
        <div className="mt-2 ml-auto">
          <span className="text-sm text-blue-600 dark:text-blue-400">⏳</span>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
          <Button disabled>
            {t('common.accept')}{t('common.invite_other', { count: 1 })}
          </Button>
        <Button variant={'ghost'} disabled>
          {t('common.reject')}{t('common.invite_other', { count: 1 })}
        </Button>
      </div>
    </div>
  )
}

const CardNotFound = () => {
  const { t } = useTranslation();

  return (
    <div className="p-4 bg-white shadow-md rounded-lg dark:bg-zinc-800 dark:shadow-zinc-900 text-center">
      <h3 className="text-lg font-semibold">{t('common.inviteNotFound')}</h3>
      <p className="text-gray-600 dark:text-gray-400">{t('common.inviteNotFoundDescription')}</p>
      <div className="mt-4">
        <Link to="/profile/invites" className="text-blue-600 dark:text-blue-400 hover:underline">
          <Button variant="outline">
            {t('common.showAll')}
          </Button>
        </Link>
      </div>
    </div>
  )
}

const Card = ({ invite, handleSubmitReplyInvite, disabled }: {invite: IInvite, handleSubmitReplyInvite: (invitedId: number, status: PutReplyInviteRequest) => void, disabled: boolean }) => {
  const { t } = useTranslation();
  return (
    <div className="p-4 bg-white shadow-md rounded-lg dark:bg-zinc-800 dark:shadow-zinc-900">
      <div className='flex flex-col items-start gap-2 max-sm:flex-col'>
        <h3 className="text-lg font-semibold max-sm:text-center mb-5">{invite.project_name}</h3>
        <div className='flex flex-col'>
          <div className='flex items-center gap-2'>
            <div className='bg-primary/70 text-lg rounded-full w-10 h-10 flex items-center justify-center text-white font-semibold'>
              {stringUtils.getInitials(invite.inviter_name) || <User className='w-4 h-4' />}
            </div>
            <div className='flex flex-col'>
              <span className='text-xs text-accent-foreground/70'>{t('common.invitedBy')}</span>
              <span>{invite.inviter_name}</span>
            </div>
          </div>
        </div>
          <p className="text-gray-600 dark:text-gray-400 flex items-center gap-1 mt-2 pl-4">
            <Calendar className='w-4 h-4' />
            {dateUtils.calculateRelativeTime(new Date(invite.created_at))}</p>
      </div>
      <div className="mt-4 w-full flex gap-2 max-sm:flex-col">
        <Button disabled={invite.status !== 'pending' || disabled} onClick={() => handleSubmitReplyInvite(invite.id, 'accepted')}>
          {`${t('common.accept')} ${t('common.invite_one').toLowerCase()}`}
        </Button>
        <Button variant={'ghost'} disabled={invite.status !== 'pending' || disabled} onClick={() => handleSubmitReplyInvite(invite.id, 'declined')}>
          {`${t('common.reject')} ${t('common.invite_one').toLowerCase()}`}
        </Button>
      </div>
    </div>
  )
}

export const InviteCard = {
  Card,
  Skeleton,
  CardNotFound
}