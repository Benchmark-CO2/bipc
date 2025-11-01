import api from "@/service/api";

export interface IInvite {
  id: number;
  email: string;
  project_name: string;
  project_id: number;
  status: "pending" | "accepted" | "declined";
  inviter_id: number;
  inviter_name: string;
  permissions: string[];
  created_at: string;
  expires_at: string | null;
}
export const getInvites = async () => {
  return api.get<{ invitations: IInvite[] }>(`/v1/users/pending-invitations`);
};
