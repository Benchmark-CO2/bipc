
import * as React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SimpleTooltipProps {
  className?: string;
  children: React.ReactElement;
  content: React.ReactNode;
  triggerAsChild?: boolean;
  side?: "top" | "right" | "bottom" | "left";
}

export const SimpleTooltip = React.forwardRef<
  HTMLElement,
  SimpleTooltipProps & Omit<React.HTMLAttributes<HTMLElement>, "content">
>(({ className, children, content, side = "bottom", ...props }, ref) => {
  // Clone the child merging any extra props (onClick, ref, data-* etc.)
  // forwarded by parent Slot-based components (DialogTrigger asChild, DrawerTrigger asChild…)
  const trigger = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<React.HTMLAttributes<HTMLElement> & { ref?: React.Ref<HTMLElement> }>, { ...props, ref })
    : children;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {trigger}
      </TooltipTrigger>
      <TooltipContent className={className} side={side}>
        {content}
      </TooltipContent>
    </Tooltip>
  );
});

SimpleTooltip.displayName = "SimpleTooltip";
