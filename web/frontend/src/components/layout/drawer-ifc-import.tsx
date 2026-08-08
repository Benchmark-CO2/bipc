import { postDisciplineFileUpload } from "@/actions/disciplines/postDisciplineFileUpload";
import { getIfcFallbacks } from "@/actions/ifc/getIfcFallbacks";
import { getIfcRequestResult } from "@/actions/ifc/getIfcRequestResult";
import { getIfcRequests } from "@/actions/ifc/getIfcRequests";
import { postIfcCreateRequest } from "@/actions/ifc/postIfcCreateRequest";
import { getProjectByUUID } from "@/actions/projects/getProject";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import {
  TIfcProcessorAggregatedResult,
  TIfcProcessorFallbackVersion,
  TIfcProcessorImportStatus,
  TIfcProcessorRequestListItem,
} from "@/types/ifc";
import { TRole } from "@/types/disciplines";
import { dateUtils } from "@/utils/date";
import { parseApiError } from "@/utils/parseApiError";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { AlertTriangle, FileUp, Loader2, Upload, X } from "lucide-react";
import { useMemo, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "../ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../ui/drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Checkbox } from "../ui/checkbox";
import { SimpleTooltip } from "../ui/simple-tooltip";
import DrawerStepperIFC from "./drawer-stepper-ifc";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FileType = "ifc" | "tqs";
export type IFCAccessMode = "project" | "unit" | "simulation";

export interface DrawerIFCImportProps {
  /** Determines the context in which the drawer is opened */
  mode: IFCAccessMode;
  projectId: string;
  unitId?: string;
  roleId?: string;
  optionId?: string;
  triggerComponent: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Mock data — replace with real API responses when backend is ready
// ---------------------------------------------------------------------------

type ImportedIFCFile = {
  id: string;
  name: string;
  date: string;
  status: TIfcProcessorImportStatus;
  errorMessage?: string | null;
};

const MOCK_SOFTWARE_TQS = [{ value: "tqs", label: "TQS" }];

const MOCK_VERSIONS_TQS = [{ value: "tqsv26", label: "tqsv26" }];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FileTypeTabs({
  value,
  onChange,
  availableFileTypes,
}: {
  value: FileType;
  onChange: (v: FileType) => void;
  availableFileTypes?: FileType[];
}) {
  const { t } = useTranslation();
  const fileTypes = availableFileTypes ?? (["ifc", "tqs"] as FileType[]);
  return (
    <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-lg p-1 w-fit">
      {fileTypes.map((ft) => (
        <button
          key={ft}
          type="button"
          onClick={() => onChange(ft)}
          className={cn(
            "px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-150",
            value === ft
              ? "bg-primary text-white shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-gray-100 dark:hover:bg-gray-800",
          )}
        >
          {ft === "ifc" ? t.drawerIFC.tabIFC : t.drawerIFC.tabTQS}
        </button>
      ))}
    </div>
  );
}

function ProcessingView({ fileType }: { fileType: FileType }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center gap-8 px-8 pb-10 flex-1">
      <FileUp className="h-20 w-20 text-primary" />
      <div className="w-full max-w-md">
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full w-1/2 bg-primary animate-pulse" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        {fileType === "ifc"
          ? t.drawerIFC.processingMessageIFC
          : t.drawerIFC.processingMessageTQS}
      </p>
    </div>
  );
}

