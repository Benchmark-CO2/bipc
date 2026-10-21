import { IndicatorItem } from './indicatorItem';

export const IndicatorList = ({ indicators }: { indicators: { color: string; value: number | string; currentUnit: string, label: string; }[]; }) => {
  return (
    <>
      {indicators.map((indicator, index) => (
        <IndicatorItem
          key={index}
          color={indicator.color}
          value={indicator.value}
          currentUnit={indicator.currentUnit}
          label={indicator.label}
        />
      ))}
    </>
  );
};