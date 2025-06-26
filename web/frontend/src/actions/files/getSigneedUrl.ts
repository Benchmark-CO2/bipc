import api from "@/service/api";

export const getSignedUrl = (fileName: string) => {
  return api.get<{ 
    'form_data': {[key: string]: string},
    'url': string,
    'public_url': string,
   }>(
    `/v1/presigned-urls?fileName=${encodeURIComponent(fileName)}`
  );
};