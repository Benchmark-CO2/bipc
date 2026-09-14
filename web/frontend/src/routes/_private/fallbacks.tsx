import { getIfcFallbacks } from "@/actions/ifc/getIfcFallbacks";
import { postIfcCreateFallback } from "@/actions/ifc/postIfcCreateFallback";
import { useAuth } from "@/hooks/useAuth";
import { useTranslation } from "@/i18n";
import { Translations } from "@/i18n/translations/pt-BR";
import { TIfcProcessorFallbackVersion } from "@/types/ifc";
import { parseApiError } from "@/utils/parseApiError";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Lock, Loader2, RefreshCw, Upload, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_private/fallbacks")({
  component: FallbacksPage,
});

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function FallbacksPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const translations = t as unknown as Translations;
  const queryClient = useQueryClient();
  const clientId = user?.id ?? "";

  const isPlatformAdmin: boolean = user?.type?.toLowerCase() === "admin";

  if (!isPlatformAdmin) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <Lock className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="mb-3 text-2xl font-bold text-foreground">
            {translations.fallbacksPage.adminOnlyTitle}
          </h1>
          <p className="text-muted-foreground">
            {translations.fallbacksPage.adminOnlyDescription}
          </p>
        </div>
      </div>
    );
  }

  return (
    <AdminFallbacksContent
      clientId={clientId}
      translations={translations}
      queryClient={queryClient}
    />
  );
}

