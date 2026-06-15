import axios from "axios";
import type { Translations } from "@/i18n/translations/pt-BR";

/**
 * Extracts a user-friendly, translated error message from any error value.
 *
 * The backend always responds with `{ "error": <string | object> }`.
 * This utility maps known HTTP status codes and backend messages to i18n keys
 * so the UI never shows raw Axios messages like "Request failed with status code 403".
 */
export function parseApiError(error: unknown, t: Translations): string {
  if (axios.isAxiosError(error)) {
    // No response → network / CORS / timeout issue
    if (!error.response) {
      return t.apiErrors.networkError;
    }

    const status = error.response.status;
    const backendError = (
      error.response.data as { error?: string | Record<string, string> }
    )?.error;

    switch (status) {
      case 401:
        return t.apiErrors.authRequired;

      case 403:
        if (typeof backendError === "string") {
          if (backendError.includes("activated")) {
            return t.apiErrors.accountNotActivated;
          }
          if (backendError.includes("administrator")) {
            return t.apiErrors.cannotDeleteAdmin;
          }
        }
        return t.apiErrors.insufficientPermissions;

      case 404:
        return t.apiErrors.notFound;

      case 409:
        return t.apiErrors.editConflict;

      case 422:
        // Validation errors come back as { field: message, ... }
        if (typeof backendError === "object" && backendError !== null) {
          return Object.values(backendError).join("; ");
        }
        return typeof backendError === "string"
          ? backendError
          : t.errors.unexpectedError;

      case 429:
        return t.apiErrors.rateLimitExceeded;

      case 500:
      case 502:
      case 503:
        return t.apiErrors.serverError;

      default:
        return typeof backendError === "string"
          ? backendError
          : t.errors.unexpectedError;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return t.errors.unexpectedError;
}
