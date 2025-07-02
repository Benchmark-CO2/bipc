import { getInvites } from '@/actions/invites/getInvites';
import { useQuery } from '@tanstack/react-query';


const useNotifications = () => {
  const {data} = useQuery({
    queryKey: ['notifications'],
    queryFn: getInvites
});

  return {
    notifications: data?.data.invitations || [],
  };
}

export default useNotifications