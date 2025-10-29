import { useSummary } from "@/context/summaryContext";
import { cn } from '@/lib/utils';
import { ArrowUp, Expand } from "lucide-react";
import { Button } from "./button";

const Summary = () => {
  const { isOpen, toggleSummary, context, isExpanded, toggleExpanded } =
    useSummary();

  if (context?.hide) return null;
  return (
    <section
      data-open={isOpen}
      data-expanded={isExpanded}
      className={cn("absolute bottom-0 right-0 bg-gray-50 dark:bg-sidebar w-full max-md:mx-auto max-md:left-0 transition-all z-50 border-t border-gray-200 dark:border-gray-700 shadow-lg", {
        'h-[96vh] max-sm:h-[91vh]': isOpen && isExpanded,
        'h-2/3': isOpen && !isExpanded,
        'h-[50px]': !isOpen,
      })}
    >
      <div className="relative flex flex-col w-full h-full">
        {/* Header */}
        <div
          className={`flex items-center justify-between w-full px-4 ${isOpen ? "pt-3" : "my-auto"} `}
        >
          <span className="text-sm font-bold text-primary dark:text-blue-400">
            {"Benchmark"}
          </span>
          <div className="flex gap-0 absolute right-4 top-[-18px]">
            {isOpen && (
              <Button
                variant="noStyles"
                className="flex items-center justify-center w-8 h-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm"
                onClick={toggleExpanded}
              >
                <Expand
                  data-expanded={isExpanded}
                  className="h-4 w-4 text-gray-600 dark:text-gray-300 data-[expanded='true']:rotate-180 transition-transform"
                />
              </Button>
            )}
            <Button
              variant="noStyles"
              className="flex items-center justify-center w-8 h-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 shadow-sm"
              onClick={toggleSummary}
            >
              <ArrowUp
                data-open={isOpen}
                className="h-4 w-4 text-gray-600 dark:text-gray-300 data-[open='true']:rotate-180 transition-transform"
              />
            </Button>
          </div>
        </div>

        {/* Content */}
        {isOpen && context && (
          <div className="w-full flex-1 px-4 py-3 overflow-auto">
            {context.component || null}
          </div>
        )}
      </div>
    </section>
  );
};

export default Summary;
