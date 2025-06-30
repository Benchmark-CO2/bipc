import { Button } from '@/components/ui/button';
import { IInvite, useInvites } from '@/hooks/useInvites';
import { createFileRoute } from '@tanstack/react-router';

const statusIcon = {
  pending: '⏳',
  accepted: '✅',
  declined: '❌',
} as const;
const InviteCardSkeleton = () => {
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
        <Button variant={'destructive'} disabled>
          Decline
        </Button>
        <Button disabled>
          Accept Invite
        </Button>
      </div>
    </div>
  )
}
const InviteCard = ({ invite }: {invite: IInvite }) => {
  return (
    <div className="p-4 bg-white shadow-md rounded-lg dark:bg-zinc-800 dark:shadow-zinc-900">
      <div className='flex items-center gap-2 max-sm:flex-col'>
        <h3 className="text-lg font-semibold max-sm:text-center">{invite.project.name}</h3>
        <p className="text-gray-600 dark:text-foreground/50 max-sm:text-center">{invite.project.description}</p>
        <div className="mt-2 ml-auto max-sm:mx-auto">
          <span className="text-sm text-blue-600 dark:text-blue-400">{statusIcon[invite.status]}</span>
        </div>
      </div>
      <div className="mt-4 w-full flex gap-2 max-sm:flex-col">
        <Button variant={'destructive'} disabled={invite.status !== 'pending'}>
          Decline Invite
        </Button>
        <Button disabled={invite.status !== 'pending'}>
          Accept Invite
        </Button>
        <Button variant={'outline'} className="ml-auto max-sm:mx-auto">
          <a href={`/profile/invites/${invite.id}`} className="text-blue-600 dark:text-blue-400">View Details</a>
        </Button>
      </div>
    </div>
  )
}
export const Route = createFileRoute('/_private/profile/invites/')({
  component: RouteComponent,
})

function RouteComponent() {
  const { invites, isLoading } = useInvites();
  return <div className='flex flex-col gap-4 p-4 bg-accent-foreground/10 shadow-md rounded-lg mt-4 mb-6'>
    <h2 className='text-lg font-semibold text-gray-800 dark:text-gray-200'>Invites</h2>
    {isLoading ? (
      <>
        <InviteCardSkeleton />
        <InviteCardSkeleton />
        <InviteCardSkeleton />
      </>
    ) : (
      invites.map(invite => (
        <InviteCard key={invite.id} invite={invite} />
      ))
    )}
  </div>
}
