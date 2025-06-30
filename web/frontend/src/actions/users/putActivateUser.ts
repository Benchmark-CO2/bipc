import api from "@/service/api";
import { TUser } from "@/types/user";

export const putActivateUser = async (token: string) => {
  return await api.put<{ user: TUser }>(`/v1/users/activated`, {
    token,
  });
};
