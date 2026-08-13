import { useTranslation } from "@/i18n";
import { cn } from "@/lib/utils";
import { MAP_COLORS, MAP_EMPTY, MAP_THRESHOLDS } from "@/utils/geoUtils";

const DISPLAY_COLORS = [MAP_EMPTY, ...MAP_COLORS];

/** Fixed range labels derived from MAP_THRESHOLDS, e.g. ["1-5", "6-10", "11-20", "21-40", ">41"] */
const MAP_RANGE_LABELS = MAP_COLORS.map((_, i) => {
  const lo = i === 0 ? 1 : MAP_THRESHOLDS[i - 1] + 1;
  if (i === MAP_COLORS.length - 1)
    return `>${MAP_THRESHOLDS[MAP_THRESHOLDS.length - 1]}`;
  return `${lo}-${MAP_THRESHOLDS[i]}`;
});

interface LegendProps {
  variant?: "default" | "map";
  maxCount?: number;
}

const Legend = ({ variant = "default" }: LegendProps) => {
  const { t } = useTranslation();

  return (
    <section
      className={cn("w-full flex justify-between", {
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
              {/* Fixed range labels — independent of maxCount */}
              {MAP_RANGE_LABELS.map((label, k) => (
                <div key={k} className="w-10 text-center">
                  {label}
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-4 w-full items-end max-sm:grid-cols-1 max-2xl:grid-cols-2 3xl:grid-cols-4 max-sm:gap-2 max-sm:my-4">
          <div className="w-full flex flex-col justify-center">
            {/* <h2 className="text-sm font-bold mb-2">{t.benchmark.legend}</h2> */}
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
