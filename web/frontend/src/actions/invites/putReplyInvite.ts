import api from '@/service/api';

interface PutReplyInviteResponse {
  message: string;
  status: string;
}

export type PutReplyInviteRequest = 'accepted' | 'declined'
export const putReplyInvite = async (invitationID: string, status: PutReplyInviteRequest) => {
  return api.put<PutReplyInviteResponse>(`/v1/users/reply/${invitationID}`, { status })
}