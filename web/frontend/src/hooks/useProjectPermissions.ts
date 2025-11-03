import { useQuery } from "@tanstack/react-query";
import { getProjectPermissions } from "@/actions/projects/getProjectPermissions";

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
    if (permissions.includes("*:*")) return true;

    return permissions.includes(permission);
  };

  /**
   * Verifica se o usuário tem pelo menos uma das permissões fornecidas
   */
  const hasAnyPermission = (...requiredPermissions: string[]): boolean => {
    if (permissions.includes("*:*")) return true;

    return requiredPermissions.some((permission) =>
      permissions.includes(permission)
    );
  };

  /**
   * Verifica se o usuário tem todas as permissões fornecidas
   */
  const hasAllPermissions = (...requiredPermissions: string[]): boolean => {
    if (permissions.includes("*:*")) return true;

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
