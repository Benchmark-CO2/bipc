import api from "@/service/api";

interface TransferOwnershipParams {
  new_owner_id: string;
}

export const transferOwnership = (
  projectId: string,
  params: TransferOwnershipParams,
) => {
  return api.put(`/v1/projects/${projectId}/transfer-ownership`, params);
};
