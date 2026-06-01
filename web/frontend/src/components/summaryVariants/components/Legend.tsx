import { useSummary } from "@/context/summaryContext";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/i18n";
import { MAP_COLORS, MAP_EMPTY } from "@/utils/geoUtils";

const DISPLAY_COLORS = [MAP_EMPTY, ...MAP_COLORS];

interface LegendProps {
  variant?: "default" | "map";
  maxCount?: number;
}

const Legend = ({ variant = "default", maxCount }: LegendProps) => {
  const { isExpanded } = useSummary();
  const { t } = useTranslation();

  return (
    <section
      className={cn("w-full flex justify-between", {
        "w-2/3 my-6": isExpanded,
      })}
    >
      {variant === "map" ? (
        <div className="flex items-start gap-3">
          <span className="text-xs font-bold text-gray-shade-500 shrink-0 pt-0.5">
            {t.benchmark.legend}
          </span>
          <div className="flex flex-col gap-0.5">
            <div className="flex">
              {DISPLAY_COLORS.map((color, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-10 h-4 border-t border-b border-r border-border",
                    {
                      "rounded-l-sm border-l": i === 0,
                      "rounded-r-sm": i === DISPLAY_COLORS.length - 1,
                    },
                  )}
                  style={{ background: color }}
                />
              ))}
            </div>
            <div className="flex text-[9px] text-muted-foreground leading-tight">
              {/* Empty cell: always "0" */}
              <div className="w-10 text-center">0</div>
              {/* Active color cells: compute the count range for each */}
              {MAP_COLORS.map((_, k) => {
                const lo =
                  k === 0
                    ? 1
                    : Math.ceil((k * (maxCount ?? 0)) / MAP_COLORS.length);
                const hi =
                  k === MAP_COLORS.length - 1
                    ? (maxCount ?? 0)
                    : Math.ceil(
                        ((k + 1) * (maxCount ?? 0)) / MAP_COLORS.length,
                      ) - 1;
                const label =
                  !maxCount || maxCount === 0 || lo > hi
                    ? "–"
                    : lo === hi
                      ? String(lo)
                      : `${lo}-${hi}`;
                return (
                  <div key={k} className="w-10 text-center">
                    {label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-4 w-full items-end max-sm:grid-cols-1 max-2xl:grid-cols-2 3xl:grid-cols-4 max-sm:gap-2 max-sm:my-4">
          <div className="w-full flex flex-col justify-center">
            <h2 className="text-sm font-bold mb-2">{t.benchmark.legend}</h2>
            <div className="w-full flex items-center">
              <div className="w-3 h-3 border-1 border-white bg-[#6C9EE0] rounded-full"></div>
              <span className="ml-2 italic text-xs">
                {t.benchmark.bestSupplier}
              </span>
            </div>
          </div>

          <div className="w-full flex items-center">
            <div className="w-3 h-3 border-1 border-white bg-[#E0756C] rounded-full"></div>
            <span className="ml-2 italic text-xs">
              {t.benchmark.worstSupplier}
            </span>
          </div>
          {/* <div className='w-full flex items-center'>
            <div className='w-3 h-3 bg-[#F2CC5A] rounded-full'></div>
            <span className='ml-2 italic'>Quantidade de CO₂</span>
          </div> */}
          <div className="w-full flex flex-col justify-center self-center">
            <span className=" text-xs">{t.benchmark.highlightedRange}:</span>
            <div className="flex items-center">
              <div className="w-4 h-4 border-2 border-white rounded-full bg-blue-500"></div>
              <div className="w-full h-2 bg-linear-to-r from-green-600 to-yellow-400"></div>
              <div className="w-4 h-4 border-2 border-white rounded-full bg-amber-700"></div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default Legend;
