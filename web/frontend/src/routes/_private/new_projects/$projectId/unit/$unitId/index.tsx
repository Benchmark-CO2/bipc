import { getProjectByUUID } from "@/actions/projects/getProject";
import { DrawerAddModule, ModuleTable } from "@/components/layout";
import { Button } from "@/components/ui/button";
import CustomBanner from "@/components/ui/customBanner";
import { getFromStorage, setToStorage } from "@/lib/storage";
import { TModuleData, TProjectUnitModule } from "@/types/projects";
import { AddModuleFormSchema } from "@/validators/addModule.validator";
// import { Unit } from '@/types/units'
// import { mockUnits } from '@/utils/mockUnits'
import {
  createFileRoute,
  Link,
  useLoaderData,
  useParams,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const UNIT_MODULES = "@unit/modules";

export const Route = createFileRoute("/_private/new_projects/$projectId/unit/$unitId/")({
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
  const { t } = useTranslation();
  const navigate = Route.useNavigate()
  // const { projectId, unitId } = useParams({
  //   from: "/_private/projects/$projectId/$unitId/",
  // });

  // const { modules } = useLoaderData({
  //   from: "/_private/projects/$projectId/$unitId/",
  // });

  // const [mods, setMods] = useState(modules);

  // useEffect(() => {
  //   document.title = "BIPC / Tecnologia Construtiva";
  // }, []);

  // useEffect(() => {
  //   setMods(modules);
  // }, [modules]);

  // const handleAddNewModule = (data: AddModuleFormSchema) => {
  //   if (
  //     mods.find(
  //       (el) =>
  //         el.nome === data.nome && el.tipoDeEstrutura === data.tipoDeEstrutura
  //     )
  //   ) {
  //     toast.error("Esse elemento ja existe na unidade");
  //     return;
  //   }
  //   const formatData = {
  //     ...data,
  //     // data: typeof data.data === 'string' ? data.data : data.data instanceof Date ? data.data.toISOString() : '',
  //     module_uuid: String(mods.length + 1),
  //     version: "1",
  //     consumoDeAco: (() => {
  //       switch (data.tipoDeEstrutura) {
  //         case "concreteWall":
  //           return (
  //             Math.round((Math.random() * (6.33 - 0.79) + 0.79) * 100) / 100
  //           );
  //         case "masonry":
  //           return Math.round((Math.random() * (80 - 15) + 15) * 100) / 100; // 15-80kg
  //         case "beamColumn":
  //           return (
  //             Math.round((Math.random() * (127.78 - 26.54) + 26.54) * 100) / 100
  //           );
  //         default:
  //           return Math.round((Math.random() * 50 + 10) * 100) / 100;
  //       }
  //     })(),
  //     consumoDeConcreto: (() => {
  //       switch (data.tipoDeEstrutura) {
  //         case "concreteWall":
  //           return (
  //             Math.round((Math.random() * (1.73 - 0.16) + 0.16) * 100) / 100
  //           );
  //         case "masonry":
  //           return Math.round((Math.random() * (2.5 - 0.8) + 0.8) * 100) / 100; // 0.8-2.5m³
  //         case "beamColumn":
  //           return (
  //             Math.round((Math.random() * (1.29 - 0.27) + 0.27) * 100) / 100
  //           );
  //         default:
  //           return Math.round((Math.random() * 2 + 0.5) * 100) / 100;
  //       }
  //     })(),
  //     emissaoDeCo2: Math.round((Math.random() * (190 - 80) + 80) * 100) / 100,
  //     energia: Math.round((Math.random() * (1200 - 400) + 400) * 100) / 100,
  //   } as TModuleData;

  //   const units = getFromStorage(
  //     `${UNIT_MODULES}/${projectId}`,
  //     {} as TProjectUnitModule
  //   );
  //   setMods((prev) => {
  //     const newMods = [...prev, formatData];
  //     setToStorage(`${UNIT_MODULES}/${projectId}`, {
  //       ...units,
  //       [unitId]: newMods,
  //     });
  //     return newMods;
  //   });
  // };

  // const handleUpdateModule = (module: TModuleData) => {
  //   const units = getFromStorage(
  //     `${UNIT_MODULES}/${projectId}`,
  //     {} as TProjectUnitModule
  //   );
  //   setMods((prev) => {
  //     const newMods = prev.map((mod) =>
  //       mod.module_uuid === module.module_uuid ? module : mod
  //     );
  //     setToStorage(`${UNIT_MODULES}/${projectId}`, {
  //       ...units,
  //       [unitId]: newMods,
  //     });
  //     return newMods;
  //   });
  // };

  // const handleDeleteModule = (moduleId: string) => {
  //   const units = getFromStorage(
  //     `${UNIT_MODULES}/${projectId}`,
  //     {} as TProjectUnitModule
  //   );
  //   setMods((prev) => {
  //     const newMods = prev.filter((mod) => mod.module_uuid !== moduleId);
  //     setToStorage(`${UNIT_MODULES}/${projectId}`, {
  //       ...units,
  //       [unitId]: newMods,
  //     });
  //     return newMods;
  //   });
  // };

  const handleClickNew = async () => {
    navigate({
      to: '/unit/new',
      search: {
        projectId: '12312-12312-12312-12312'
      },
      mask: {
        to: '/new_projects/$projectId/unit',
      }
    })
  }
  const handleClickEdit = async () => {
    navigate({
      to: '/unit/edit',
      search: {
        projectId: '12312-12312-12312-12312',
        unitId: '45645-45645-45645-45645',
      },
      mask: {
        to: '/new_projects/$projectId/unit/$unitId',
      }
    })
  }
  const handleClickNewLayer = async () => {
    navigate({
      to: '/layers/new',
      search: {
        projectId: '12312-12312-12312-12312',
        unitId: '45645-45645-45645-45645',
      },
      mask: {
        to: '/new_projects/$projectId/unit/$unitId',
      }
    })
  }
  const handleClickEditLayer = async () => {
    navigate({
      to: '/layers/edit',
      search: {
        projectId: '12312-12312-12312-12312',
        unitId: '45645-45645-45645-45645',
      },
      mask: {
        to: '/new_projects/$projectId/unit/$unitId',
      }
    })
  }
  const handleClickConstructiveTechnologies = async () => {
    navigate({
      to: './constuctive-technologies',
    })
  }
  // const handleClick = async () => {}
  // const handleClick = async () => {}

  return (
    <div className="flex flex-col gap-4">
      {/* <div className="flex justify-end gap-4">
        <DrawerAddModule
          callback={handleAddNewModule}
          componentTrigger={
            <Button variant="noStyles" className="flex items-center gap-2">
              {t("drawerAddModule.addConstructiveTechnology")}
            </Button>
          }
        />
      </div>
      <ModuleTable
        key={`${JSON.stringify(mods)}`}
        modules={mods}
        projectId={projectId}
        unitId={unitId}
        handleUpdateModule={handleUpdateModule}
        handleDeleteModule={handleDeleteModule}
      /> */}
      <div className="w-full flex justify-start h-[100px] flex-wrap gap-2">
        <Button onClick={handleClickNew}>
          criar unidade
        </Button>
        <Button onClick={handleClickEdit}>
          editar unidade
        </Button>
        <Button onClick={handleClickNewLayer}>
          Criar Pavimento
        </Button>
        <Button onClick={handleClickEditLayer}>
          Editar Pavimento
        </Button>
        <Button onClick={handleClickConstructiveTechnologies}>
          Tecnologias construtivas
        </Button>
      </div>
      {/* <button onClick={handleClick}>
        módulos
      </button>
      <button onClick={handleClick}>
        módulos
      </button> */}
    </div>
  );
}
