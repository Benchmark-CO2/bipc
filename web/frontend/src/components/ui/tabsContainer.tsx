interface TabsContainerProps {
  tabs: string[];
  selectedTab?: string;
  handleTabClick: (tab: string) => void;
  fullWidth?: boolean;
  subTabs?: string[]
  handleClickSubTab?: (tab: string) => void;
  selectedSubTab?: string;
  tabsLabel?: { [key: string]: string };
}

export function TabsContainer({
  tabs = [],
  selectedTab,
  handleTabClick,
  fullWidth = false,
  subTabs = [],
  handleClickSubTab,
  selectedSubTab,
  tabsLabel,
}: TabsContainerProps) {
  if (tabs.length === 0) return null;

  const convertTabName = (tab: string) => {
    if (tab.toLowerCase() === "co2") return "CO₂";
    if (tab.toLowerCase() === "energy") return "Energia";
    return tab;
  };

  return (
    <div
      className={`flex items-center gap-2 rounded-sm border border-gray-200 bg-white p-4 ${fullWidth ? "w-full" : "w-fit"} dark:border-gray-700 dark:bg-gray-800`}
    >
      {tabs?.map((tab) => (
        <button
          key={tab}
          onClick={() => {
            handleTabClick(tab);
          }}
          className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-2 text-sm font-medium transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${selectedTab === tab
              ? "bg-secondary text-white shadow-sm dark:bg-secondary dark:text-white"
              : "cursor-pointer text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20"
            }`}
        >
          {convertTabName(tabsLabel?.[tab] || tab)}
        </button>
      ))}
      {subTabs.length > 0 && (
        <div className="ml-4 flex items-center gap-2 border-l border-gray-200 pl-4 dark:border-gray-700">
          {subTabs?.map((tab) => (
            <button
              key={tab}
              onClick={() => {
                handleClickSubTab!(tab);
              }}
              className={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-6 py-2 text-sm font-medium transition-all duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${selectedSubTab === tab
                  ? "bg-secondary text-white shadow-sm dark:bg-secondary dark:text-white"
                  : "cursor-pointer text-green-600 hover:text-green-700 hover:bg-green-50 dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20"
                }`}
            >
              {convertTabName(tab)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
