import axios from 'axios';

// import api from "@/service/api";
const api = axios
export const postFile = (url: string, fileParams: FormData) => {
  return api.post<{ fileName: string; fileUrl: string }>(url, fileParams, {
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
};
