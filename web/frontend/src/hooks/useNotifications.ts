import { useQuery } from '@tanstack/react-query';

export interface INotification {
  id: number;
  message: string;
  inviteId: number | null; // Optional: If the notification is related to an invite
  type: 'invite' | 'project' | 'task'; // Optional: Add type to categorize notifications
}
const useNotifications = () => {
  const {data} = useQuery<INotification[]>({
    queryKey: ['notifications'],
    queryFn: async () => {
      // Simulate fetching notifications
      return new Promise((resolve) => {
        setTimeout(() => {
          resolve([
            { id: 1, message: 'New comment on your post', inviteId: 1, type: 'invite' },
            { id: 2, message: 'Project deadline approaching', inviteId: null, type: 'project' },
            { id: 3, message: 'New task assigned to you', inviteId: null, type: 'task' },
          ]);
        }, 1000);
      });
    },
    refetchInterval: 60000, // Refetch every minute
  })

  const getNotificationById = (id: number) => {
    return data?.find(notification => notification.id === id);
  }

  return {
    notifications: data || [],
  }
}

export default useNotifications