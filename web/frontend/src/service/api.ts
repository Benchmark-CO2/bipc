import { BASE_URL } from '@/utils/constants';
import axios from 'axios';

const api = axios.create({
  baseURL: BASE_URL as string,
})

// api.interceptors.request.use(
//   (config) => {
//     const token = localStorage.getItem(storageTokenKey)
//     if (token) {
//       config.headers.Authorization = `Bearer ${token}`
//     }
//     return config
//   },
//   (error: Error) => {
//     return Promise.reject(error)
//   }
// )

export default api