import api from "@/service/api";

export const deleteUser = () => {
  return api.delete("/v1/users");
};
