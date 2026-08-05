export type TIfcProcessorImportStatus =
  | "waiting_for_files"
  | "processing"
  | "failed"
  | "completed";

export interface TIfcProcessorFallbackVersion {
  manufacturer: string;
  version: string;
}

export interface TIfcProcessorFallbacksResponse {
  version_list: TIfcProcessorFallbackVersion[];
}

export interface TIfcProcessorCreateRequestResponse {
  request_id: string;
  ifc_url: string;
}

export interface TIfcProcessorRequestListItem {
  request_id: string;
  file_name: string;
  file_hash: string;
  status: TIfcProcessorImportStatus;
  ts_created: number;
  ts_process_begin: string | null;
  ts_process_end: string | null;
  ts_finished: string | null;
  error_message: string | null;
  error_type: string | null;
  fallback_id: string | null;
  calculate_geometries: boolean;
  client_id: string;
}

export interface TIfcProcessorRequestsResponse {
  items: TIfcProcessorRequestListItem[];
}
