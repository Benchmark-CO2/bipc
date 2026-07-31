export const IndicatorItem = ({ color, value, currentUnit, label }: {
  color: string;
  value: number | string;
  currentUnit: string;
  label: string;
}) => {
  return (
    <div className={`text-md border-1 rounded-md p-2 flex items-center justify-center min-w-[40px] gap-1 h-full`} style={{ borderColor: color }}>
      <span className='font-bold' style={{ color }}>{label}</span>
      <span className={`font-bold`} >{value}</span>
      <span className='font-light'>{currentUnit}</span>
    </div>
  );
};