import { constructiveTechnologies } from "@/components/columns/constructiveTechnologies";
import { floorsColumns } from "@/components/columns/floors";
import { CommonTable, DrawerFormUnit } from "@/components/layout";
import { Button } from "@/components/ui/button";
import Divider from "@/components/ui/divider";
import { createFileRoute, useParams } from "@tanstack/react-router";

const fakeUnit = {
  id: "1",
  name: "Unidade 1",
  co2: "100 KgCO2/m²",
  energy: "200 MJ/m²",
  density: "50 m³/m²",
  floors: [
    {
      id: "1",
      co2: "50 KgCO2/m²",
      energy: "100 MJ/m²",
      density: "30 m³/m²",
      repetitions: 1,
      area: 100,
      height: 3,
      tower_name: "Torre A",
      underground: false,
      color: "#c9c9c9",
    },
    {
      id: "2",
      co2: "70 KgCO2/m²",
      energy: "150 MJ/m²",
      density: "40 m³/m²",
      repetitions: 2,
      area: 120,
      height: 3,
      tower_name: "Torre B",
      underground: false,
      color: "#d0d0d0",
    },
  ],
  constructiveTechnologies: [
    {
      id: "1",
      name: "Bloco Estrutural 1",
      co2: "50 KgCO2/m²",
      energy: "100 MJ/m²",
      density: "30 m³/m²",
    },
    {
      id: "2",
      name: "Alvenaria 1",
      co2: "70 KgCO2/m²",
      energy: "150 MJ/m²",
      density: "40 m³/m²",
    },
  ],
};

export const Route = createFileRoute(
  "/_private/new_projects/$projectId/unit/$unitId/"
)({
  component: RouteComponent,
  // loader: async ({ params }) => {
  //   const { unitId, projectId } = params as {
  //     unitId: string;
  //     projectId: string;
  //   };

  //   if (!projectId) {
  //     throw new Error("Project ID is required");
  //   }
  //   const { data } = await getProjectByUUID(projectId);
  //   const project = data.project;

  //   const units = getFromStorage(
  //     `${UNIT_MODULES}/${projectId}`,
  //     {} as TProjectUnitModule
  //   );
  //   return {
  //     modules: units[unitId] ? units[unitId] : [],
  //     project,
  //   };
  // },
});

function RouteComponent() {
  // const { t } = useTranslation();
  const { projectId, unitId } = useParams({
    from: "/_private/new_projects/$projectId/unit/$unitId/",
  });

  const navigate = Route.useNavigate();

  // const handleClickNew = async () => {
  //   navigate({
  //     to: "/unit/new",
  //     search: {
  //       projectId: "12312-12312-12312-12312",
  //     },
  //     mask: {
  //       to: "/new_projects/$projectId/unit",
  //     },
  //   });
  // };
  // const handleClickEdit = async () => {
  //   navigate({
  //     to: "/unit/edit",
  //     search: {
  //       projectId: "12312-12312-12312-12312",
  //       unitId: "45645-45645-45645-45645",
  //     },
  //     mask: {
  //       to: "/new_projects/$projectId/unit/$unitId",
  //     },
  //   });
  // };
  // const handleClickNewLayer = async () => {
  //   navigate({
  //     to: "/layers/new",
  //     search: {
  //       projectId: "12312-12312-12312-12312",
  //       unitId: "45645-45645-45645-45645",
  //     },
  //     mask: {
  //       to: "/new_projects/$projectId/unit/$unitId",
  //     },
  //   });
  // };
  // const handleClickEditLayer = async () => {
  //   navigate({
  //     to: "/layers/edit",
  //     search: {
  //       projectId: "12312-12312-12312-12312",
  //       unitId: "45645-45645-45645-45645",
  //     },
  //     mask: {
  //       to: "/new_projects/$projectId/unit/$unitId",
  //     },
  //   });
  // };
  const handleClickConstructiveTechnologies = async () => {
    navigate({
      to: "./constuctive-technologies",
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <CommonTable
        tableName="Pavimentos"
        columns={floorsColumns}
        data={fakeUnit.floors}
        isSelectable={true}
        onSelectionChange={console.log}
        actions={
          <DrawerFormUnit
            projectId={projectId}
            unitId={unitId}
            triggerComponent={
              <Button variant="outline" className="mt-4">
                Editar Unidade
              </Button>
            }
          />
        }
      />
      <Divider />
      <CommonTable
        tableName="Tecnologias Construtivas"
        data={fakeUnit.constructiveTechnologies}
        columns={constructiveTechnologies}
        isSelectable={false}
        isInteractive={true}
        actions={
          <Button
            variant="outline"
            className="mt-4"
            onClick={handleClickConstructiveTechnologies}
          >
            Ver Tecnologias Construtivas
          </Button>
        }
      />
    </div>
  );
}
