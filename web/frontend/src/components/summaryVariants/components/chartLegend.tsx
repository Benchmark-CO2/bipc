import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import { MARKER_COLORS } from '../utils';
import Legend from './Legend';

export const LegendItem = ({ icon, label, color, shape  = 'circle' }: { icon:string, label: string, color: string, shape?: 'circle' | 'square' }) => {
  return (
    <li className='flex gap-2 items-center'>
      <div className={cn(`w-5 h-5 flex items-center justify-center text-white text-xs font-bold`, {
        'rounded-full': shape === 'circle',
        'rounded-xs w-3 h-3': shape === 'square',
      })} style={{ backgroundColor: color }}>{icon}</div>
      <span className='text-xs text-foreground'>{label}</span>
    </li>
  )
}
export const ChartLegend = () => {
  const { t } = useTranslation();
  const legendItems = [
    { icon: 'V', label: t.summary.chartLegend.referenceValue, color: MARKER_COLORS.V },
    { icon: 'C', label: t.summary.chartLegend.constructionMitigationPotential, color: MARKER_COLORS.C },
    { icon: 'P', label: t.summary.chartLegend.projectMitigationPotential, color: MARKER_COLORS.P },
    { icon: 'R', label: t.summary.chartLegend.riskOfLowerConstructionMitigation, color: MARKER_COLORS.R },
  ];
  return (
    <div className='flex flex-col gap-1 flex-shrink-0'>
      <span className='italic text-xs'>{t.summary.chartLegend.title}:</span>
      <ul className='flex flex-wrap gap-4 justify-start items-start'>
      {legendItems.map((item, index) => (
        <LegendItem key={index} icon={item.icon} label={item.label} color={item.color} />
      ))}
    </ul>
    <Legend  />
    </div>
  )
}