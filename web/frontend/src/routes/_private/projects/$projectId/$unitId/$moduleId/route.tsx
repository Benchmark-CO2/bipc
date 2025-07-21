import { getModule } from "@/actions/modules/getModule";
import { stringUtils } from "@/utils/string";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { t } from "i18next";

export const Route = createFileRoute(
  "/_private/projects/$projectId/$unitId/$moduleId"
)({
  component: RouteComponent,
  validateSearch: ({ search }) => {
    console.log("Validating search params:", search);
  },
  loader: async ({ params, context: { queryClient } }) => {
    console.log();
    const { moduleId } = params;
    if (!moduleId) {
      throw new Error("Module ID is required");
    }
    const { data } = await queryClient.ensureQueryData({
      queryKey: ["modules", params.projectId, params.unitId],
      queryFn: () =>
        getModule(params.projectId, params.unitId, moduleId, "beam_column"),
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
