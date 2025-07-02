import { InviteCard } from '@/components/layout/invites/invite-card';
import { useInvites } from '@/hooks/useInvites';
import { createFileRoute } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';


type InvitesSearch = {
  inviteId?: string;
};
export const Route = createFileRoute('/_private/profile/invites/')({
  component: RouteComponent,
  validateSearch: (search: InvitesSearch) => {
    return search;
  }
})

function RouteComponent() {
  const { t } = useTranslation();
  const navigate = Route.useNavigate()
  const search = Route.useSearch();
  const inviteId = search?.inviteId;

  const { invites, isLoading, handleSubmitReplyInvite } = useInvites({ navigate, inviteId });


  return <div className='flex flex-col gap-4 p-4 bg-accent-foreground/10 shadow-md rounded-lg mt-4 mb-6'>
    <h2 className='text-lg font-semibold text-gray-800 dark:text-gray-200 capitalize'>{t('common.invite_other', { count: 2 })}</h2>
    {isLoading ? (
      <>
        <InviteCard.Skeleton />
        <InviteCard.Skeleton />
        <InviteCard.Skeleton />
      </>
    ) : (
      invites ? invites.map(invite => (
        <InviteCard.Card key={invite.id} invite={invite} handleSubmitReplyInvite={handleSubmitReplyInvite} disabled={isLoading} />
      )) : (
        <InviteCard.CardNotFound />
      )
    )}
  </div>
}
