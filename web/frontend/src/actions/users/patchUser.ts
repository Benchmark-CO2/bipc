import api from "@/service/api";

export interface UpdateUserParams {
  name?: string;
  email?: string;
  password?: string;
  crea_cau?: string;
  birthdate?: string;
  city?: string;
  activity?: string;
  enterprise?: string;
}

export const patchUser = (userParams: UpdateUserParams) => {
  return api.patch("/v1/users", userParams);
};
