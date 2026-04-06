export interface TUser {
  id: string;
  created_at: string;
  name: string;
  email: string;
  activated: boolean;
  type?: string;
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
