import { getProjectByUUID } from "@/actions/projects/getProject";
import DrawerAddUnit from "@/components/layout/drawer-add-unit";
import { Button } from "@/components/ui/button";
import CustomBanner from "@/components/ui/customBanner";
import NotFoundList from "@/components/ui/not-found-list";
import { TabsContainer } from "@/components/ui/tabsContainer";
import { getFromStorage, setToStorage } from "@/lib/storage";
import { TProjectsTemp, TProjectUnit } from "@/types/projects";
// import { mockUnits } from '@/utils/mockUnits'
import { AddUnitFormSchema } from "@/validators/addUnit.validator";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const PROJECT_UNITS = "@projects/units";

export const Route = createFileRoute("/_private/projects/$projectId")({
  component: RouteComponent,
  loader: async ({ params }) => {
    const { projectId } = params;
    if (!projectId) {
      throw new Error("Project ID is required");
    }

    const { data } = await getProjectByUUID(projectId);
    const project = data.project;

    const projects = getFromStorage(
      `${PROJECT_UNITS}/${projectId}`,
      {} as TProjectsTemp
    );

    return {
      project,
      units: projects[projectId] || [],
      crumb: project.name,
    };
  },
});

function RouteComponent() {
  const { project, units } = Route.useLoaderData();
  const params: { projectId: string; unitId: string; moduleId: string } =
    Route.useParams();
  const [tabs, setTabs] = useState(units);
  const [selectedTab, setSelectedTab] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const handleAddNewUnit = (data: AddUnitFormSchema) => {
    const newUnit = {
      id: String(tabs.length + 1),
      name: data.name,
    };

    setTabs((prev) => {
      const newTabs = [...prev, newUnit];
      setToStorage(`${PROJECT_UNITS}/${project.id}`, {
        [project.id]: newTabs,
      });
      return newTabs;
    });
  };

  useEffect(() => {
    if (tabs.length > 0 && !params.unitId) {
      history.pushState({}, "", `/projects/${project.id}/${tabs[0].id}`);
      setSelectedTab(tabs[0].id);
    } else if (params.unitId) {
      const unit = tabs.find((unit) => unit.id === params.unitId);
      if (unit) {
        setSelectedTab(unit.id);
      } else {
        history.pushState({}, "", `/projects/${project.id}`);
        setSelectedTab("");
      }
    } else {
      setSelectedTab("");
    }
  }, [tabs, params, project]);

  if (params.moduleId) {
    return <Outlet />;
  }

  if (tabs.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <CustomBanner
          description={project.description || ""}
          title={project.name || ""}
          image={project.image_url || ""}
        />
        <div className="flex h-full w-full flex-col items-center justify-center">
          <NotFoundList
            icon={"package"}
            message="Nenhum elemento encontrado"
            description="Adicione uma nova Unidade de Construção"
            showIcon
            button={
              <DrawerAddUnit
                isOpen={isOpen}
                setIsOpen={setIsOpen}
                callback={handleAddNewUnit}
                triggerComponent={
                  <Button variant="outline" className="mt-4">
                    Adicionar Unidade
                  </Button>
                }
              />
            }
          />
        </div>
      </div>
    );
  }

  const handleEditUnit = (data: TProjectUnit) => {
    const updatedTabs = tabs.map((unit) => {
      if (unit.id === data.id) {
        return {
          ...unit,
          name: data.name,
        };
      }
      return unit;
    });
    setTabs(updatedTabs);
    setToStorage(`${PROJECT_UNITS}/${project.id}`, {
      [project.id]: updatedTabs,
    });
  };

  const handleDeleteUnit = (unitId: string) => {
    const updatedTabs = tabs.filter((unit) => unit.id !== unitId);
    setTabs(updatedTabs);
    setToStorage(`${PROJECT_UNITS}/${project.id}`, {
      [project.id]: updatedTabs,
    });
    if (selectedTab === unitId) {
      history.pushState({}, "", `/projects/${project.id}`);
      setSelectedTab("");
    }
  };

  return (
    <>
      <div className="flex flex-col gap-4">
        <CustomBanner
          description={project.description || ""}
          title={project.name || ""}
          image={project.image_url || ""}
        />

        {tabs.length > 0 && (
          <TabsContainer
            projectId={project.id}
            units={tabs}
            selectedTab={selectedTab}
            handleAddNewUnit={handleAddNewUnit}
            handleEditUnit={handleEditUnit}
            handleDeleteUnit={handleDeleteUnit}
          />
        )}

        <Outlet />
      </div>
    </>
  );
}