function DropZone({
  fileType,
  file,
  onFileChange,
  onInvalidFile,
}: {
  fileType: FileType;
  file: File | null;
  onFileChange: (f: File | null) => void;
  onInvalidFile?: (message: string) => void;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const validateAndSetFile = (candidate: File) => {
    const name = candidate.name.toLowerCase();
    const isValid =
      fileType === "ifc"
        ? name.endsWith(".ifc")
        : name.endsWith(".html") || name.endsWith(".htm");

    if (!isValid) {
      const message =
        fileType === "ifc"
          ? t.drawerIFC.invalidFileTypeIFC
          : t.drawerIFC.invalidFileTypeTQS;

      onInvalidFile?.(message);
      toast.warning(message);
      return;
    }

    onInvalidFile?.("");
    onFileChange(candidate);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSetFile(dropped);
  };

  const accept = fileType === "ifc" ? ".ifc" : ".htm,.html";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={
        fileType === "ifc"
          ? t.drawerIFC.dropZoneAriaIFC
          : t.drawerIFC.dropZoneAriaTQS
      }
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={handleDrop}
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 cursor-pointer transition-colors",
        isDragging
          ? "border-primary bg-primary/5"
          : "border-gray-300 dark:border-gray-600 hover:border-primary/60 hover:bg-primary/5",
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            validateAndSetFile(f);
          } else {
            onInvalidFile?.("");
            onFileChange(null);
          }
          e.target.value = "";
        }}
      />
      {file ? (
        <div className="flex items-center gap-2 text-sm text-primary font-medium">
          <FileUp className="h-5 w-5" />
          <span className="max-w-xs truncate">{file.name}</span>
          <SimpleTooltip content={t.drawerIFC.removeFile}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onFileChange(null);
              }}
              className="ml-1 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </button>
          </SimpleTooltip>
        </div>
      ) : (
        <>
          <div className="flex flex-col items-center gap-1 text-muted-foreground">
            <div className="flex flex-col items-center gap-1">
              <Upload className="h-8 w-8 opacity-40" />
              <span className="text-xs font-medium opacity-60 uppercase tracking-wide">
                {fileType.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-center mt-1">
              {fileType === "ifc"
                ? t.drawerIFC.dropZoneLabelIFC
                : t.drawerIFC.dropZoneLabelTQS}
            </p>
          </div>
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function DrawerIFCImport({
  mode,
  projectId,
  unitId,
  roleId,
  triggerComponent,
}: DrawerIFCImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [fileType, setFileType] = useState<FileType>("ifc");
  const [software, setSoftware] = useState("");
  const [version, setVersion] = useState("");
  const [calculateGeometries, setCalculateGeometries] = useState(true);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [importErrorMessage, setImportErrorMessage] = useState("");
  const [fileWarningMessage, setFileWarningMessage] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");

  // "Already imported" section state
  const [selectedFileId, setSelectedFileId] = useState("");

  // Stepper (aplicar dados IFC)
  const [stepperOpen, setStepperOpen] = useState(false);
  const [stepperResult, setStepperResult] =
    useState<TIfcProcessorAggregatedResult | null>(null);
  const [stepperMountKey, setStepperMountKey] = useState(0);

  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const clientId = user?.id ?? "";
  const navigate = useNavigate();

  const hasFileTypeTabs = mode === "simulation";
  const canUploadTqs = mode === "simulation" && !!unitId && !!roleId;

  // Carregar disciplinas (roles) do projeto — filtramos apenas simulation=true
  const { data: projectDataForRoles, isLoading: isLoadingProjectRoles } =
    useQuery({
      queryKey: ["project", projectId],
      queryFn: () => getProjectByUUID(projectId),
      enabled: isOpen,
      staleTime: 1000 * 60 * 5,
    });
  const simulationRoles: TRole[] = useMemo(() => {
    const roles =
      (projectDataForRoles?.data?.project?.roles as TRole[] | undefined) ?? [];
    return roles.filter((r) => r.simulation);
  }, [projectDataForRoles]);

  // Regra do usuário: só mostra select quando a prop roleId não é fornecida.
  // Quando roleId prop existe (mode simulation), NÃO mostra o select e usa o prop.
  const needsRolePrompt = !roleId;
  const effectiveRoleId = roleId ?? selectedRoleId;

  // Pré-selecionar a 1ª discipline simulation quando abrir e nada selecionado,
  // OU quando o roleId selecionado não existe mais na lista (ex.: disciplina apagada).
  useEffect(() => {
    if (!needsRolePrompt || !isOpen) return;
    if (simulationRoles.length === 0) {
      if (selectedRoleId) setSelectedRoleId("");
      return;
    }
    const exists = simulationRoles.some((r) => r.id === selectedRoleId);
    if (!exists) {
      setSelectedRoleId(simulationRoles[0]!.id);
    }
  }, [needsRolePrompt, isOpen, simulationRoles, selectedRoleId]);

  const { mutate: uploadTqsFile, isPending: isUploadingTqsFile } = useMutation({
    mutationFn: () =>
      postDisciplineFileUpload(projectId, unitId!, roleId!, {
        file: uploadFile!,
        source: "tqs",
      }),
    onSuccess: () => {
      toast.success(t.drawerIFC.importSuccess);
      queryClient.invalidateQueries({
        queryKey: ["options", projectId, unitId],
      });
      handleClose(true);
    },
    onError: (error) => {
      const errorMessage = parseApiError(error, t);
      setImportErrorMessage(errorMessage);
      toast.error(t.drawerIFC.importError, {
        description: errorMessage,
      });
    },
  });

  const {
    data: ifcFallbacksRaw,
    isLoading: isLoadingIfcFallbacks,
    isError: isIfcFallbacksError,
  } = useQuery({
    queryKey: ["ifcFallbacks"],
    queryFn: async () => {
      const res = await getIfcFallbacks();
      return res.data.version_list;
    },
    enabled: isOpen && fileType === "ifc",
  });

  const ifcPendingStatuses: TIfcProcessorImportStatus[] = [
    "waiting_for_files",
    "processing",
  ];
  const ifcIsPendingStatus = (status: TIfcProcessorImportStatus) =>
    ifcPendingStatuses.includes(status);
  const ifcStatusLabels: Record<TIfcProcessorImportStatus, string> = {
    waiting_for_files: t.drawerIFC.statusWaitingForFiles,
    processing: t.drawerIFC.statusProcessing,
    failed: t.drawerIFC.statusFailed,
    completed: t.drawerIFC.statusCompleted,
  };
  const ifcStatusHintRenderers: Record<
    Exclude<TIfcProcessorImportStatus, "completed">,
    (file: ImportedIFCFile) => React.ReactNode
  > = {
    waiting_for_files: () => (
      <div className="bg-yellow-50 dark:bg-yellow-950/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            {t.drawerIFC.waitingForFilesSelectHint}
          </p>
        </div>
      </div>
    ),
    processing: () => (
      <div className="bg-yellow-50 dark:bg-yellow-950/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-yellow-800 dark:text-yellow-300">
            {t.drawerIFC.processingSelectHint}
          </p>
        </div>
      </div>
    ),
    failed: (file) => (
      <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-400 dark:border-red-600 rounded-lg p-4">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-red-800 dark:text-red-300">
            {file.errorMessage ?? t.drawerIFC.failedSelectHint}
          </p>
        </div>
      </div>
    ),
  };

  const {
    data: ifcRequests,
    isLoading: isLoadingIfcRequests,
    isError: isIfcRequestsError,
  } = useQuery({
    queryKey: ["ifcRequests", clientId],
    queryFn: async () => {
      const res = await getIfcRequests(clientId);
      return res.data.items;
    },
    enabled: isOpen && fileType === "ifc" && Boolean(clientId),
    refetchInterval: (q) => {
      const items = q.state.data ?? [];
      const hasPending = items.some((i) => ifcIsPendingStatus(i.status));
      return hasPending ? 30000 : false;
    },
  });

  const ifcSoftwareOptions = useMemo(() => {
    const manufacturers = new Map<string, string>();
    for (const item of ifcFallbacksRaw ?? []) {
      if (!manufacturers.has(item.manufacturer)) {
        manufacturers.set(item.manufacturer, item.manufacturer);
      }
    }
    return Array.from(manufacturers.values()).map((m) => ({
      value: m,
      label: m,
    }));
  }, [ifcFallbacksRaw]);

  const ifcVersionOptions = useMemo(() => {
    const versions: TIfcProcessorFallbackVersion[] = software
      ? (ifcFallbacksRaw ?? []).filter((f) => f.manufacturer === software)
      : [];
    return versions.map((v) => ({
      value: v.version,
      label: v.version,
    }));
  }, [ifcFallbacksRaw, software]);

  // Derived data
  const softwareOptions =
    fileType === "tqs" ? MOCK_SOFTWARE_TQS : ifcSoftwareOptions;
  const versionOptions =
    fileType === "tqs" ? MOCK_VERSIONS_TQS : ifcVersionOptions;

  const mapIfcRequestToImportedFile = (
    req: TIfcProcessorRequestListItem,
  ): ImportedIFCFile => ({
    id: req.request_id,
    name: req.file_name,
    date: dateUtils.calculateRelativeTime(new Date(req.ts_created * 1000)),
    status: req.status,
    errorMessage: req.error_message,
  });

  const ifcImportedFiles: ImportedIFCFile[] = (ifcRequests ?? [])
    .slice()
    .sort((a, b) => b.ts_created - a.ts_created)
    .map(mapIfcRequestToImportedFile);

  const selectedIfcFile = ifcImportedFiles.find((f) => f.id === selectedFileId);

  const bufferToBase64 = (buffer: ArrayBuffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]!);
    }
    return btoa(binary);
  };

  const sha256Base64 = async (file: File) => {
    const buf = await file.arrayBuffer();
    const digest = await crypto.subtle.digest("SHA-256", buf);
    return bufferToBase64(digest);
  };

  const { mutate: importIfcFile, isPending: isImportingIfcFile } = useMutation({
    mutationFn: async () => {
      if (!clientId) throw new Error("Missing client id");
      if (!uploadFile) throw new Error("Missing file");
      if (!software || !version) throw new Error("Missing metadata");

      const fileHash = await sha256Base64(uploadFile);
      const res = await postIfcCreateRequest(clientId, {
        manufacturer: software,
        version,
        file_name: uploadFile.name,
        file_hash: fileHash,
        calculate_geometries: calculateGeometries,
      });

      const putRes = await fetch(res.data.ifc_url, {
        method: "PUT",
        headers: {
          "Content-Type": "application/x-ifc",
          "If-None-Match": "*",
        },
        body: uploadFile,
      });

      if (!putRes.ok) {
        throw new Error(`Upload failed (${putRes.status})`);
      }

      return res.data.request_id;
    },
    onSuccess: (requestId) => {
      toast.success(t.drawerIFC.importQueuedIFC);
      queryClient.invalidateQueries({ queryKey: ["ifcRequests", clientId] });
      setSelectedFileId(requestId);
      setUploadFile(null);
      setSoftware("");
      setVersion("");
      setCalculateGeometries(true);
      setImportErrorMessage("");
      setFileWarningMessage("");
    },
    onError: (error) => {
      const message =
        error instanceof Error ? error.message : t.common.unknownError;
      setImportErrorMessage(message);
      toast.error(t.drawerIFC.importError, {
        description: message,
      });
    },
  });

  const { mutate: fetchIfcResult, isPending: isFetchingIfcResult } =
    useMutation({
      mutationFn: () => getIfcRequestResult(clientId, selectedFileId),
      onSuccess: (res) => {
        const data = res.data as unknown as TIfcProcessorAggregatedResult;
        if (!data.units && !data.modules) {
          toast.error("Dados do IFC vazios ou formato inválido.");
          return;
        }
        setStepperResult(data);
        setStepperMountKey((k) => k + 1);
        setStepperOpen(true);
        setIsOpen(false);
      },
      onError: (error) => {
        const errorMessage = parseApiError(error, t);
        setImportErrorMessage(errorMessage);
        toast.error(t.drawerIFC.useSelectedError, {
          description: errorMessage,
        });
      },
    });

  const handleClose = (force?: boolean) => {
    if (!force && (isUploadingTqsFile || isImportingIfcFile)) return;
    setIsOpen(false);
    setFileType("ifc");
    setSoftware("");
    setVersion("");
    setCalculateGeometries(true);
    setUploadFile(null);
    setImportErrorMessage("");
    setFileWarningMessage("");
    setSelectedFileId("");
    setStepperResult(null);
    setStepperOpen(false);
    setSelectedRoleId("");
  };

  const handleFileTypeChange = (ft: FileType) => {
    setFileType(ft);
    setImportErrorMessage("");
    setFileWarningMessage("");
    setUploadFile(null);
    setSoftware(ft === "tqs" ? "tqs" : "");
    setVersion(ft === "tqs" ? "tqsv26" : "");
    setCalculateGeometries(true);
  };

  const handleSoftwareChange = (val: string) => {
    setSoftware(val);
    setVersion("");
  };

  const handleFileSelect = (fileId: string) => {
    setSelectedFileId(fileId);
  };

  const handleImport = () => {
    if (fileType === "tqs") {
      if (!uploadFile || !canUploadTqs) return;
      setImportErrorMessage("");
      uploadTqsFile();
      return;
    }

    if (needsRolePrompt && !effectiveRoleId) {
      toast.error(t.drawerIFC.simulationRoleMissing);
      return;
    }
    if (!uploadFile || !software || !version || !clientId) return;
    setImportErrorMessage("");
    importIfcFile();
  };

  const handleUseSelected = () => {
    if (fileType !== "ifc") return;
    if (!selectedIfcFile || selectedIfcFile.status !== "completed") return;
    if (needsRolePrompt && !effectiveRoleId) {
      toast.error(t.drawerIFC.simulationRoleMissing);
      return;
    }
    setImportErrorMessage("");
    fetchIfcResult();
  };

  const drawerTitle = hasFileTypeTabs
    ? t.drawerIFC.titleImport
    : t.drawerIFC.title;

  const importLabel =
    fileType === "ifc"
      ? t.drawerIFC.sectionImportIFC
      : t.drawerIFC.sectionImportTQS;
  const alreadyImportedLabel =
    fileType === "ifc"
      ? t.drawerIFC.sectionAlreadyImportedIFC
      : t.drawerIFC.sectionAlreadyImportedTQS;

  return (
    <>
      <Drawer
        direction={isMobile ? "bottom" : "right"}
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) {
            handleClose(false);
            return;
          }
          setIsOpen(open);
          if (open && !hasFileTypeTabs) {
            setFileType("ifc");
            setSoftware("");
            setVersion("");
            setUploadFile(null);
            setImportErrorMessage("");
          }
        }}
        onClose={handleClose}
        dismissible={false}
      >
        <DrawerTrigger asChild>{triggerComponent}</DrawerTrigger>
        <DrawerContent
          className={cn("min-w-3/5", {
            "w-full h-4/5": isMobile,
          })}
        >
          <DrawerHeader className="px-8 pb-2">
            <DrawerTitle>{drawerTitle}</DrawerTitle>
            <Button
              onClick={() => handleClose()}
              className="absolute right-4 top-2"
              variant="ghost"
              size="icon"
              disabled={isUploadingTqsFile || isImportingIfcFile}
            >
              <X className="h-4 w-4" />
            </Button>
          </DrawerHeader>

          {isUploadingTqsFile || isImportingIfcFile ? (
            <ProcessingView fileType={fileType} />
          ) : (
            <div className="flex flex-col gap-2 overflow-y-auto px-8 pb-8">
              {hasFileTypeTabs && (
                <div className="pb-2">
                  <p className="text-xs text-muted-foreground mb-2">
                    {t.drawerIFC.fileTypeLabel}
                  </p>
                  <FileTypeTabs
                    value={fileType}
                    onChange={handleFileTypeChange}
                  />
                </div>
              )}

              {/* ────────────────────────────────────────────
              Section 1 — Import new file
          ──────────────────────────────────────────── */}
              <section>
                <h3 className="text-base font-semibold text-foreground mb-2">
                  {importLabel}
                </h3>

                <div className="flex flex-col gap-4">
                  {/* Software + Version selects */}
                  <div className="grid grid-cols-[2fr_1fr] gap-3 items-start">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm text-muted-foreground">
                        {t.drawerIFC.softwareLabel}{" "}
                        {fileType === "ifc" && (
                          <span className="text-destructive">*</span>
                        )}
                      </label>
                      <Select
                        value={software}
                        onValueChange={handleSoftwareChange}
                        disabled={
                          fileType === "tqs" ||
                          (fileType === "ifc" && isLoadingIfcFallbacks)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              fileType === "ifc" && isLoadingIfcFallbacks
                                ? t.drawerIFC.loadingSoftwareVersions
                                : t.drawerIFC.softwarePlaceholder
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {fileType === "ifc" && isLoadingIfcFallbacks ? (
                            <SelectItem value="__loading__" disabled>
                              {t.drawerIFC.loadingSoftwareVersions}
                            </SelectItem>
                          ) : fileType === "ifc" && isIfcFallbacksError ? (
                            <SelectItem value="__error__" disabled>
                              {t.common.unknownError}
                            </SelectItem>
                          ) : fileType === "ifc" &&
                            softwareOptions.length === 0 ? (
                            <SelectItem value="__empty__" disabled>
                              {t.drawerIFC.noSoftwareVersions}
                            </SelectItem>
                          ) : (
                            softwareOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm text-muted-foreground">
                        {t.drawerIFC.versionLabel}{" "}
                        {fileType === "ifc" && (
                          <span className="text-destructive">*</span>
                        )}
                      </label>
                      <Select
                        value={version}
                        onValueChange={setVersion}
                        disabled={
                          fileType === "tqs" ||
                          !software ||
                          (fileType === "ifc" && isLoadingIfcFallbacks)
                        }
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue
                            placeholder={
                              fileType === "ifc" && isLoadingIfcFallbacks
                                ? t.drawerIFC.loadingSoftwareVersions
                                : t.drawerIFC.versionPlaceholder
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {fileType === "ifc" && isLoadingIfcFallbacks ? (
                            <SelectItem value="__loading__" disabled>
                              {t.drawerIFC.loadingSoftwareVersions}
                            </SelectItem>
                          ) : fileType === "ifc" &&
                            !software ? null : fileType === "ifc" &&
                            versionOptions.length === 0 ? (
                            <SelectItem value="__empty__" disabled>
                              {t.drawerIFC.noSoftwareVersions}
                            </SelectItem>
                          ) : (
                            versionOptions.map((opt) => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Drop zone */}
                  <DropZone
                    fileType={fileType}
                    file={uploadFile}
                    onFileChange={(f) => {
                      setUploadFile(f);
                      setFileWarningMessage("");
                      if (!f) {
                        setImportErrorMessage("");
                      }
                    }}
                    onInvalidFile={setFileWarningMessage}
                  />

                  {fileType === "ifc" && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={calculateGeometries}
                        onCheckedChange={(v) =>
                          setCalculateGeometries(v === true)
                        }
                      />
                      <span className="text-sm text-muted-foreground">
                        {t.drawerIFC.calculateGeometriesLabel}{" "}
                        <span className="text-muted-foreground">
                          ({t.drawerIFC.calculateGeometriesHint})
                        </span>
                      </span>
                    </div>
                  )}

                  {importErrorMessage && !isUploadingTqsFile && (
                    <div className="p-0">
                      <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-400 dark:border-red-600 rounded-lg p-4">
                        <div className="flex gap-3">
                          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-red-800 dark:text-red-300">
                            {importErrorMessage}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {fileWarningMessage && (
                    <div className="bg-yellow-50 dark:bg-yellow-950/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-4">
                      <div className="flex gap-3">
                        <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-yellow-800 dark:text-yellow-300">
                          {fileWarningMessage}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Action buttons */}
                  <div className="flex items-center justify-between gap-2">
                    {fileType === "ifc" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled
                        className="text-sm"
                      >
                        {t.drawerIFC.manageFiles}
                      </Button>
                    ) : (
                      <div />
                    )}
                    <Button
                      variant="bipc"
                      size="sm"
                      disabled={
                        fileType === "ifc"
                          ? !uploadFile ||
                            !software ||
                            !version ||
                            !clientId ||
                            (needsRolePrompt && !effectiveRoleId)
                          : !uploadFile || !canUploadTqs
                      }
                      onClick={handleImport}
                      className="text-white"
                    >
                      {fileType === "tqs" && isUploadingTqsFile ? (
                        <span className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          {t.drawerIFC.importData}
                        </span>
                      ) : (
                        t.drawerIFC.importData
                      )}
                    </Button>
                  </div>
                </div>
              </section>

              {fileType === "ifc" && (
                <>
                  <div className="border-t border-gray-200 dark:border-gray-700 mt-4 mb-2" />

                  <section>
                    <h3 className="text-base font-semibold text-foreground mb-2 mt-2">
                      {alreadyImportedLabel}
                    </h3>

                    <div className="flex flex-col gap-4">
                      {/* File select + Discipline select (quando aplicável) em GRID 2 cols */}
                      <div
                        className={cn(
                          "grid gap-3 items-start",
                          needsRolePrompt ? "grid-cols-2" : "grid-cols-[1fr]",
                        )}
                      >
                        <div className="flex flex-col gap-1.5">
                          <label className="text-sm text-muted-foreground">
                            {t.drawerIFC.selectFileLabel}{" "}
                            <span className="text-destructive">*</span>
                          </label>
                          <Select
                            value={selectedFileId}
                            onValueChange={handleFileSelect}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue
                                placeholder={t.drawerIFC.selectFilePlaceholder}
                              />
                            </SelectTrigger>
                            <SelectContent>
                              {isLoadingIfcRequests ? (
                                <SelectItem value="__loading__" disabled>
                                  {t.common.loading}
                                </SelectItem>
                              ) : isIfcRequestsError ? (
                                <SelectItem value="__error__" disabled>
                                  {t.common.unknownError}
                                </SelectItem>
                              ) : ifcImportedFiles.length === 0 ? (
                                <SelectItem value="__empty__" disabled>
                                  {t.drawerIFC.noImportedFiles}
                                </SelectItem>
                              ) : (
                                ifcImportedFiles.map((f) => (
                                  <SelectItem key={f.id} value={f.id}>
                                    <span className="flex items-center gap-2 min-w-0">
                                      <span className="truncate min-w-0">
                                        {f.name}
                                      </span>
                                      <span className="text-muted-foreground shrink-0">
                                        — {f.date} ({ifcStatusLabels[f.status]})
                                      </span>
                                    </span>
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        {/* Discipline select — SÓ quando roleId prop não passado */}
                        {needsRolePrompt && (
                          <div className="flex flex-col gap-1.5">
                            <label className="text-sm text-muted-foreground">
                              {t.drawerIFC.disciplineLabel}{" "}
                              <span className="text-destructive">*</span>
                            </label>
                            <Select
                              value={selectedRoleId}
                              onValueChange={setSelectedRoleId}
                              disabled={
                                isLoadingProjectRoles ||
                                simulationRoles.length === 0
                              }
                            >
                              <SelectTrigger className="w-full">
                                <SelectValue
                                  placeholder={
                                    isLoadingProjectRoles
                                      ? t.common.loading
                                      : simulationRoles.length === 0
                                        ? t.drawerIFC.disciplinePlaceholder
                                        : t.drawerIFC.disciplinePlaceholder
                                  }
                                />
                              </SelectTrigger>
                              <SelectContent>
                                {isLoadingProjectRoles ? (
                                  <SelectItem value="__loading__" disabled>
                                    {t.common.loading}
                                  </SelectItem>
                                ) : simulationRoles.length === 0 ? (
                                  <SelectItem value="__empty__" disabled>
                                    {t.drawerIFC.disciplinePlaceholder}
                                  </SelectItem>
                                ) : (
                                  simulationRoles.map((r) => (
                                    <SelectItem key={r.id} value={r.id}>
                                      {r.name}
                                    </SelectItem>
                                  ))
                                )}
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </div>

                      {/* Warning NENHUMA disciplina cadastrada — ABAIXO dos 2 selects, com CTA navigate */}
                      {needsRolePrompt &&
                        !isLoadingProjectRoles &&
                        simulationRoles.length === 0 && (
                          <div className="bg-yellow-50 dark:bg-yellow-950/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-4">
                            <div className="flex flex-col gap-3">
                              <div className="flex gap-3">
                                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                                  {t.drawerIFC.noDisciplinesHint}
                                </p>
                              </div>
                              <div className="flex justify-end pl-8">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    navigate({
                                      to: `/new_projects/${projectId}`,
                                      search: {
                                        tab: "disciplinas",
                                      } as Record<string, string>,
                                      replace: false,
                                    });
                                    setIsOpen(false);
                                  }}
                                >
                                  {t.drawerIFC.disciplinesGoTo}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}

                      {selectedIfcFile?.status &&
                        selectedIfcFile.status !== "completed" &&
                        ifcStatusHintRenderers[selectedIfcFile.status](
                          selectedIfcFile,
                        )}

                      <div className="flex justify-end">
                        <Button
                          variant="bipc"
                          size="sm"
                          className="text-white"
                          disabled={
                            !selectedFileId ||
                            selectedIfcFile?.status !== "completed" ||
                            isFetchingIfcResult ||
                            (needsRolePrompt && !effectiveRoleId)
                          }
                          onClick={handleUseSelected}
                        >
                          {isFetchingIfcResult ? (
                            <span className="flex items-center gap-2">
                              <Loader2 className="h-4 w-4 animate-spin" />
                              {t.drawerIFC.useSelected}
                            </span>
                          ) : (
                            t.drawerIFC.useSelected
                          )}
                        </Button>
                      </div>
                    </div>
                  </section>
                </>
              )}
            </div>
          )}
        </DrawerContent>
      </Drawer>

      {stepperResult && effectiveRoleId && (
        <DrawerStepperIFC
          key={`stepper-${stepperMountKey}`}
          open={stepperOpen}
          onOpenChange={(open) => {
            setStepperOpen(open);
            if (!open) {
              queryClient.invalidateQueries({
                queryKey: ["project", projectId],
              });
              queryClient.invalidateQueries({
                queryKey: ["units", projectId],
              });
              if (mode === "simulation" && unitId) {
                queryClient.invalidateQueries({
                  queryKey: ["options", projectId, unitId],
                });
              }
            }
          }}
          projectId={projectId}
          initialResult={stepperResult!}
          initialRoleId={effectiveRoleId}
          onComplete={() => {
            setStepperResult(null);
          }}
        />
      )}
    </>
  );
}
