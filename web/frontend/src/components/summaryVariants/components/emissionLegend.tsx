import { useTranslation } from '@/i18n';
import { structureTypes } from '@/utils/structureTypes';
import { LegendItem } from './chartLegend';

const colorPalette = ['#1F818C', '#F08B46', '#9C72DF', '#6C9EE0', '#E0756C', '#45b54a', '#E2D36C'];
export const EmissionLegend = ({ keys }: { keys: string[] }) => {
  const { t } = useTranslation();
  if (!keys || keys.length === 0) {
    return null; // Retorna null se keys for undefined ou vazio
  }
  const legendItems = keys.map((key, idx) => ({ label: key, color: colorPalette[idx % colorPalette.length], icon: '', shape: 'square' }));
  return (
    <ul className='flex flex-wrap gap-4 justify-start items-start'>
      {legendItems.map((item, index) => (
        <LegendItem key={index} icon={item.icon} label={structureTypes(t)[item.label as keyof ReturnType<typeof structureTypes> ] || item.label} color={item.color} shape={item.shape as 'circle' | 'square'} />
      ))}
    </ul>
  )
} 