function AdminFallbacksContent({
  clientId,
  translations,
  queryClient,
}: {
  clientId: string;
  translations: Translations;
  queryClient: ReturnType<typeof useQueryClient>;
}) {
  const [software, setSoftware] = useState("");
  const [version, setVersion] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [fieldError, setFieldError] = useState("");
  const uploadLockRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data, isLoading, isError, isFetching, refetch } = useQuery({
    queryKey: ["ifcFallbacks"],
    queryFn: async () => {
      const res = await getIfcFallbacks();
      return res.data.version_list;
    },
    staleTime: 1000 * 60 * 5,
  });

  const fallbacksList: TIfcProcessorFallbackVersion[] = data ?? [];

  const isTableLoading = isLoading || isFetching;

  const { mutate: handleCreateFallback, isPending: isSubmitting } = useMutation(
    {
      mutationFn: async () => {
        if (!clientId) throw new Error("Missing client id");
        if (!software.trim() || !version.trim() || !csvFile) {
          throw new Error("missing_fields");
        }
        if (uploadLockRef.current) return;
        uploadLockRef.current = true;

        try {
          const res = await postIfcCreateFallback(clientId, {
            manufacturer: software.trim(),
            version: version.trim(),
          });

          const putRes = await fetch(res.data.fallback_url, {
            method: "PUT",
            headers: {
              "Content-Type": "text/csv",
              "If-None-Match": "*",
            },
            body: csvFile,
          });

          if (!putRes.ok) {
            throw new Error(`Upload CSV failed (${putRes.status})`);
          }
        } finally {
          uploadLockRef.current = false;
        }
      },
      onSuccess: async () => {
        toast.success(translations.fallbacksPage.successToast);
        await queryClient.invalidateQueries({ queryKey: ["ifcFallbacks"] });
        await refetch();
        setSoftware("");
        setVersion("");
        setCsvFile(null);
        setFieldError("");
        if (fileInputRef.current) fileInputRef.current.value = "";
      },
      onError: (error) => {
        if (error instanceof Error && error.message === "missing_fields") {
          setFieldError(translations.common.required);
          return;
        }
        const errorMessage = parseApiError(error, translations);
        setFieldError(errorMessage);
        toast.error(translations.fallbacksPage.errorToast, {
          description: errorMessage,
        });
      },
    },
  );

  const validateAndSetFile = (candidate: File | null) => {
    setFieldError("");
    if (!candidate) {
      setCsvFile(null);
      return;
    }
    if (!candidate.name.toLowerCase().endsWith(".csv")) {
      setFieldError(translations.fallbacksPage.fileInvalidError);
      toast.warning(translations.fallbacksPage.fileInvalidError);
      return;
    }
    if (candidate.size > MAX_FILE_SIZE) {
      setFieldError(translations.fallbacksPage.fileMaxSizeError);
      toast.warning(translations.fallbacksPage.fileMaxSizeError);
      return;
    }
    setCsvFile(candidate);
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFieldError("");
    if (!software.trim() || !version.trim() || !csvFile) {
      setFieldError(translations.common.required);
      return;
    }
    handleCreateFallback();
  };

  const isFormValid =
    software.trim().length > 0 && version.trim().length > 0 && csvFile !== null;

  return (
    <div className="mx-auto max-w-4xl p-6 lg:p-8">
      <header className="mb-8">
        <h1 className="mb-2 text-3xl font-bold text-foreground">
          {translations.fallbacksPage.title}
        </h1>
        <p className="text-muted-foreground">
          {translations.fallbacksPage.subtitle}
        </p>
      </header>

      <section className="mb-10 rounded-xl border border-gray-200 p-6 dark:border-gray-700">
        <h2 className="mb-5 text-lg font-semibold text-foreground">
          {translations.fallbacksPage.createTitle}
        </h2>

        <form onSubmit={onSubmit} className="flex flex-col gap-5">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-muted-foreground">
                {translations.fallbacksPage.softwareLabel}{" "}
                <span className="text-destructive">*</span>
              </label>
              <Input
                value={software}
                onChange={(e) => {
                  setSoftware(e.target.value);
                  setFieldError("");
                }}
                placeholder={translations.fallbacksPage.softwarePlaceholder}
                disabled={isSubmitting}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm text-muted-foreground">
                {translations.fallbacksPage.versionLabel}{" "}
                <span className="text-destructive">*</span>
              </label>
              <Input
                value={version}
                onChange={(e) => {
                  setVersion(e.target.value);
                  setFieldError("");
                }}
                placeholder={translations.fallbacksPage.versionPlaceholder}
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm text-muted-foreground">
              {translations.fallbacksPage.fileLabel}{" "}
              <span className="text-destructive">*</span>
            </label>
            <div
              role="button"
              tabIndex={0}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={(e) =>
                (e.key === "Enter" || e.key === " ") &&
                fileInputRef.current?.click()
              }
              className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-6 transition-colors hover:border-primary/60 hover:bg-primary/5"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                disabled={isSubmitting}
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  validateAndSetFile(f);
                }}
              />
              {csvFile ? (
                <div className="flex items-center gap-2 text-sm font-medium text-primary">
                  <Upload className="h-5 w-5" />
                  <span className="max-w-xs truncate">{csvFile.name}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setCsvFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="ml-1 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <Upload className="h-8 w-8 opacity-40" />
                  <p className="text-sm text-center">
                    {translations.fallbacksPage.filePlaceholder}
                  </p>
                </div>
              )}
            </div>
          </div>

          {fieldError && (
            <div className="rounded-lg border-2 border-red-400 bg-red-50 p-4 dark:border-red-600 dark:bg-red-950/20">
              <div className="flex gap-3">
                <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600 dark:text-red-500" />
                <p className="text-sm text-red-800 dark:text-red-300">
                  {fieldError}
                </p>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="submit"
              variant="bipc"
              size="sm"
              disabled={!isFormValid || isSubmitting}
              className="text-white"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {translations.fallbacksPage.submittingButton}
                </span>
              ) : (
                translations.fallbacksPage.submitButton
              )}
            </Button>
          </div>
        </form>
      </section>

      <section>
        <div className="mb-4 flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">
            {translations.fallbacksPage.listTitle}
          </h2>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isTableLoading}
            className="ml-auto h-8"
          >
            <RefreshCw
              className={cn("h-4 w-4", isTableLoading && "animate-spin")}
            />
            <span className="ml-1.5">
              {translations.fallbacksPage.refreshButton}
            </span>
          </Button>
        </div>

        <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 dark:bg-gray-800/40">
              <tr>
                <th className="px-5 py-3 font-medium text-muted-foreground">
                  {translations.fallbacksPage.colSoftware}
                </th>
                <th className="px-5 py-3 font-medium text-muted-foreground">
                  {translations.fallbacksPage.colVersion}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isTableLoading ? (
                <tr>
                  <td
                    colSpan={2}
                    className="px-5 py-8 text-center text-muted-foreground"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {translations.fallbacksPage.listLoading}
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td
                    colSpan={2}
                    className="px-5 py-8 text-center text-destructive"
                  >
                    {translations.fallbacksPage.listError}
                  </td>
                </tr>
              ) : fallbacksList.length === 0 ? (
                <tr>
                  <td
                    colSpan={2}
                    className="px-5 py-8 text-center text-muted-foreground"
                  >
                    {translations.fallbacksPage.listEmpty}
                  </td>
                </tr>
              ) : (
                fallbacksList.map((item, idx) => (
                  <tr
                    key={`${item.manufacturer}-${item.version}-${idx}`}
                    className="hover:bg-gray-50 dark:hover:bg-gray-800/30"
                  >
                    <td className="px-5 py-3 font-medium text-foreground">
                      {item.manufacturer}
                    </td>
                    <td className="px-5 py-3 text-foreground">
                      {item.version}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
