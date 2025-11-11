import { useEffect, useRef, useState } from "react";

interface TabsContainerProps {
  tabs: string[];
  selectedTab?: string;
  handleTabClick: (tab: string) => void;
  fullWidth?: boolean;
}

export function Tabs({
  tabs = [],
  selectedTab,
  handleTabClick,
  fullWidth = false,
}: TabsContainerProps) {
  if (tabs.length === 0) return null;

  const [indicatorStyle, setIndicatorStyle] = useState<{
    left: number;
    width: number;
  }>({ left: 0, width: 0 });
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const selectedIndex = tabs.findIndex((tab) => tab === selectedTab);
    if (selectedIndex !== -1 && tabsRef.current[selectedIndex]) {
      const selectedElement = tabsRef.current[selectedIndex];
      if (selectedElement) {
        setIndicatorStyle({
          left: selectedElement.offsetLeft,
          width: selectedElement.offsetWidth,
        });
      }
    }
  }, [selectedTab, tabs]);

  return (
    <div
      className={`relative flex items-center gap-2 ${fullWidth ? "w-full" : "w-fit"}`}
    >
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gray-shade-300" />

      {tabs?.map((tab, index) => (
        <button
          key={tab + index}
          ref={(el) => {
            tabsRef.current[index] = el;
          }}
          onClick={() => {
            handleTabClick(tab);
          }}
          className={`relative inline-flex items-center justify-center whitespace-nowrap px-6 py-3 text-sm transition-all duration-300 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-active focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 max-w-[200px] overflow-hidden text-ellipsis ${
            selectedTab === tab
              ? "text-active font-bold"
              : "cursor-pointer text-gray-shade-500 font-normal hover:text-active"
          }`}
        >
          {tab}
        </button>
      ))}

      {indicatorStyle.width > 0 && (
        <div
          className="absolute bottom-0 h-[3px] bg-active transition-all duration-300 ease-in-out"
          style={{
            left: `${indicatorStyle.left}px`,
            width: `${indicatorStyle.width}px`,
          }}
        />
      )}
    </div>
  );
}
