import api from "@/service/api";

interface TAuthParams {
  name: string;
  email: string;
  password: string;
  type: "member" | "company";
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
}

export const register = (authParams: TAuthParams) => {
  return api.post("/v1/users", authParams);
};
