import { useTranslation } from '@/i18n';
import { cn } from '@/lib/utils';
import Legend from './Legend';

export const LegendItem = ({ icon, label, color, shape  = 'circle' }: { icon:string, label: string, color: string, shape?: 'circle' | 'square' }) => {
  return (
    <li className='flex gap-2 items-center'>
      <div className={cn(`w-5 h-5 flex items-center justify-center text-white text-sm`, {
        'rounded-full': shape === 'circle',
        'rounded-xs w-3 h-3': shape === 'square',
      })} style={{ backgroundColor: color }}>{icon}</div>
      <span className='text-xs text-black'>{label}</span>
    </li>
  )
}
export const ChartLegend = () => {
  const { t } = useTranslation();
  const legendItems = [
    { icon: 'V', label: t.summary.chartLegend.referenceValue, color: '#62A436' },
    { icon: 'C', label: t.summary.chartLegend.constructionMitigationPotential, color: '#5B9BD5' },
    { icon: 'P', label: t.summary.chartLegend.projectMitigationPotential, color: '#E0756C' },
    { icon: 'R', label: t.summary.chartLegend.riskOfLowerConstructionMitigation, color: '#9F70DB' },
  ];
  return (
    <div className='flex flex-col gap-2'>
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