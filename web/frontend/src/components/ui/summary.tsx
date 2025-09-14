import { useSummary } from '@/context/summaryContext';
import { ArrowUp, Expand } from "lucide-react";
import { Button } from "./button";


const Summary = () => {
  const { isOpen, toggleSummary, context, isExpanded, toggleExpanded,  } = useSummary();

  if (context?.hide) return null;
  return (
    <section
      data-open={isOpen}
      data-expanded={isExpanded}
      className='absolute bottom-0 right-0 bg-white p-2 h-[50px] w-full max-md:mx-auto max-md:left-0 transition-all data-[open="true"]:h-[450px] z-50 data-[expanded=true]:data-[open=true]:h-3/4! border-t-2 border-t-sidebar/20'
    >
      <div className="relative flex justify-between flex-col w-full items-start">
        <div className="flex items-center justify-between w-full">
          <div className='flex gap-1'>
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
          {isOpen && <Button
            variant="noStyles"
            className="flex items-center gap-2"
            onClick={toggleExpanded}
          >
            <Expand
              data-open={isExpanded}
              className="h-4 w-4 data-[open='true']:rotate-180 transition-transform"
            />
          </Button>}
          </div>
          <span>
            {context?.title}
          </span>
        </div>
        {isOpen && context && (
          <div className='w-full mt-6 p-4'>
            {context.component || null}
          </div>
        )}
      </div>
    </section>
  );
};

export default Summary;
