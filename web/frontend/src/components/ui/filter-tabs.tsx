interface IFilterTabsProps {
  tabs: string[];
  selectedTab: string;
  onTabSelect: (tab: string) => void;
  subTabs?: string[];
  selectedSubTab?: string;
  onSubTabSelect?: (tab: string) => void;
  fullWidth?: boolean;
  tabsLabel?: { [key: string]: string };
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
      className={`flex items-center gap-4 h-12 rounded-sm border border-gray-shade-300 dark:border-gray-shade-500 px-4 ${fullWidth ? "w-full" : "w-fit"} max-sm:h-full max-sm:p-4  dark:bg-sidebar max-sm:flex-wrap max-sm:gap-2`}
    >
      <div className="flex items-center gap-4 max-sm:w-full">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => onTabSelect(tab)}
            className={`inline-flex items-center justify-center whitespace-nowrap rounded-full h-6 px-3 text-xs font-medium transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-active focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 max-sm:w-full ${
              selectedTab === tab
                ? "bg-active text-white"
                : "cursor-pointer text-active border border-active hover:bg-active/10"
            }`}
          >
            {convertTabName(tabsLabel?.[tab] || tab)}
          </button>
        ))}
      </div>

      {hasSubTabs && <div className="h-6 w-px bg-gray-shade-300 dark:bg-gray-shade-500 max-sm:h-px max-sm:w-full max-sm:my-1" />}
      {hasSubTabs && (
        <div className='max-sm:w-full flex max-sm:flex-col'>
          <div className="flex items-center gap-4">
            {subTabs.map((subTab) => (
              <button
                key={subTab}
                onClick={() => onSubTabSelect(subTab)}
                className={`inline-flex items-center justify-center whitespace-nowrap rounded-full h-6 px-3 text-xs font-medium transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-active focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 max-sm:w-full ${
                  selectedSubTab === subTab
                    ? "bg-active text-white"
                    : "cursor-pointer text-active border border-active hover:bg-active/10"
                }`}
              >
                {subTab}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
