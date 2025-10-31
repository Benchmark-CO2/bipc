export interface TUser {
  id: number;
  created_at: string;
  name: string;
  email: string;
  activated: boolean;
  crea_cau?: string;
  birthdate?: string;
  city?: string;
  activity?: string;
  enterprise?: string;
}
