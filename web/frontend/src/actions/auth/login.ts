import api from "@/service/api";
import { AxiosResponse } from 'axios';

interface TAuthParams {
  email: string
  password: string
}

export interface TLoginResponse {
  authentication_token: {
		token: string,
		expiry: string
	},
	user: {
		id: number,
		created_at: string,
		name: string,
		email: string,
		activated: boolean
	}
}

export const login = (authParams: TAuthParams): Promise<AxiosResponse<TLoginResponse>> => {
  return api.post('/v1/tokens/authentication', authParams)
}