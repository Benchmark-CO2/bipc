import api from "@/service/api";

export const getIfcRequestResult = (clientId: string, requestId: string) => {
  return api.get(`/v1/proxy/request/result/${clientId}/${requestId}`);
};

