import { BASE_URL } from "@/utils/constants";
import { storageTokenKey } from "@/providers/authProvider";
import axios from "axios";

const api = axios.create({
  baseURL: BASE_URL as string,
});

api.interceptors.request.use(
  (config) => {
    const storedUser = localStorage.getItem(storageTokenKey);
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        if (
          parsedUser &&
          typeof parsedUser === "object" &&
          "token" in parsedUser
        ) {
          config.headers.Authorization = `Bearer ${parsedUser.token}`;
        }
      } catch (error) {
        console.error("Error parsing stored user token:", error);
      }
    }
    return config;
  },
  (error: Error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(storageTokenKey);

      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default api;
