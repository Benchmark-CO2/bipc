import { useTranslation } from '@/i18n';
import { getChartCategories, getTechColor, getTechLabel } from '../utils';
import { LegendItem } from './chartLegend';

interface BarsLegendProps {
  // Mesmos itens passados ao EmissionsSection (cada um com as linhas do gráfico em chartData)
  data: { chartData?: Record<string, unknown>[] }[];
}

// Legenda das barras empilhadas: as tecnologias presentes nos dados, com a mesma cor e o mesmo nome do gráfico
export const BarsLegend = ({ data }: BarsLegendProps) => {
  const { t } = useTranslation();
  const categories = getChartCategories(data.flatMap((item) => item.chartData ?? []));

  if (categories.length === 0) return null;

  return (
    <div className='flex flex-col gap-1'>
      <span className='italic text-xs'>{t.summary.chartLegend.title}:</span>
      <ul className='flex flex-wrap gap-x-4 gap-y-1 justify-start items-center'>
        {categories.map((category) => (
          <LegendItem
            key={category}
            icon=''
            label={getTechLabel(category, t)}
            color={getTechColor(category).bar}
            shape='square'
          />
        ))}
      </ul>
    </div>
  );
};
