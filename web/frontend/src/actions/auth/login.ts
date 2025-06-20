import api from "@/service/api"

interface TAuthParams {
  email: string
  password: string
}

export const login = (authParams: TAuthParams) => {
  return api.post('/auth/login', authParams)
}