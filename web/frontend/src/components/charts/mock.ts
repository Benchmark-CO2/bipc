export interface DataPoint {
  x: number;
  y: number;
  fill: boolean;
  label?: string;
  isGlobal?: boolean; // Indica se o ponto é de uma simulação global
};

export function generateDescendingMockData(
  length = 8,
  xStep = 5,
  maxY = 100,
  minY = 0
): DataPoint[] {
  const maxX = (length - 1) * xStep;
  const yRange = maxY - minY;

  let currentY = maxY;
  const data: { x: number; y: number; fill: boolean }[] = [];

  for (let i = 0; i < length; i++) {
    const x = maxX - i * xStep;

    // Variação orgânica com viés negativo
    const baseStep = yRange / length;
    const noise = (Math.random() - 0.5) * baseStep * 0.6; // ±30% de ruído
    const downwardDrift = baseStep * (0.7 + Math.random() * 0.6); // passo base com viés para descer

    currentY -= downwardDrift + noise;

    // Garante que não desça além do mínimo
    if (currentY < minY) currentY = minY;

    data.push({
      x,
      y: parseFloat(currentY.toFixed(2)),
      fill: false,
    });
  }

  return data.sort((a, b) => a.y - b.y); // Ordena por y
}

export function selectFilledPoints(
  data: DataPoint[],
  count = 1
): { x: number; y: number; fill: boolean }[] {
  if (count > data.length) {
    throw new Error("Count cannot be greater than data length");
  }

  const indices = [...Array(data.length).keys()];

  // Embaralha os índices
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const selected = indices.slice(0, count);

  return selected.map(i => ({
    ...data[i],
    fill: true,
  })).sort((a, b) => a.y - b.y); // Ordena por y
}