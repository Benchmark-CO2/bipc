import { postDisciplineFileUpload } from "@/actions/disciplines/postDisciplineFileUpload";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import { parseApiError } from "@/utils/parseApiError";
import { queryClient } from "@/utils/queryClient";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, FileUp, Loader2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FileType = "ifc" | "tqs";
export type IFCAccessMode = "project" | "unit" | "simulation";

type IFCImportStatus = "processing" | "completed" | "failed";

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
  status: IFCImportStatus;
};

const MOCK_SOFTWARE_IFC = [
  { value: "revit", label: "Autodesk Revit" },
  { value: "cypecad", label: "CYPECAD" },
  { value: "etabs", label: "ETABS" },
  { value: "robot", label: "Robot Structural Analysis" },
  { value: "other", label: "Outro" },
];

const MOCK_SOFTWARE_TQS = [{ value: "tqs", label: "TQS" }];

const MOCK_VERSIONS_IFC: Record<string, { value: string; label: string }[]> = {
  revit: [
    { value: "2022", label: "2022" },
    { value: "2023", label: "2023" },
    { value: "2024", label: "2024" },
    { value: "2025", label: "2025" },
  ],
  cypecad: [
    { value: "2023", label: "2023" },
    { value: "2024", label: "2024" },
  ],
  etabs: [
    { value: "19", label: "v19" },
    { value: "20", label: "v20" },
    { value: "21", label: "v21" },
  ],
  robot: [
    { value: "2022", label: "2022" },
    { value: "2023", label: "2023" },
  ],
  other: [{ value: "other", label: "Outro" }],
};

const MOCK_VERSIONS_TQS = [{ value: "tqsv26", label: "tqsv26" }];

const MOCK_IMPORTED_FILES: ImportedIFCFile[] = [
  {
    id: "f1",
    name: "torre_araucaria_ifc",
    date: "22/01/2026",
    status: "completed",
  },
  {
    id: "f2",
    name: "edificio_residencial_v2",
    date: "10/03/2026",
    status: "completed",
  },
];

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

  // "Already imported" section state
  const [ifcImportedFiles, setIfcImportedFiles] =
    useState<ImportedIFCFile[]>(MOCK_IMPORTED_FILES);
  const [selectedFileId, setSelectedFileId] = useState("");
  const ifcProcessingTimeoutsRef = useRef<number[]>([]);

  const isMobile = useIsMobile();
  const { t } = useTranslation();

  const hasFileTypeTabs = mode === "simulation";
  const canUploadTqs = mode === "simulation" && !!unitId && !!roleId;

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

  useEffect(() => {
    return () => {
      ifcProcessingTimeoutsRef.current.forEach((id) => window.clearTimeout(id));
      ifcProcessingTimeoutsRef.current = [];
    };
  }, []);

  // Derived data
  const softwareOptions =
    fileType === "tqs" ? MOCK_SOFTWARE_TQS : MOCK_SOFTWARE_IFC;
  const versionOptions =
    fileType === "tqs"
      ? MOCK_VERSIONS_TQS
      : software
        ? (MOCK_VERSIONS_IFC[software] ?? [])
        : [];
  const selectedIfcFile = ifcImportedFiles.find((f) => f.id === selectedFileId);

  const handleClose = (force?: boolean) => {
    if (!force && isUploadingTqsFile) return;
    setIsOpen(false);
    setFileType("ifc");
    setSoftware("");
    setVersion("");
    setCalculateGeometries(true);
    setUploadFile(null);
    setImportErrorMessage("");
    setFileWarningMessage("");
    setSelectedFileId("");
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

    if (!uploadFile || !software || !version) return;
    const id =
      globalThis.crypto?.randomUUID?.() ?? `ifc_${Date.now().toString(16)}`;
    const now = new Date();
    const fileName = uploadFile.name.replace(/\.[^.]+$/, "");

    const newFile: ImportedIFCFile = {
      id,
      name: fileName,
      date: now.toLocaleDateString("pt-BR"),
      status: "processing",
    };

    setIfcImportedFiles((prev) => [newFile, ...prev]);
    setSelectedFileId(id);
    setUploadFile(null);
    setSoftware("");
    setVersion("");
    setCalculateGeometries(true);
    toast.success(t.drawerIFC.importQueuedIFC);

    const timeoutId = window.setTimeout(() => {
      setIfcImportedFiles((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status: "completed" } : f)),
      );
    }, 7000);
    ifcProcessingTimeoutsRef.current.push(timeoutId);
  };

  const handleUseSelected = () => {
    if (fileType !== "ifc") return;
    if (!selectedIfcFile || selectedIfcFile.status !== "completed") return;
    toast.success(t.drawerIFC.useSelectedSuccess);
    if (mode === "simulation") {
      queryClient.invalidateQueries({
        queryKey: ["options", projectId, unitId],
      });
    } else if (mode === "unit") {
      queryClient.invalidateQueries({
        queryKey: ["project", projectId],
      });
    }
    handleClose(true);
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
    <Drawer
      direction={isMobile ? "bottom" : "right"}
      open={isOpen}
      onOpenChange={(open) => {
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
            disabled={isUploadingTqsFile}
          >
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>

        {isUploadingTqsFile ? (
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
                      disabled={fileType === "tqs"}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={t.drawerIFC.softwarePlaceholder}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {softwareOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
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
                      disabled={fileType === "tqs" || !software}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue
                          placeholder={t.drawerIFC.versionPlaceholder}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {versionOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
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
                        ? !uploadFile || !software || !version
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
                    <div className="flex flex-col gap-1.5">
                      <label className="text-sm text-muted-foreground">
                        {t.drawerIFC.selectFileLabel}{" "}
                        <span className="text-destructive">*</span>
                      </label>
                      <Select
                        value={selectedFileId}
                        onValueChange={handleFileSelect}
                      >
                        <SelectTrigger>
                          <SelectValue
                            placeholder={t.drawerIFC.selectFilePlaceholder}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {ifcImportedFiles.map((f) => (
                            <SelectItem key={f.id} value={f.id}>
                              {f.name} — {f.date} (
                              {f.status === "processing"
                                ? t.drawerIFC.statusProcessing
                                : f.status === "failed"
                                  ? t.drawerIFC.statusFailed
                                  : t.drawerIFC.statusCompleted}
                              )
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedIfcFile?.status === "processing" && (
                      <div className="bg-yellow-50 dark:bg-yellow-950/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-lg p-4">
                        <div className="flex gap-3">
                          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-yellow-800 dark:text-yellow-300">
                            {t.drawerIFC.processingSelectHint}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedIfcFile?.status === "failed" && (
                      <div className="bg-red-50 dark:bg-red-950/20 border-2 border-red-400 dark:border-red-600 rounded-lg p-4">
                        <div className="flex gap-3">
                          <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-500 flex-shrink-0 mt-0.5" />
                          <p className="text-sm text-red-800 dark:text-red-300">
                            {t.drawerIFC.failedSelectHint}
                          </p>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-end">
                      <Button
                        variant="bipc"
                        size="sm"
                        className="text-white"
                        disabled={
                          !selectedFileId ||
                          selectedIfcFile?.status !== "completed"
                        }
                        onClick={handleUseSelected}
                      >
                        {t.drawerIFC.useSelected}
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
  );
}
