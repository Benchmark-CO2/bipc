import { ProjectContext, PropsByVariants } from "@/context/projectContext";
import React, { useEffect } from "react";
import { Button } from "./button";
import { ArrowUp } from "lucide-react";
import { SummaryVariants } from "@/context/projectContext";

const SummaryScenarios = ({
  type,
  states,
}: {
  type: SummaryVariants;
  states: PropsByVariants[typeof type]['states'];
}): React.ReactNode => {
  if (type === 'projects') {
    const typedStates = states as PropsByVariants['projects']['states']
    return (
      <div className="flex flex-col w-2/3">
        <h2>{'Title'}</h2>
        <ul>
          {typedStates.projects.map((project) => (
            <li key={project.id} className="flex gap-2">
              <h3>{project.name}</h3>
              <div className="flex w-full h-1">
                <div style={{
                    width: `${project.pink}%`,
                }}  className={`bg-pink-500  h-1`}></div>
                <div style={{
                    width: `${project.yellow}%`,

                }} className={`bg-yellow-500  h-1`}></div>
                <div style={{
                    width: `${project.green}%`,
                }} className={`bg-green-500  h-1`}></div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (type === 'units') {
    const typedStates = states as PropsByVariants['units']['states'];

    return (
      <div>
        <h2>{'Units'}</h2>
        <ul>
          {typedStates.units.map((unit) => (
            <li key={unit.id}>
              <h3>{unit.name}</h3>
              <p>{unit.description}</p>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (type === 'layers') {
    const typedStates = states as PropsByVariants['layers']['states']
    return (
      <div>
        <h2>{'Layers'}</h2>
        <ul>
          {typedStates.layers.map((layer) => (
            <li key={layer.id}>
              <h3>{layer.name}</h3>
              <p>{layer.description}</p>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return null;
};

const Summary = () => {
  const { type, props } = React.useContext(ProjectContext)!;
  const [isOpen, setIsOpen] = React.useState(false);

  const toggleSummary = () => {
    setIsOpen(!isOpen);
  };


  return (
    <section
      data-open={isOpen}
      className='absolute bottom-0 right-0 bg-zinc-600 p-2 shadow-md h-[50px] w-[calc(100%-210px)] transition-all data-[open="true"]:h-[400px]'
    >
      <div className="relative flex justify-between flex-col w-full items-start">
        <div className="flex items-center justify-between w-full mb-2">
          <Button
            variant="noStyles"
            className="flex items-center gap-2"
            onClick={toggleSummary}
          >
            <ArrowUp
              data-open={isOpen}
              className="h-4 w-4 data-[open='true']:rotate-180 transition-transform"
            />
          </Button>
        </div>
        {isOpen && <SummaryScenarios
            type={type}
            states={props.states as PropsByVariants[typeof type]['states']}
        />}
      </div>
    </section>
  );
};

export default Summary;
