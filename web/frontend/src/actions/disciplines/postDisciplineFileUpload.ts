import api from "@/service/api";

export type TDisciplineFileUploadSource = "tqs";

export interface PostDisciplineFileUploadParams {
  file: File;
  source: TDisciplineFileUploadSource;
}

export const postDisciplineFileUpload = (
  projectId: string,
  unitId: string,
  roleId: string,
  params: PostDisciplineFileUploadParams,
) => {
  const formData = new FormData();
  formData.append("file", params.file);
  formData.append("source", params.source);

  return api.post(
    `/v1/projects/${projectId}/units/${unitId}/roles/${roleId}/file-upload`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    },
  );
};
