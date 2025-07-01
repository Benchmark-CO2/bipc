import api from "@/service/api";

export const putResetPassword = async (token: string, password: string) => {
  return await api.put<{ message: string }>(`/v1/users/password`, {
    token,
    password,
  });
};
