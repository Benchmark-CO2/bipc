import api from "@/service/api";

interface TAuthParams {
  name: string
  email: string
  password: string
}

export const register = (authParams: TAuthParams) => {
  return api.post('/v1/users', authParams)
}