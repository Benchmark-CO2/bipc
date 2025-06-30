import api from "@/service/api";

export const postActivationUser = async (email: string) => {
  return await api.post<{ message: string }>(`/v1/tokens/activation`, {
    email,
  });
};
