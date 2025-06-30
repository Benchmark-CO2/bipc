import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';

export interface IInvite {
  id: number;
  email: string;
  project: {
    id: number;
    name: string;
    description: string;
  };
  status: 'pending' | 'accepted' | 'declined';
}
export const useInvites = () => {
  const [hasOpened, setHasOpened] = useState<boolean>(false);
  const [newInvitesCount, setNewInvitesCount] = useState<number>(0);
  const [isInviteLoading, setIsInviteLoading] = useState<boolean>(true);

  const { data, isLoading } = useQuery<IInvite[]>({
    queryKey: ['invites'],
    queryFn: async () => {
      // Simulate fetching invites
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve([
            { id: 1, email: 'user1@example.com', project: {
              id: 1,
              name: 'Project Alpha',
              description: 'This is a sample project for testing invites.',
            }, status: 'pending' },
            { id: 2, email: 'user2@example.com', project: {
              id: 2,
              name: 'Project Beta',
              description: 'This is another sample project for testing invites.',
            }, status: 'accepted' },
            { id: 3, email: 'user3@example.com', project: {
              id: 3,
              name: 'Project Gamma',
              description: 'This is yet another sample project for testing invites.',
            }, status: 'declined' },
            { id: 4, email: 'user4@example.com', project: {
              id: 4,
              name: 'Project Delta',
              description: 'This is a fourth sample project for testing invites.',
            }, status: 'pending' },
            { id: 5, email: 'user5@example.com', project: {
              id: 5,
              name: 'Project Epsilon',
              description: 'This is a fifth sample project for testing invites.',
            }, status: 'pending' },
            { id: 6, email: 'user6@example.com', project: {
              id: 6,
              name: 'Project Zeta',
              description: 'This is a sixth sample project for testing invites.',
            }, status: 'pending' },
            { id: 7, email: 'user5@example.com', project: {
              id: 5,
              name: 'Project Epsilon',
              description: 'This is a fifth sample project for testing invites.',
            }, status: 'pending' },
            { id: 8, email: 'user6@example.com', project: {
              id: 6,
              name: 'Project Zeta',
              description: 'This is a sixth sample project for testing invites.',
            }, status: 'pending' },
            { id: 9, email: 'user6@example.com', project: {
              id: 6,
              name: 'Project Zeta',
              description: 'This is a sixth sample project for testing invites.',
            }, status: 'pending' }
          ]);
        }, 1000);
      });
    },
  });

  const getInviteById = (id: number) => {
    setIsInviteLoading(true);
    try {
      return data?.find(invite => invite.id === id);
    } catch (error) {
      console.error('Error fetching invite by ID:', error);
    } finally {
      setIsInviteLoading(false);
    }
  };

  useEffect(() => {
    if (data === undefined) {
      return;
    }
    if (data.length > 0) {
      const lastCount = localStorage.getItem('invitesCount') || '0';
      const lastCountNumber = parseInt(lastCount, 10);
      if (lastCountNumber < data.length) {
        localStorage.setItem('invitesCount', String(data.length));
        setHasOpened(false);
        setNewInvitesCount(data.length - lastCountNumber);
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

  return {
    invites: orderInvites(data||[]) || [],
    newInvitesCount,
    getInviteById,
    isLoading,
    isInviteLoading,
    hasOpened,
    setHasOpened: (opened: boolean) => {
      localStorage.setItem('invitesOpened', String(opened));
    }
  };
};

