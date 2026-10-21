import { cn } from "@/lib/utils";
import { Triangle } from "lucide-react";

type IndicatorsProps = {
  min: number
  max: number
  position: 'start' | 'center' | 'end'
  hasZoomed: boolean
  /** Count of items outside view toward smaller values (left / below). Shown in bottom indicator. */
  countSmaller?: number
  /** Count of items outside view toward larger values (right / above). Shown in top indicator. */
  countLarger?: number
}

const Indicators = ({ min, max, position, hasZoomed, countSmaller = 0, countLarger = 0 }: IndicatorsProps) => {
  // Top indicator (position="end") shows items above/right (larger values).
  // Bottom indicator (position="start") shows items below/left (smaller values).
  const count = position === 'end' ? countLarger : countSmaller
  // Triangle: default points up (↑). rotate-180 = down (↓).
  const arrowRotation = position === 'end' ? 'rotate-0' : 'rotate-180'

  return (
    <div className={cn("mr-auto flex justify-start w-full my-2 mb-4 gap-10 opacity-100 transition-opacity max-sm:w-full", {
      'opacity-0': !hasZoomed,
      'self-end ml-auto justify-end': position === 'end',
      'self-center': position === 'center',
      'self-start': position === 'start',
    })}>
      {/* Count of items outside the current view — only when zoomed */}
      {/* {hasZoomed && (
        <div className="flex gap-1 items-center">
          <Triangle className={cn("w-3 h-3 fill-foreground/60 stroke-foreground/60 max-sm:h-4", arrowRotation)} />
          <span className='text-sm text-foreground/70'>{count}</span>
        </div>
      )} */}
      {/* Min arrow — blue */}
      <div className="flex gap-1 flex-row-reverse">
        <span className='text-sm text-foreground/70'>{min.toInternational()}</span>
        <Triangle className={cn("w-3 h-3 fill-[#3b82f6] -rotate-90 stroke-[#3b82f6] max-sm:h-4 self-center", {
          'rotate-90': position === 'end',
          'rotate-0': position === 'center',
        })} />
      </div>
      {/* Max arrow — orange */}
      <div className="flex gap-1 flex-row-reverse">
        <span className='text-sm text-foreground/70'>{max.toInternational()}</span>
        <Triangle className={cn("w-3 h-3 fill-[#E36F35] -rotate-90 stroke-[#E36F35] max-sm:h-4 self-center", {
          'rotate-90': position === 'end',
          'rotate-0': position === 'center',
        })} />
      </div>
    </div>
  )
}

export default Indicators