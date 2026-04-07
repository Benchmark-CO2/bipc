import { useState } from 'react';

function getStoredSidebarStatus() {
  const isMobile = window.innerWidth < 768;
  const storedSidebarStatus = localStorage.getItem("sidebarStatus");
  if (storedSidebarStatus === null) {
    if (isMobile) {
      localStorage.setItem("sidebarStatus", "closed");
      return "closed";
    }
    localStorage.setItem("sidebarStatus", "open");
    return "open";
  }
  if (isMobile) {
    return "closed";
  }
  return storedSidebarStatus === "open" ? "open" : "closed";
}
export const useSidebar = () => {
  const [sidebarOpen, setSidebarOpen] = useState<"open" | "closed">(
    getStoredSidebarStatus()
  );

  return {
    sidebarStatus: sidebarOpen,
    toggleSidebar: () =>
      setSidebarOpen((oldState: "open" | "closed") =>
        oldState === "open" ? "closed" : "open"
      ),
  };
};
