import { cn } from "@/lib/utils"
import { formatNumber } from '@/utils/numbers';
import { Triangle } from "lucide-react"

type IndicatorsProps = {
  min: number
  max: number
  position: 'start' | 'center' | 'end'
  hasZoomed: boolean
}
const Indicators = ({ min, max, position, hasZoomed }: IndicatorsProps) => {
  return (
    <div className={cn("mr-auto flex justify-start w-full my-2 mb-4 gap-10 opacity-100 transition-opacity max-sm:w-full", {
      'opacity-0': !hasZoomed,
      'self-end ml-auto justify-end': position === 'end',
      'self-center': position === 'center',
      'self-start': position === 'start',
    })}>
      <div className="flex gap-1 flex-row-reverse">
        <span className='text-sm text-foreground/70'>{formatNumber(min, 2)}</span>
        <Triangle className={cn("w-3 h-3 fill-[#3b82f6] -rotate-90 stroke-[#3b82f6]  max-sm:h-4 self-center", {
          'rotate-90': position === 'end',
          'rotate-0': position === 'center',
        })} />
      </div>
      <div className="flex gap-1 flex-row-reverse">
        <span className='text-sm text-foreground/70'>{formatNumber(max, 2)}</span>
        <Triangle className={cn("w-3 h-3 fill-[#E36F35] -rotate-90 stroke-[#E36F35]  max-sm:h-4 self-center", {
          'rotate-90': position === 'end',
          'rotate-0': position === 'center',
        })} />
      </div>
    </div>
  )
}

export default Indicators