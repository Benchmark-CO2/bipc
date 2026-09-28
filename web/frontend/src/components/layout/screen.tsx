import { useSummary } from '@/context/summaryContext';
import { cn } from "@/lib/utils";
import { useLocation } from "@tanstack/react-router";
import React from "react";

interface IScreen {
  children: React.ReactNode;
}
const Screen = ({ children }: IScreen) => {
  const path = useLocation();
  const { isOpen } = useSummary()
  return (
    <main
      className={cn("h-full w-full overflow-auto relative flex flex-col transition-all duration-300", {
        "pb-35": path.pathname.includes("new_projects") && isOpen,
      })}
    >
      {children}
    </main>
  );
};

export default Screen;
