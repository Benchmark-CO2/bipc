import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSummary } from "@/context/summaryContext";
import { useIsMobile } from '@/hooks/useIsMobile';
import * as d3 from "d3";
import React, { useEffect, useRef } from "react";

// Dados baseados na imagem
const data = [
  { id: 0, y: 0.0, start: 10, end: 40 },
  { id: 1, y: 0.1, start: 15, end: 55 },
  { id: 2, y: 0.2, start: 20, end: 60 },
  { id: 3, y: 0.3, start: 25, end: 80 },
  { id: 4, y: 0.4, start: 35, end: 85 },
  { id: 5, y: 0.5, start: 40, end: 95 },
  { id: 6, y: 0.6, start: 35, end: 90 },
  { id: 7, y: 0.7, start: 60, end: 125 },
  { id: 8, y: 0.8, start: 65, end: 165 },
];

type D3GradientRangeChartProps = {
  selectedBars?: string[]; // IDs das barras selecionadas
  data?: { id: string; y: number; min: number; max: number, label: string }[];
  width?: number;
  height?: number;
};
const D3GradientRangeChart: React.FC<D3GradientRangeChartProps> = ({
  selectedBars,
  data,
  width = 600,
  height = 290,
}) => {
  const { isExpanded } = useSummary();
  const svgRef = useRef<SVGSVGElement>(null);
  const isMobile = useIsMobile();
  
  // Dimensões
  const margin = { top: isMobile ? 10 : 20, right: 20, bottom: 40, left: isMobile ? 50 : 60 };
  const _width = (isExpanded ? width  : width) - margin.left - margin.right;
  const _height = (isExpanded ? height * 1 : height * 1.25) - (margin.top + margin.bottom);
  const maxValue =
        data?.map((d) => d.max).reduce((a, b) => Math.max(a, b), 0) || 170;
  const xScale = d3.scaleLinear().domain([0, maxValue]).range([0, _width]);

  const yScale = d3.scaleLinear().domain([0, 1]).range([_height, 0]);

  const barHeight = 8;
  useEffect(() => {
    if (!svgRef.current) return;

    // Limpar SVG anterior
    d3.select(svgRef.current).selectAll("*").remove();

    // Criar SVG
    const svg = d3
      .select(svgRef.current)
      .attr("width", width + margin.left + margin.right)
      .attr("height", height + margin.top + margin.bottom);

    // Grupo principal
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Escalas
    function lighten(color: string, factor = 0.3) {
      const c = d3.color(color);
      if (!c) return color;
      const rgb = c.rgb();
      rgb.r += (255 - rgb.r) * factor;
      rgb.g += (255 - rgb.g) * factor;
      rgb.b += (255 - rgb.b) * factor;
      return rgb.formatRgb();
      // return c.formatRgb();
    }
    // Função para calcular cor baseada em posição X e Y
    const getColor = (x: number, y: number) => {
      const xNorm = Math.max(0, Math.min(1, x / 170));
      const yNorm = Math.max(0, Math.min(1, y / 0.8));

      const colorAtBase = d3.interpolateHcl("green", "blue")(xNorm);
      const colorAtTop = d3.interpolateHcl("green", "red")(xNorm);

      const color = d3.interpolateHcl(colorAtBase, colorAtTop)(yNorm);

      return lighten(color, 0.4); // clareia 40%
    };

    // Grid de fundo
    const xTicks = xScale.ticks(10);
    const yTicks = yScale.ticks(8);

    // Linhas verticais do grid
    g.selectAll(".grid-line-x")
      .data(xTicks)
      .enter()
      .append("line")
      .attr("class", "grid-line-x")
      .attr("x1", (d) => xScale(d))
      .attr("x2", (d) => xScale(d))
      .attr("y1", 0)
      .attr("y2", height)
      .attr("stroke", "#e2e8f0")
      .attr("stroke-width", 1);

    // Linhas horizontais do grid
    g.selectAll(".grid-line-y")
      .data(yTicks)
      .enter()
      .append("line")
      .attr("class", "grid-line-y")
      .attr("x1", 0)
      .attr("x2", width)
      .attr("y1", (d) => yScale(d))
      .attr("y2", (d) => yScale(d))
      .attr("stroke", "#e2e8f0")
      .attr("stroke-width", 1);

    // Eixo X
    g.append("g")
      .attr("transform", `translate(0,${height})`)
      .call(d3.axisBottom(xScale).ticks(10))
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", "#64748b");

    // Eixo Y
    g.append("g")
      .call(d3.axisLeft(yScale).ticks(8))
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", "#64748b");

    // Remover linhas dos eixos
    g.selectAll(".domain").remove();
    g.selectAll(".tick line").remove();

    // Criar barras com gradiente
    (data || []).forEach((d, i) => {
      const y = yScale(d.y);
      const x1 = xScale(d.min);
      const x2 = xScale(d.max);

      // Criar gradiente único para cada barra
      // Criar gradiente único para cada barra
      const gradientId = `gradient-${i}`;
      const gradient = svg
        .append("defs")
        .append("linearGradient")
        .attr("id", gradientId)
        .attr("x1", "0%")
        .attr("x2", "100%")
        .attr("y1", "50%")
        .attr("y2", "50%");
      
      // Função simples: de amarelo até vermelho baseado em X global
      const colorScale = d3
        .scaleLinear<string>()
        .domain([maxValue * 0, maxValue * 0.25, maxValue * 0.5, maxValue]) // mesmo domínio do seu xScale
        .range(["#3b82f6", "hsl(97, 56%, 45%)", "yellow", "red"]);

      // Cores do início e fim
      const startColor = colorScale(d.min);
      const endColor = colorScale(d.max);

      // Adicionar stops (apenas dois bastam nesse caso)
      gradient
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", startColor);

      gradient
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", endColor);

      // Círculo inicial (azul)
      g.append("circle")
        .attr("cx", x1)
        .attr("cy", y)
        .attr("r", 6)
        .attr("fill", "#3b82f6")
        .attr("stroke", "white")
        .attr("stroke-width", 2);

      // Círculo final (cor baseada na posição)
      // const endColor = getColor(d.end, d.y);
      g.append("circle")
        .attr("cx", x2)
        .attr("cy", y)
        .attr("r", 6)
        .attr("fill", endColor)
        .attr("stroke", "white")
        .attr("stroke-width", 2);
    });
  }, [isExpanded, data]);

  useEffect(() => {
    if (!svgRef.current) return;
    if (!data) return;
    const g = d3.select(svgRef.current).select("g");
    if (g.empty()) return;
    (data || []).forEach((d, i) => {
      const gradientId = `gradient-${i}`;
      if ((selectedBars || []).includes(d.id)) {
        const y = yScale(d.y);
        const x1 = xScale(d.min);
        const x2 = xScale(d.max);
        g.append("rect")
          .attr("x", x1)
          .attr("y", y - barHeight / 2)
          .attr("width", x2 - x1)
          .attr("height", barHeight)
          .attr("fill", `url(#${gradientId})`)
          .attr("rx", 4)
          .attr("ry", 4)
          .attr("id", `bar-${d.id}`);
        // add text label with min and max values
        g.append("text")
          .attr("x", x1 - 10)
          .attr("y", y + 4)
          .attr("text-anchor", "end")
          .attr("font-size", 12)
          .attr("fill", "#374151")
          .text(d.min.toFixed(0))
          .attr("id", `bar-label-min-${d.id}`);
        g.append("text")
          .attr("x", x2 + 10)
          .attr("y", y + 4)
          .attr("text-anchor", "start")
          .attr("font-size", 12)
          .attr("fill", "#374151")
          .text(d.max.toFixed(0))
          .attr("id", `bar-label-max-${d.id}`);

        // add project name label inside the bar
        g.append("text")
          .attr("x", (x1 + x2) / 2)
          .attr("y", y - 6)
          .attr("text-anchor", "middle")
          .attr("font-size", 12)
          .attr("fill", "#374151")
          .text(`${d.label}`)
          .attr("id", `bar-label-name-${d.id}`);
      } else {
        g.selectAll("rect")
          .nodes()
          .forEach((rect) => {
            if (!rect) return;
            const no = d3.select(rect);
            if (no.attr("id") === `bar-${d.id}`) {
              no.remove();
            }
            
          });
        g.selectAll("text")
          .nodes()
          .forEach((rect) => {
            if (!rect) return;
            const no = d3.select(rect);
            if (no.attr("id") === `bar-label-min-${d.id}` || no.attr("id") === `bar-label-max-${d.id}` || no.attr("id") === `bar-label-name-${d.id}`) {
              no.remove();
            }

          });
      }
    });
  }, [selectedBars, isExpanded]);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className='block w-full text-center'>Cumulative x KgCO2/m2</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto">
          <svg ref={svgRef} className="bg-white"></svg>
        </div>
      </CardContent>
    </Card>
  );
};

export default D3GradientRangeChart;
