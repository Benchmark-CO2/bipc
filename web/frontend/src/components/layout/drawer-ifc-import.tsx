import { useIsMobile } from "@/hooks/useIsMobile";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import { FileUp, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Checkbox } from "../ui/checkbox";
import { SimpleTooltip } from "../ui/simple-tooltip";

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
  optionId?: string;
  triggerComponent: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Mock data — replace with real API responses when backend is ready
// ---------------------------------------------------------------------------

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

const MOCK_VERSIONS_TQS = [
  { value: "v26", label: "V26" },
  { value: "v27", label: "V27" },
  { value: "v28", label: "V28" },
];

const MOCK_IMPORTED_FILES = [
  { id: "f1", name: "estrutural123tqs", date: "14/04/2026" },
  { id: "f2", name: "edificio_residencial_v2", date: "10/03/2026" },
  { id: "f3", name: "torre_araucaria_ifc", date: "22/01/2026" },
];

const MOCK_TECHNOLOGIES_BY_FILE: Record<
  string,
  { id: string; type: string; name: string }[]
> = {
  f1: [
    { id: "t1", type: "Torre", name: "Ed. Flamboyant" },
    { id: "t2", type: "Torre", name: "Ed. Araucária" },
  ],
  f2: [
    { id: "t3", type: "Pórtico", name: "Bloco A" },
    { id: "t4", type: "Parede de concreto", name: "Bloco B" },
    { id: "t5", type: "Fundação", name: "Bloco A - Fundação" },
  ],
  f3: [
    { id: "t6", type: "Pórtico", name: "Torre Principal" },
    { id: "t7", type: "Parede de concreto", name: "Torre Secundária" },
    { id: "t8", type: "Fundação", name: "Radier" },
  ],
};

