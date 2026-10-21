import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const Stepper = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    activeStep: number;
    steps: Array<{ id: string | number; label: string; description?: string }>;
    onStepClick?: (index: number) => void;
  }
>(({ className, activeStep, steps, onStepClick, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex flex-col items-start gap-0 w-full", className)}
      {...props}
    >
      <div className="flex w-full items-center justify-between">
        {steps.map((step, idx) => {
          const isActive = idx === activeStep;
          const isComplete = idx < activeStep;
          const isClickable = !!onStepClick;
          return (
            <div key={step.id} className="flex items-center flex-1 first:flex-none last:flex-none">
              <button
                type="button"
                disabled={!isClickable}
                onClick={() => onStepClick?.(idx)}
                className={cn(
                  "flex items-center gap-3 group disabled:cursor-default",
                  isClickable ? "cursor-pointer" : "",
                )}
              >
                <div
                  className={cn(
                    "relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-all",
                    isComplete
                      ? "border-primary bg-primary text-white"
                      : isActive
                        ? "border-primary bg-primary/10 text-primary ring-4 ring-primary/10"
                        : "border-gray-300 dark:border-gray-700 text-gray-400 dark:text-gray-500",
                  )}
                >
                  {isComplete ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span>{idx + 1}</span>
                  )}
                </div>
                <div className="hidden sm:block text-left min-w-[90px] pr-2">
                  <p
                    className={cn(
                      "text-sm font-semibold leading-tight",
                      isComplete || isActive
                        ? "text-primary"
                        : "text-muted-foreground",
                    )}
                  >
                    {step.label}
                  </p>
                  {step.description ? (
                    <p className="text-xs text-muted-foreground leading-tight mt-0.5 line-clamp-2">
                      {step.description}
                    </p>
                  ) : null}
                </div>
              </button>
              {idx < steps.length - 1 ? (
                <div
                  className={cn(
                    "h-[2px] flex-1 mx-2 transition-colors duration-300",
                    idx < activeStep
                      ? "bg-primary"
                      : "bg-gray-200 dark:bg-gray-800",
                  )}
                />
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
});
Stepper.displayName = "Stepper";

export { Stepper };
