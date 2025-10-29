/**
 * Gerenciamento do localStorage para o Modal de Capacitação
 */

const STORAGE_KEYS = {
  NOT_AUTH_COMPLETED: "training_modal_has_account",
  AUTH_COMPLETED: "training_modal_registered",
  NOT_AUTH_MINIMIZED: "training_modal_minimized_not_auth",
  AUTH_MINIMIZED: "training_modal_minimized_auth",
} as const;

export const trainingModalStorage = {
  /**
   * Verifica se o usuário já completou o processo
   */
  isCompleted(isAuthenticated: boolean): boolean {
    const key = isAuthenticated
      ? STORAGE_KEYS.AUTH_COMPLETED
      : STORAGE_KEYS.NOT_AUTH_COMPLETED;
    return localStorage.getItem(key) === "true";
  },

  /**
   * Verifica se o modal está minimizado
   */
  isMinimized(isAuthenticated: boolean): boolean {
    const key = isAuthenticated
      ? STORAGE_KEYS.AUTH_MINIMIZED
      : STORAGE_KEYS.NOT_AUTH_MINIMIZED;
    return localStorage.getItem(key) === "true";
  },

  /**
   * Marca como completado
   */
  setCompleted(isAuthenticated: boolean): void {
    const completedKey = isAuthenticated
      ? STORAGE_KEYS.AUTH_COMPLETED
      : STORAGE_KEYS.NOT_AUTH_COMPLETED;
    const minimizedKey = isAuthenticated
      ? STORAGE_KEYS.AUTH_MINIMIZED
      : STORAGE_KEYS.NOT_AUTH_MINIMIZED;

    localStorage.setItem(completedKey, "true");
    localStorage.removeItem(minimizedKey);
  },

  /**
   * Marca como minimizado
   */
  setMinimized(isAuthenticated: boolean): void {
    const key = isAuthenticated
      ? STORAGE_KEYS.AUTH_MINIMIZED
      : STORAGE_KEYS.NOT_AUTH_MINIMIZED;
    localStorage.setItem(key, "true");
  },

  /**
   * Remove o estado de minimizado
   */
  clearMinimized(isAuthenticated: boolean): void {
    const key = isAuthenticated
      ? STORAGE_KEYS.AUTH_MINIMIZED
      : STORAGE_KEYS.NOT_AUTH_MINIMIZED;
    localStorage.removeItem(key);
  },

  /**
   * Limpa todos os estados (útil para testes)
   */
  clearAll(): void {
    Object.values(STORAGE_KEYS).forEach((key) => {
      localStorage.removeItem(key);
    });
  },

  /**
   * Debug: retorna o estado atual do localStorage
   */
  getDebugInfo(isAuthenticated: boolean): Record<string, string | null> {
    return {
      isAuthenticated: String(isAuthenticated),
      completed: String(this.isCompleted(isAuthenticated)),
      minimized: String(this.isMinimized(isAuthenticated)),
      completedKey: isAuthenticated
        ? STORAGE_KEYS.AUTH_COMPLETED
        : STORAGE_KEYS.NOT_AUTH_COMPLETED,
      minimizedKey: isAuthenticated
        ? STORAGE_KEYS.AUTH_MINIMIZED
        : STORAGE_KEYS.NOT_AUTH_MINIMIZED,
    };
  },
};
