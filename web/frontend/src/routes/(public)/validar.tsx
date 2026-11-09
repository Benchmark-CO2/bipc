import { postValidateReport } from "@/actions/report/postValidateReport";
import FullLogo from "@/assets/logo_full.svg";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Divider from "@/components/ui/divider";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import { parseApiError } from "@/utils/parseApiError";
import { useMutation } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  CheckCircle,
  FileCheck,
  FileText,
  Loader2,
  Upload,
  X,
  XCircle,
} from "lucide-react";
import { useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

// Mesmo limite do backend (maxSignedPDFSize em cmd/api/report.go).
const MAX_FILE_SIZE_MB = 20;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export const Route = createFileRoute("/(public)/validar")({
  component: RouteComponent,
});

const formatFileSize = (bytes: number) =>
  `${(bytes / 1024 / 1024).toFixed(2)} MB`;

function ValidationCardShell({
  icon,
  iconWrapperClassName,
  title,
  description,
  children,
  footer,
}: {
  icon: ReactNode;
  iconWrapperClassName: string;
  title: string;
  description: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  const isMobile = useIsMobile();

  return (
    <div
      className={cn(
        "flex h-full w-full items-center justify-center transition-all overflow-auto bg-sidebar",
        {
          block: isMobile,
        },
      )}
    >
      <Card className="w-full max-w-md rounded-md">
        <CardHeader className="text-center">
          <div>
            <img src={FullLogo} alt="" className="w-full mx-auto mb-2" />
          </div>
          <Divider className="bg-accent-foreground/10" />
          <div
            className={cn(
              "mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full",
              iconWrapperClassName,
            )}
          >
            {icon}
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        {children && <CardContent>{children}</CardContent>}
        {footer && (
          <CardFooter className="flex flex-col gap-2 justify-center">
            {footer}
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

function PdfDropZone({
  file,
  onFileChange,
}: {
  file: File | null;
  onFileChange: (file: File | null) => void;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const validateAndSetFile = (candidate: File) => {
    if (!candidate.name.toLowerCase().endsWith(".pdf")) {
      toast.warning(t.validateReport.invalidFileType);
      return;
    }

    if (candidate.size > MAX_FILE_SIZE_BYTES) {
      toast.warning(
        t.validateReport.fileTooLarge.replace(
          "{size}",
          String(MAX_FILE_SIZE_MB),
        ),
      );
      return;
    }

    onFileChange(candidate);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) validateAndSetFile(dropped);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={t.validateReport.dropZoneAria}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => {
        // Ignora o Enter vindo de elementos internos (ex.: botão de remover).
        if (e.key === "Enter" && e.target === e.currentTarget) {
          inputRef.current?.click();
        }
      }}
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
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          const selected = e.target.files?.[0];
          if (selected) validateAndSetFile(selected);
          e.target.value = "";
        }}
      />

      {file ? (
        <div className="flex w-full items-center justify-center gap-2 text-sm text-primary font-medium">
          <FileText className="h-5 w-5 shrink-0" />
          <div className="flex min-w-0 flex-col">
            <span className="truncate">{file.name}</span>
            <span className="text-xs font-normal text-muted-foreground">
              {formatFileSize(file.size)}
            </span>
          </div>
          <SimpleTooltip content={t.validateReport.removeFile}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={t.validateReport.removeFile}
              onClick={(e) => {
                e.stopPropagation();
                onFileChange(null);
              }}
              className="ml-1 h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4" />
            </Button>
          </SimpleTooltip>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-1 text-muted-foreground">
          <Upload className="h-8 w-8 opacity-40" />
          <span className="text-xs font-medium opacity-60 uppercase tracking-wide">
            PDF
          </span>
          <p className="text-sm text-center mt-1">
            {t.validateReport.dropZoneLabel}
          </p>
          <p className="text-xs text-center opacity-70">
            {t.validateReport.dropZoneHint.replace(
              "{size}",
              String(MAX_FILE_SIZE_MB),
            )}
          </p>
        </div>
      )}
    </div>
  );
}

function RouteComponent() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);

  const validationMutation = useMutation({
    mutationFn: postValidateReport,
  });

  const handleValidate = () => {
    if (!file) return;
    validationMutation.mutate(file);
  };

  const handleValidateAnother = () => {
    validationMutation.reset();
    setFile(null);
  };

  const validateAnotherButton = (
    <Button
      onClick={handleValidateAnother}
      variant="outline"
      className="w-full"
    >
      {t.validateReport.validateAnother}
    </Button>
  );

  const fileNameInfo = file && (
    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
      <FileText className="h-4 w-4 shrink-0" />
      <span className="truncate">{file.name}</span>
    </div>
  );

  if (validationMutation.isPending) {
    return (
      <ValidationCardShell
        icon={<Loader2 className="h-6 w-6 text-blue-600 animate-spin" />}
        iconWrapperClassName="bg-blue-100"
        title={t.validateReport.loadingTitle}
        description={t.validateReport.loadingDescription}
      >
        {fileNameInfo}
      </ValidationCardShell>
    );
  }

  if (validationMutation.isError) {
    return (
      <ValidationCardShell
        icon={<XCircle className="h-6 w-6 text-red-600" />}
        iconWrapperClassName="bg-red-100"
        title={t.validateReport.errorTitle}
        description={t.validateReport.errorDescription}
        footer={
          <>
            <Button onClick={handleValidate} variant="bipc" className="w-full">
              {t.validateReport.retry}
            </Button>
            {validateAnotherButton}
          </>
        }
      >
        <Alert variant="destructive">
          <AlertDescription>
            {parseApiError(validationMutation.error, t)}
          </AlertDescription>
        </Alert>
      </ValidationCardShell>
    );
  }

  if (validationMutation.isSuccess) {
    const isValid = validationMutation.data.data.valid === true;

    return (
      <ValidationCardShell
        icon={
          isValid ? (
            <CheckCircle className="h-6 w-6 text-green-600" />
          ) : (
            <XCircle className="h-6 w-6 text-red-600" />
          )
        }
        iconWrapperClassName={isValid ? "bg-green-100" : "bg-red-100"}
        title={
          isValid
            ? t.validateReport.validTitle
            : t.validateReport.invalidTitle
        }
        description={
          isValid
            ? t.validateReport.validDescription
            : t.validateReport.invalidDescription
        }
        footer={validateAnotherButton}
      >
        {fileNameInfo}
      </ValidationCardShell>
    );
  }

  return (
    <ValidationCardShell
      icon={<FileCheck className="h-6 w-6 text-blue-600" />}
      iconWrapperClassName="bg-blue-100"
      title={t.validateReport.title}
      description={t.validateReport.description}
      footer={
        <Button
          onClick={handleValidate}
          disabled={!file}
          size="lg"
          variant="bipc"
          className="w-full"
        >
          {t.validateReport.submit}
        </Button>
      }
    >
      <PdfDropZone file={file} onFileChange={setFile} />
    </ValidationCardShell>
  );
}
