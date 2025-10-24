interface IFilterTabsProps {
  tabs: string[];
  selectedTab: string;
  onTabSelect: (tab: string) => void;
  subTabs?: string[];
  selectedSubTab?: string;
  onSubTabSelect?: (tab: string) => void;
  fullWidth?: boolean;
}

export function FilterTabs({
  tabs,
  selectedTab,
  onTabSelect,
  subTabs,
  selectedSubTab,
  onSubTabSelect,
  fullWidth = false,
}: IFilterTabsProps) {
  if (tabs.length === 0) return null;

  const convertTabName = (tab: string) => {
    if (tab.toLowerCase() === "co2") return "CO₂";
    if (tab.toLowerCase() === "energy") return "Energia";
    return tab;
  };

  const hasSubTabs =
    subTabs && subTabs.length > 0 && selectedSubTab && onSubTabSelect;

  return (
    <div
      className={`flex items-center gap-4 h-12 rounded-sm border border-gray-shade-300 px-4 ${fullWidth ? "w-full" : "w-fit"} dark:border-gray-shade-300 dark:bg-gray-800`}
    >
      <div className="flex items-center gap-4">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabSelect(tab)}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-full h-6 px-3 text-xs font-medium transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-active focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
              selectedTab === tab
                ? "bg-active text-white"
                : "cursor-pointer text-active border border-active hover:bg-active/10"
            }`}
          >
            {convertTabName(tab)}
          </button>
        ))}
      </div>

      {hasSubTabs && (
        <>
          <div className="h-6 w-px bg-gray-shade-300" />
          <div className="flex items-center gap-4">
            {subTabs.map((subTab) => (
              <button
                key={subTab}
                onClick={() => onSubTabSelect(subTab)}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-full h-6 px-3 text-xs font-medium transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-active focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${
                  selectedSubTab === subTab
                    ? "bg-active text-white"
                    : "cursor-pointer text-active border border-active hover:bg-active/10"
                }`}
              >
                {subTab}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
