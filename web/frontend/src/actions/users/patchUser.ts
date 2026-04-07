import api from "@/service/api";

export interface UpdateUserParams {
  name?: string;
  email?: string;
  password?: string;
  cnpj?: string;
  crea_cau?: string;
  birthdate?: string;
  city?: string;
  activity?: string;
  enterprise?: string;
  cep?: string;
  state?: string;
  neighborhood?: string;
  street?: string;
  number?: string;
  complement?: string;
}

export const patchUser = (userParams: UpdateUserParams) => {
  const { birthdate, ...rest } = userParams;
  return api.patch("/v1/users", {
    ...rest,
    ...(birthdate && { birthdate }),
  });
};
