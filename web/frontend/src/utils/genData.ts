import { DataPoint, generateDescendingMockData, selectFilledPoints } from '@/components/charts/mock';

export const genData = (filledPoints: number) => {
   const _greenData = generateDescendingMockData(10, 5, 1, 0);
      let _greyData = selectFilledPoints(_greenData, filledPoints);
    
      _greyData = _greenData.map((item, idx) => {
        const foundItemIdx = _greyData.findIndex((greyItem) => greyItem.y === item.y);
        const foundItem = _greyData[foundItemIdx];
        _greenData[idx].label = foundItem ? 'n'+(((foundItemIdx - _greyData.length) * -1)) : '';
        return {
          ...item,
          x: item.x + 30,
          fill: foundItem ? foundItem.fill : false,
          label: foundItem ? 'v'+(((foundItemIdx - _greyData.length) * -1)) : '',
        };
      }
      );

      return {
        green: _greenData,
        grey: _greyData
      }
}
export function generateNextDescendingPoint (
  {x, y}: DataPoint,
  xStep = 0.00001,
  minY = 0
): { x: number; y: number; fill: boolean } {
  if (x === undefined || y === undefined) {
    const initialY = 0.99; // Entre 0.85 e 1
    const initialX = 80; // Por exemplo, começa no X=40 (ajuste como quiser)
    return {
      x: initialX,
      y: parseFloat(initialY.toFixed(4)),
      fill: false,
    };
  }

  const yRange = 1 - minY;
  const baseStep = yRange / 17;
  const noise = (Math.random() - 0.5) * baseStep * 0.6;
  const downwardDrift = baseStep * (0.7 + Math.random() * 0.6);

  let newY = y - downwardDrift - noise;

  // Garantir que o Y sempre desça
  if (newY >= y) {
    newY = y - 0.00001;
  }
  if (newY < minY) {
    newY = minY;
  }

  // Garantir que o X sempre desça (andando da direita para a esquerda)
  const newX = x - xStep*300_000;
  return {
    x: newX,
    y: parseFloat(newY.toFixed(4)),
    fill: false,
  };
}

export const genRowData = (lastValue: DataPoint | null = null) => {
  let _rowData = {} as DataPoint;
  if (lastValue === null)
    _rowData = generateNextDescendingPoint({ x: undefined, y: undefined, fill: false } as unknown as DataPoint);
  else
    _rowData = generateNextDescendingPoint(lastValue);
  
  return {
    green: _rowData,
    grey: { x: _rowData.x + 30,
      y: _rowData.y,
      fill: true} as DataPoint
  };
}
