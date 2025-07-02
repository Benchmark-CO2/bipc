import { getInvites, IInvite } from '@/actions/invites/getInvites';
import { putReplyInvite, PutReplyInviteRequest } from '@/actions/invites/putReplyInvite';
import { useMutation, useQuery } from '@tanstack/react-query';
import { UseNavigateResult } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';


export const useInvites = (props: { navigate?: UseNavigateResult<string>, inviteId?: string}) => {
  const [hasOpened, setHasOpened] = useState<boolean>(false);
  const [newInvitesCount, setNewInvitesCount] = useState<number>(0);
  const [isInviteLoading, setIsInviteLoading] = useState<boolean>(true);
  
  const { data, isLoading } = useQuery({
    queryKey: ['invites'],
    queryFn: getInvites
  });

  const getInviteById = (id?: string) => {
    const invite = data?.data.invitations.find(invite => String(invite.id) === String(id));
    return invite ? [invite] : null;
  };

  const { mutate } = useMutation({
    mutationFn: ({
      inviteId, response
    }:{inviteId: number, response: PutReplyInviteRequest }) => putReplyInvite(String(inviteId), response),
  })

  useEffect(() => {
    if (data?.data.invitations === undefined) {
      return;
    }
    if (data.data.invitations.length > 0) {
      const lastCount = localStorage.getItem('invitesCount') || '0';
      const lastCountNumber = parseInt(lastCount, 10);
      if (lastCountNumber < data.data.invitations.length) {
        localStorage.setItem('invitesCount', String(data.data.invitations.length));
        setHasOpened(false);
        setNewInvitesCount(data.data.invitations.length - lastCountNumber);
      } else {
        setHasOpened(true);
      }
    } else {
      localStorage.setItem('invitesCount', '0');
      setHasOpened(true);
    }
  }, [data])

  const orderInvites = (invites: IInvite[]) => {
    return invites.sort((a, b) => {
      if (a.status === 'pending' && b.status !== 'pending') return -1;
      if (b.status === 'pending' && a.status !== 'pending') return 1;
      if (a.status === 'accepted' && b.status === 'declined') return -1;
      if (b.status === 'accepted' && a.status === 'declined') return 1;
      return a.id - b.id; // Fallback to ID order
    });
  };

  const handleSubmitReplyInvite = async (inviteId: number, response: PutReplyInviteRequest) => {
    setIsInviteLoading(true);
    try {
      mutate({inviteId, response})
      if (props?.navigate) {
        props.navigate({
          to: '/profile/invites'
        })
      }
    } catch (error) {
      toast.error('Error processing invite response. Please try again later.');
    } finally {
      setIsInviteLoading(false);
    }
  }


  return {
    invites: props?.inviteId ? getInviteById(props?.inviteId) : orderInvites(data?.data.invitations || []),
    newInvitesCount,
    getInviteById,
    isLoading,
    isInviteLoading,
    hasOpened,
    setHasOpened: (opened: boolean) => {
      localStorage.setItem('invitesOpened', String(opened));
    },
    handleSubmitReplyInvite
  };
};

