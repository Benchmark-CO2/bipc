import { useTranslation } from "@/i18n";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface IFilterTabsProps {
  tabs: string[];
  selectedTab: string;
  onTabSelect: (tab: string) => void;
  subTabs?: string[];
  selectedSubTab?: string;
  onSubTabSelect?: (tab: string) => void;
  fullWidth?: boolean;
  tabsLabel?: { [key: string]: string };
  className?: string;
  tabsStyle?: string;
  addTabAction?: React.ReactNode;
}

export function FilterTabs({
  tabs,
  selectedTab,
  onTabSelect,
  subTabs,
  selectedSubTab,
  onSubTabSelect,
  fullWidth = false,
  tabsLabel,
  className,
  tabsStyle,
  addTabAction,
}: IFilterTabsProps) {
  const { t } = useTranslation();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState);
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState, subTabs]);

  const scroll = (direction: "left" | "right") => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({
      left: direction === "left" ? -120 : 120,
      behavior: "smooth",
    });
  };

  if (tabs.length === 0) return null;

  const convertTabName = (tab: string) => {
    if (tab.toLowerCase() === "co2") return "CO₂";
    if (tab.toLowerCase() === "energy") return t.filterTabs.energy;
    if (tab.toLowerCase() === "material") return t.filterTabs.material;
    return tab;
  };

  const hasSubTabs =
    subTabs && subTabs.length > 0 && selectedSubTab && onSubTabSelect;

  return (
    <div
      className={`flex items-center gap-4 h-10 rounded-sm border border-gray-shade-300 dark:border-gray-shade-500 px-4 ${fullWidth ? "w-full" : "w-fit"} max-sm:h-fit max-sm:w-full! max-sm:p-4 dark:bg-sidebar max-sm:flex-wrap max-sm:gap-2 ${className || ""}`}
    >
      <div
        className={`flex items-center gap-4 max-sm:w-full ${tabsStyle || ""}`}
      >
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabSelect(tab)}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-full h-6 px-3 text-xs font-medium transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-active focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 w-full ${
              selectedTab === tab
                ? "bg-active text-white"
                : "cursor-pointer text-active border border-active hover:bg-active/10"
            }`}
          >
            {convertTabName(tabsLabel?.[tab] || tab)}
          </button>
        ))}
      </div>

      {hasSubTabs && (
        <div className="h-6 w-px bg-gray-shade-300 dark:bg-gray-shade-500 max-sm:h-px max-sm:w-full max-sm:my-1" />
      )}
      {hasSubTabs && (
        <div className="flex items-center gap-1 min-w-0 flex-1 max-sm:w-full max-sm:flex-col">
          {canScrollLeft && (
            <button
              onClick={() => scroll("left")}
              className="shrink-0 flex items-center justify-center h-6 w-5 rounded text-active hover:bg-active/10 transition-colors"
            >
              <ChevronLeft className="size-4" />
            </button>
          )}
          <div
            ref={scrollRef}
            className="flex items-center gap-2 overflow-x-auto scrollbar-none scroll-smooth min-w-0 flex-1"
          >
            {subTabs.map((subTab) => (
              <button
                key={subTab}
                onClick={() => onSubTabSelect(subTab)}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-full h-6 px-3 text-xs font-medium transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-active focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 shrink-0 max-sm:w-full ${
                  selectedSubTab === subTab
                    ? "bg-active text-white"
                    : "cursor-pointer text-active border border-active hover:bg-active/10"
                }`}
              >
                {subTab}
              </button>
            ))}
          </div>
          {canScrollRight && (
            <button
              onClick={() => scroll("right")}
              className="shrink-0 flex items-center justify-center h-6 w-5 rounded text-active hover:bg-active/10 transition-colors"
            >
              <ChevronRight className="size-4" />
            </button>
          )}
          {addTabAction && (
            <>
              <div className="h-6 w-px bg-gray-shade-300 dark:bg-gray-shade-500 mx-2 shrink-0" />
              {addTabAction}
            </>
          )}
        </div>
      )}
    </div>
  );
}
