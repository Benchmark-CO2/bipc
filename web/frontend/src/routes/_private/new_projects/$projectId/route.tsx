import { getProjectByUUID } from "@/actions/projects/getProject";
import { DrawerFormUnit } from "@/components/layout";
import { Button } from "@/components/ui/button";
import CustomBanner from "@/components/ui/customBanner";
import NotFoundList from "@/components/ui/not-found-list";
import Summary from "@/components/ui/summary";
import { TabsContainer } from "@/components/ui/tabsContainer";
import { ProjectContext } from "@/context/projectContext";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Outlet } from "@tanstack/react-router";
import { t } from "i18next";
import { useContext, useEffect, useState } from "react";

export const Route = createFileRoute("/_private/new_projects/$projectId")({
  component: RouteComponent,
  loader: async ({ params, context }) => {
    
  }
});

function RouteComponent() {
  // const { projectId } = Route.useLoaderData();
  // const params: { projectId: string; unitId: string; moduleId: string } =
  //   Route.useParams();

  // const {
  //   data: projectData,
  //   isLoading,
  //   error,
  // } = useQuery({
  //   queryKey: ["project", projectId],
  //   queryFn: () => getProjectByUUID(projectId),
  //   staleTime: 1000 * 60 * 5,
  // });
  const { props, type , setType} = useContext(ProjectContext)!;
  const navigate = Route.useNavigate()

  
  // const project = projectData?.data?.project;
  // const units = project?.units || [];

  const [tabs, setTabs] = useState([]);
  // const [selectedTab, setSelectedTab] = useState(0);

  // const tempDeleteTab = (unitId: string) => {
  //   setTabs((prevTabs) => prevTabs.filter((tab) => tab.id !== Number(unitId)));
  //   if (selectedTab === Number(unitId)) {
  //     setSelectedTab(0);
  //     // history.pushState({}, "", `/projects/${projectId}`);
  //   }
  // };

  // useEffect(() => {
  //   setTabs(units);
  // }, [units]);

  // useEffect(() => {
  //   if (tabs.length > 0 && !params.unitId) {
  //     history.pushState({}, "", `/projects/${projectId}/${tabs[0].id}`);
  //     setSelectedTab(tabs[0].id);
  //   } else if (params.unitId) {
  //     const paramUnit = Number(params.unitId);
  //     const unit = tabs.find((unit: any) => unit.id === paramUnit);
  //     if (unit) {
  //       setSelectedTab(unit.id);
  //     } else {
  //       history.pushState({}, "", `/projects/${projectId}`);
  //       setSelectedTab(0);
  //     }
  //   } else {
  //     setSelectedTab(0);
  //   }
  // }, [tabs, params, projectId]);

  // if (isLoading) {
  //   return <div>Carregando projeto...</div>;
  // }

  // if (error || !project) {
  //   return <div>Erro ao carregar projeto</div>;
  // }

  // if (params.moduleId) {
  //   return <Outlet />;
  // }
  const handleClick = async () => {
    void navigate({
      to: './unit/121212-121212-121212',
    });
  }
  // if (tabs.length === 0) {
  //   return (
  //     <div className="flex flex-col gap-4">
  //       <CustomBanner
  //         description={projectData?.description || ""}
  //         title={projectData?.name || ""}
  //         image={""}
  //       />
  //       <div className="flex h-full w-full flex-col items-center justify-center">
  //         <NotFoundList
  //           icon={"package"}
  //           message={t("units.noUnits")}
  //           description={t("units.description")}
  //           showIcon
  //           button={
  //             <DrawerFormUnit
  //               projectId={projectData?.id || ""}
  //               triggerComponent={
  //                 <Button variant="outline" className="mt-4">
  //                   {t("units.addUnit")}
  //                 </Button>
  //               }
  //             />
  //           }
  //         />
  //       </div>
  //       <button onClick={handleClick}>
  //         módulos
  //       </button>
  //     </div>
  //   );
  // }
  const projectData = {
    description: "Descrição do projeto",
    name: "Nome do Projeto",
  }
  useEffect(() => {
    if (type === 'units') {
      props.actions.setUnits([{
        id: '121212-121212-121212',
        name: 'Unidade 121212-121212-121212',
        description: 'Descrição da unidade 121212-121212-121212',
      }])
    }
  }, [type])

  useEffect(() => {
    setType('units');
  }, [])
  return (
    <>
      <div className="flex flex-col gap-4">
        <CustomBanner
          description={projectData?.description || ""}
          title={projectData?.name || ""}
          image={""}
        />
        <div className="w-full flex items-center justify-center h-[100px] bg-amber-500 rounded-md text-black">
          <Button onClick={handleClick}>
            Unidade 121212-121212-121212
          </Button>
        </div>
      

        {/* {tabs.length > 0 && (
          <TabsContainer
            projectId={projectId}
            units={tabs}
            selectedTab={selectedTab}
            tempDeleteTab={tempDeleteTab}
          />
        )} */}

        <Outlet />        
      </div>
    </>
  );
}
