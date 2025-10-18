import { cn } from "@/lib/utils";
import { useLocation } from "@tanstack/react-router";
import React from "react";

interface IScreen {
  children: React.ReactNode;
}
const Screen = ({ children }: IScreen) => {
  const path = useLocation();

  return (
    <main
      className={cn("h-full w-full overflow-auto relative flex flex-col", {
        "pb-12": path.pathname.includes("new_projects"),
      })}
    >
      {children}
    </main>
  );
};

export default Screen;
