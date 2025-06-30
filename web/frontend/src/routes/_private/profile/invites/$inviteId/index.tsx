import { Button } from '@/components/ui/button';
import { IInvite, useInvites } from '@/hooks/useInvites';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

export const Route = createFileRoute(
  '/_private/profile/invites/$inviteId/',
)({
  component: RouteComponent,
})

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
      <div className='mt-4 flex justify-end gap-2'>
        <Button variant={'destructive'} disabled>
          Recusar
        </Button>
        <Button disabled>
          Aceitar
        </Button>
      </div>
    </div>
  )
}
function RouteComponent() {
  const [invite, setInvite] = useState<IInvite | null>(null);
  const { inviteId } = Route.useParams()
  const { getInviteById, isInviteLoading } = useInvites()

  useEffect(() => {
    if (inviteId) {
      const fetchedInvite = getInviteById(Number(inviteId));
      if (fetchedInvite) {
        setInvite(fetchedInvite);
      } else {
        setInvite(null);
      }
    }
  }, [inviteId, getInviteById])


  if (isInviteLoading) {
    return (
      <div className='bg-accent-foreground/10 p-4 rounded shadow'>
        <h1 className="text-2xl font-bold mb-4">Carregando...</h1>
        <InviteCardSkeleton />
      </div>
    )
  }
  return (
    <div className='bg-accent-foreground/10 p-4 rounded shadow'>
      <h1 className="text-2xl font-bold mb-4">Detalhes do convite</h1>
      {invite ? (
        <div className=" rounded shadow">
          <p><strong>Email:</strong> {invite.email}</p>
          <p><strong>Nome do Projeto:</strong> {invite.project.name}</p>
          <p><strong>Descrição do Projeto:</strong> {invite.project.description}</p>
          {invite.status === 'pending' && <div className='mt-4 flex justify-end gap-2'>
            <Button variant={'destructive'}>
              <span>Recusar</span>
            </Button>
            <Button>
              <span>Aceitar</span>
            </Button>
          </div>}
        </div>
      ) : (
        <p className="text-red-500"><InviteCardSkeleton  /></p>
      )}
      <p className="mt-4">
        <a href="/profile/invites" className="text-blue-500 hover:underline">
          Back to Invites
        </a>
      </p>
    </div>
  )
}