const MOCK_UNITS_BY_FILE: Record<string, { id: string; name: string }[]> = {
  f1: [
    { id: "u1", name: "Torre 1" },
    { id: "u2", name: "Torre 2" },
  ],
  f2: [
    { id: "u3", name: "Bloco A" },
    { id: "u4", name: "Bloco B" },
    { id: "u5", name: "Bloco C" },
  ],
  f3: [
    { id: "u6", name: "Torre Principal" },
    { id: "u7", name: "Torre Secundária" },
  ],
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FileTypeTabs({
  value,
  onChange,
}: {
  value: FileType;
  onChange: (v: FileType) => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center gap-1 border border-gray-200 dark:border-gray-700 rounded-lg p-1 w-fit">
      {(["ifc", "tqs"] as FileType[]).map((ft) => (
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

function DropZone({
  fileType,
  file,
  onFileChange,
}: {
  fileType: FileType;
  file: File | null;
  onFileChange: (f: File | null) => void;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFileChange(dropped);
  };

  const accept = fileType === "ifc" ? ".ifc" : ".tqs,.zip";

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
          onFileChange(f ?? null);
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
  triggerComponent,
}: DrawerIFCImportProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [fileType, setFileType] = useState<FileType>("ifc");
  const [software, setSoftware] = useState("");
  const [version, setVersion] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // "Already imported" section state
  const [selectedFileId, setSelectedFileId] = useState("");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [selectedTechIds, setSelectedTechIds] = useState<string[]>([]);

  const isMobile = useIsMobile();
  const { t } = useTranslation();

  // Derived data
  const softwareOptions =
    fileType === "tqs" ? MOCK_SOFTWARE_TQS : MOCK_SOFTWARE_IFC;
  const versionOptions =
    fileType === "tqs"
      ? MOCK_VERSIONS_TQS
      : software
        ? (MOCK_VERSIONS_IFC[software] ?? [])
        : [];

  const technologies = selectedFileId
    ? (MOCK_TECHNOLOGIES_BY_FILE[selectedFileId] ?? [])
    : [];
  const units = selectedFileId
    ? (MOCK_UNITS_BY_FILE[selectedFileId] ?? [])
    : [];

  const handleClose = () => {
    setIsOpen(false);
    setFileType("ifc");
    setSoftware("");
    setVersion("");
    setUploadFile(null);
    setSelectedFileId("");
    setSelectedUnitId("");
    setSelectedTechIds([]);
  };

  const handleFileTypeChange = (ft: FileType) => {
    setFileType(ft);
    setSoftware(ft === "tqs" ? "tqs" : "");
    setVersion("");
  };

  const handleSoftwareChange = (val: string) => {
    setSoftware(val);
    setVersion("");
  };

  const handleFileSelect = (fileId: string) => {
    setSelectedFileId(fileId);
    setSelectedUnitId("");
    setSelectedTechIds([]);
  };

  const handleUnitSelect = (unitId: string) => {
    setSelectedUnitId(unitId);
    setSelectedTechIds([]);
  };

  const toggleTech = (id: string) => {
    setSelectedTechIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const toggleAllTechs = () => {
    if (selectedTechIds.length === technologies.length) {
      setSelectedTechIds([]);
    } else {
      setSelectedTechIds(technologies.map((t) => t.id));
    }
  };

  const handleImport = () => {
    // TODO: call API to upload file and trigger import
    console.info("[DrawerIFCImport] import", { software, version, uploadFile });
  };

  const handleUseSelected = () => {
    // TODO: call API to apply selected technologies from imported file
    console.info("[DrawerIFCImport] use selected", {
      selectedFileId,
      selectedTechIds,
      selectedUnitId,
    });
  };

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
      onOpenChange={setIsOpen}
      onClose={handleClose}
      dismissible={false}
    >
      <DrawerTrigger asChild>{triggerComponent}</DrawerTrigger>
      <DrawerContent
        className={cn("min-w-2/5", {
          "w-full h-4/5": isMobile,
        })}
      >
        <DrawerHeader className="px-8 pb-2">
          <DrawerTitle>{t.drawerIFC.title}</DrawerTitle>
          <Button
            onClick={handleClose}
            className="absolute right-4 top-2"
            variant="ghost"
            size="icon"
          >
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>

        {/* File type tab */}
        <div className="px-8 pb-4">
          <p className="text-xs text-muted-foreground mb-2">
            {t.drawerIFC.fileTypeLabel}
          </p>
          <FileTypeTabs value={fileType} onChange={handleFileTypeChange} />
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto px-8 pb-8">
          {/* ────────────────────────────────────────────
              Section 1 — Import new file
          ──────────────────────────────────────────── */}
          <section>
            <h3 className="text-base font-semibold text-foreground mb-4">
              {importLabel}
            </h3>

            <div className="flex flex-col gap-4">
              {/* Software + Version selects */}
              <div className="grid grid-cols-[2fr_1fr] gap-3 items-start">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-muted-foreground">
                    {t.drawerIFC.softwareLabel}{" "}
                    <span className="text-destructive">*</span>
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
                    <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={version}
                    onValueChange={setVersion}
                    disabled={!software && fileType !== "tqs"}
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
                onFileChange={setUploadFile}
              />

              {/* Action buttons */}
              <div className="flex items-center justify-between gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled
                  className="text-sm"
                >
                  {t.drawerIFC.manageFiles}
                </Button>
                <Button
                  variant="bipc"
                  size="sm"
                  disabled={!uploadFile || !software || !version}
                  onClick={handleImport}
                  className="text-white"
                >
                  {t.drawerIFC.importData}
                </Button>
              </div>
            </div>
          </section>

          {/* Divider */}
          <div className="border-t border-gray-200 dark:border-gray-700" />

          {/* ────────────────────────────────────────────
              Section 2 — Use already imported data
          ──────────────────────────────────────────── */}
          <section>
            <h3 className="text-base font-semibold text-foreground mb-4">
              {alreadyImportedLabel}
            </h3>

            <div className="flex flex-col gap-4">
              {/* File select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm text-muted-foreground">
                  {t.drawerIFC.selectFileLabel}{" "}
                  <span className="text-destructive">*</span>
                </label>
                <Select value={selectedFileId} onValueChange={handleFileSelect}>
                  <SelectTrigger>
                    <SelectValue
                      placeholder={t.drawerIFC.selectFilePlaceholder}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {MOCK_IMPORTED_FILES.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name} — {f.date}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Unit select — simulation mode only */}
              {mode === "simulation" && (
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm text-muted-foreground">
                    {t.drawerIFC.selectUnitLabel}{" "}
                    <span className="text-destructive">*</span>
                  </label>
                  <Select
                    value={selectedUnitId}
                    onValueChange={handleUnitSelect}
                    disabled={!selectedFileId}
                  >
                    <SelectTrigger>
                      <SelectValue
                        placeholder={t.drawerIFC.selectUnitPlaceholder}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {units.map((u) => (
                        <SelectItem key={u.id} value={u.id}>
                          {u.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Technology table — unit and simulation modes */}
              {(mode === "unit" || mode === "simulation") && selectedFileId && (
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {t.drawerIFC.selectTechLabel}
                  </p>
                  <div className="rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <Table>
                      <TableHeader className="bg-primary text-primary-foreground">
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="text-inherit w-10">
                            <Checkbox
                              className="border-2 border-white bg-white data-[state=checked]:bg-secondary data-[state=checked]:border-secondary"
                              checked={
                                technologies.length > 0 &&
                                selectedTechIds.length === technologies.length
                                  ? true
                                  : selectedTechIds.length > 0
                                    ? "indeterminate"
                                    : false
                              }
                              onCheckedChange={toggleAllTechs}
                              aria-label={t.commonTable.selectAll}
                            />
                          </TableHead>
                          <TableHead className="text-inherit">
                            {t.drawerIFC.colType}
                          </TableHead>
                          {mode === "unit" && (
                            <TableHead className="text-inherit">
                              {t.drawerIFC.colName}
                            </TableHead>
                          )}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {technologies.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={mode === "unit" ? 3 : 2}
                              className="text-center text-muted-foreground text-sm py-6"
                            >
                              {t.drawerIFC.noTechnologies}
                            </TableCell>
                          </TableRow>
                        ) : (
                          technologies.map((tech, idx) => (
                            <TableRow
                              key={tech.id}
                              className={
                                idx % 2 === 0
                                  ? "bg-table-row-even"
                                  : "bg-table-row-odd"
                              }
                            >
                              <TableCell>
                                <Checkbox
                                  className="border border-gray-300 bg-white data-[state=checked]:bg-secondary data-[state=checked]:border-secondary"
                                  checked={selectedTechIds.includes(tech.id)}
                                  onCheckedChange={() => toggleTech(tech.id)}
                                />
                              </TableCell>
                              <TableCell className="text-sm">
                                {tech.type}
                              </TableCell>
                              {mode === "unit" && (
                                <TableCell className="text-sm">
                                  {tech.name}
                                </TableCell>
                              )}
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Use selected button */}
              <div className="flex justify-end">
                <Button
                  variant="bipc"
                  size="sm"
                  className="text-white"
                  disabled={
                    !selectedFileId ||
                    ((mode === "unit" || mode === "simulation") &&
                      selectedTechIds.length === 0) ||
                    (mode === "simulation" && !selectedUnitId)
                  }
                  onClick={handleUseSelected}
                >
                  {t.drawerIFC.useSelected}
                </Button>
              </div>
            </div>
          </section>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
