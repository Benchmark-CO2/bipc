import api from "@/service/api";

export const postEmailToResetPassword = async (email: string) => {
  return await api.post<{ message: string }>(`/v1/tokens/password-reset`, {
    email,
  });
};
