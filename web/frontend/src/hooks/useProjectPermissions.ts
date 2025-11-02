import { useQuery } from "@tanstack/react-query";
import { getProjectPermissions } from "@/actions/projects/getProjectPermissions";

/**
 * Hook para gerenciar permissões do usuário em um projeto específico.
 * As permissões são armazenadas em cache e atualizadas automaticamente
 * quando há alterações nas disciplinas.
 *
 * @param projectId - ID do projeto
 * @returns {
 *   permissions: Array<string> - Lista de permissões do usuário
 *   hasPermission: (permission: string) => boolean - Função para verificar uma permissão específica
 *   hasAnyPermission: (...permissions: string[]) => boolean - Verifica se tem pelo menos uma das permissões
 *   hasAllPermissions: (...permissions: string[]) => boolean - Verifica se tem todas as permissões
 *   isLoading: boolean - Estado de carregamento
 *   isError: boolean - Estado de erro
 * }
 */
export const useProjectPermissions = (projectId: string) => {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["project-permissions", projectId],
    queryFn: async () => {
      const response = await getProjectPermissions(projectId);
      return response.data.permissions;
    },
    enabled: !!projectId,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  const permissions = data || [];

  /**
   * Verifica se o usuário tem uma permissão específica
   */
  const hasPermission = (permission: string): boolean => {
    return permissions.includes(permission);
  };

  /**
   * Verifica se o usuário tem pelo menos uma das permissões fornecidas
   */
  const hasAnyPermission = (...requiredPermissions: string[]): boolean => {
    return requiredPermissions.some((permission) =>
      permissions.includes(permission)
    );
  };

  /**
   * Verifica se o usuário tem todas as permissões fornecidas
   */
  const hasAllPermissions = (...requiredPermissions: string[]): boolean => {
    return requiredPermissions.every((permission) =>
      permissions.includes(permission)
    );
  };

  return {
    permissions,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isLoading,
    isError,
  };
};
