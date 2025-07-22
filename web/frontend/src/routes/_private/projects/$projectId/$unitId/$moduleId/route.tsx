import { getModule } from "@/actions/modules/getModule";
import { TModulesTypes } from "@/types/modules";
import { stringUtils } from "@/utils/string";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { t } from "i18next";

type SearchParams = {
  type?: TModulesTypes;
};

export const Route = createFileRoute(
  "/_private/projects/$projectId/$unitId/$moduleId"
)({
  component: RouteComponent,
  loader: async ({ params, location, context: { queryClient } }) => {
    const { moduleId } = params;
    const { type } = location.search as SearchParams;
    if (!moduleId || !type) {
      throw new Error("Module ID and type are required");
    }

    const { data } = await queryClient.ensureQueryData({
      queryKey: ["modules", params.projectId, params.unitId],
      queryFn: () => getModule(params.projectId, params.unitId, moduleId, type),
    });

    return {
      crumb: data.versions[0]
        ? t(
            `common.structureType.${stringUtils.fromSnakeToCamelCase(data.versions[0].type) as "concreteWall"}`
          )
        : "-",
      module: data.versions[0],
    };
  },
});

function RouteComponent() {
  return (
    <>
      <Outlet />
    </>
  );
}
