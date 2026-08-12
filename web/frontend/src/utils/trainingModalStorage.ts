/**
 * Gerenciamento do localStorage para o Modal de Capacitação
 */

const STORAGE_KEYS = {
  NOT_AUTH_COMPLETED: "training_modal_has_account/v2",
  AUTH_COMPLETED: "training_modal_registered/v2",
  NOT_AUTH_MINIMIZED: "training_modal_minimized_not_auth/v2",
  AUTH_MINIMIZED: "training_modal_minimized_auth",
  NOT_AUTH_AUTO_DISMISSED: "training_modal_auto_dismissed_not_auth/v2",
  AUTH_AUTO_DISMISSED: "training_modal_auto_dismissed_auth/v2",
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
   * Verifica se o modal está MINIMIZADO (escopo desta sessão de navegação apenas).
   * Ao logar novamente, a flag de minimize sempre é limpa — volta a abrir auto.
   */
  isMinimized(isAuthenticated: boolean): boolean {
    const key = isAuthenticated
      ? STORAGE_KEYS.AUTH_MINIMIZED
      : STORAGE_KEYS.NOT_AUTH_MINIMIZED;
    return localStorage.getItem(key) === "true";
  },

  /**
   * Verifica se o usuário marcou o checkbox "não abrir automaticamente".
   * Esta flag sobrevive a logout / novo login no mesmo navegador.
   */
  isAutoDismissed(isAuthenticated: boolean): boolean {
    const key = isAuthenticated
      ? STORAGE_KEYS.AUTH_AUTO_DISMISSED
      : STORAGE_KEYS.NOT_AUTH_AUTO_DISMISSED;
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
    const autoDismissedKey = isAuthenticated
      ? STORAGE_KEYS.AUTH_AUTO_DISMISSED
      : STORAGE_KEYS.NOT_AUTH_AUTO_DISMISSED;

    localStorage.setItem(completedKey, "true");
    localStorage.removeItem(minimizedKey);
    localStorage.removeItem(autoDismissedKey);
  },

  /**
   * Marca como MINIMIZADO (escopo desta sessão apenas).
   * Ao deslogar → a flag é limpa para o usuário receber o modal auto no próximo login.
   */
  setMinimized(isAuthenticated: boolean): void {
    const key = isAuthenticated
      ? STORAGE_KEYS.AUTH_MINIMIZED
      : STORAGE_KEYS.NOT_AUTH_MINIMIZED;
    localStorage.setItem(key, "true");
  },

  /**
   * Marca o "auto dismiss permanente por checkbox".
   * Sobrevive a logout / re-login.
   */
  setAutoDismissed(isAuthenticated: boolean): void {
    const key = isAuthenticated
      ? STORAGE_KEYS.AUTH_AUTO_DISMISSED
      : STORAGE_KEYS.NOT_AUTH_AUTO_DISMISSED;
    localStorage.setItem(key, "true");
    // Remove a flag de minimize temporária para não duplicar semântica
    localStorage.removeItem(
      isAuthenticated
        ? STORAGE_KEYS.AUTH_MINIMIZED
        : STORAGE_KEYS.NOT_AUTH_MINIMIZED,
    );
  },

  /**
   * Remove o estado de minimizado (sessão atual apenas)
   */
  clearMinimized(isAuthenticated: boolean): void {
    const key = isAuthenticated
      ? STORAGE_KEYS.AUTH_MINIMIZED
      : STORAGE_KEYS.NOT_AUTH_MINIMIZED;
    localStorage.removeItem(key);
  },

  /**
   * Remove a flag de dismiss permanente por checkbox.
   */
  clearAutoDismissed(isAuthenticated: boolean): void {
    const key = isAuthenticated
      ? STORAGE_KEYS.AUTH_AUTO_DISMISSED
      : STORAGE_KEYS.NOT_AUTH_AUTO_DISMISSED;
    localStorage.removeItem(key);
  },

  /**
   * Remove APENAS a flag minimized (temporária) AUTENTICADA.
   * Chamado NO MOMENTO do logout (antes de isAuthenticated mudar para false).
   * Assim, no próximo login, o minimized anterior some e volta a abrir automaticamente.
   */
  clearAuthMinimizedOnLogout(): void {
    localStorage.removeItem(STORAGE_KEYS.AUTH_MINIMIZED);
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
      autoDismissed: String(this.isAutoDismissed(isAuthenticated)),
      completedKey: isAuthenticated
        ? STORAGE_KEYS.AUTH_COMPLETED
        : STORAGE_KEYS.NOT_AUTH_COMPLETED,
      minimizedKey: isAuthenticated
        ? STORAGE_KEYS.AUTH_MINIMIZED
        : STORAGE_KEYS.NOT_AUTH_MINIMIZED,
      autoDismissedKey: isAuthenticated
        ? STORAGE_KEYS.AUTH_AUTO_DISMISSED
        : STORAGE_KEYS.NOT_AUTH_AUTO_DISMISSED,
    };
  },
};
