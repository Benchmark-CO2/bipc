import api from "@/service/api";
import type { IValidateReportResponse } from "@/types/report";

export const postValidateReport = (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  return api.post<IValidateReportResponse>("/v1/reports/validate", formData);
};
