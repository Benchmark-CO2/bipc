import { Card, CardContent } from "@/components/ui/card";
import { useSummary } from "@/context/summaryContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import * as d3 from "d3";
import { regressionPoly } from 'd3-regression';
import React, { useEffect, useRef, useState } from "react";

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
  data?: { id: string; y: number; min: number; max: number; label: string; }[];
  width?: number;
  height?: number;
  overrideDimensions?: boolean;
};
const D3GradientRangeLineChart: React.FC<D3GradientRangeChartProps> = ({
  selectedBars,
  data,
  overrideDimensions = false,
  ...props
}) => {
  const { isExpanded } = useSummary();
  const svgRef = useRef<SVGSVGElement>(null);
  const isMobile = useIsMobile();
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    value: { min: number; max: number; label?: string; };
  } | null>();
  const reversedData = data?.map(f => ({ ...f, y: 1 - f.y })).sort((a, b) => a.min - b.min);
  const screenWidth = window.innerWidth;
  const width = () => {
    if (props.width && overrideDimensions) return props.width;

    if (isMobile) return screenWidth - 340;
    if (isExpanded) return screenWidth * 0.8;
    if (screenWidth < 1300) return screenWidth * 0.35;
    return screenWidth * 0.5;
  };

  const height = () => {
    if (props.height && overrideDimensions) return props.height;

    if (isMobile && !isExpanded) return 250;
    if (isMobile && isExpanded) return 320;
    if (isExpanded) return window.innerHeight * 0.96 - 130;
    return 550 - 230;
  };

  // Dimensões
  const margin = {
    top: isExpanded ? 15 : 20,
    right: 20,
    bottom: 35,
    left: isMobile ? 50 : 80,
  };
  const _width = width();
  const _height = height() - (margin.top + margin.bottom);


  // const maxYValue =
  //   reversedData?.map((d) => d.y).reduce((a, b) => Math.max(a, b), 0) || 1;
  const yScale = d3.scaleLinear().domain([1, 0]).range([0, _height]);

  const barHeight = 18;

  const [isResized, setIsResized] = useState(0);
  useEffect(() => {
    const handleResize = () => {
      setIsResized((prev) => prev + 1);
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  // Escalas para o gráfico

  const yValues = (data || []).map(d => d.y);
  const maxValues = (data || []).map(d => d.max);
  const minValues = (data || []).map(d => d.min);

  const minValue = Math.min(...maxValues);
  const maxValue = Math.max(...maxValues);

  // Normaliza os valores de max
  const normalized = (data || []).map(d => ({
    x: d.y,
    y: (d.max - minValue) / (maxValue - minValue),
  }));
  const normalizedMin = (data || []).map(d => ({
    x: d.y,
    y: (d.min - Math.min(...minValues)) / (Math.max(...minValues) - Math.min(...minValues)),
  }));

  // Ajuste polinomial de ordem 4
  const poly = regressionPoly().x(d => d.x).y(d => d.y).order(3);
  const fittedMax = poly(normalized);
  const fittedMin = poly(normalizedMin);

  // Combina os valores mínimos e máximos ajustados
  // Desnormaliza o eixo Y (volta para escala original)
  const denormalizedMax = fittedMax.map(([x, y]) => ({
    x,
    y: y * (maxValue - minValue) + minValue,
  }));

  const denormalizedMin = fittedMin.map(([x, y]) => ({
    x,
    y: y * (Math.max(...minValues) - Math.min(...minValues)) + Math.min(...minValues),
  }));

const xScale2 = d3.scaleLinear()
  .domain([0, maxValue * 1.05])
  .range([margin.left, _width - margin.right]);

const yScale2 = d3.scaleLinear()
  .domain([0, 1])
  .range([_height - margin.bottom, margin.top]);
  console.log({ denormalizedMax, denormalizedMin });
  const xScale = d3
    .scaleLinear()
    .domain([0, maxValue])
    .range([0, _width * 1.05]);

  useEffect(() => {
    if (!svgRef.current) return;

    // Limpar SVG anterior
    d3.select(svgRef.current).selectAll("*").remove();

    // Criar SVG
    const svg = d3
      .select(svgRef.current)
      .attr("width", _width + margin.left + margin.right + 20)
      .attr("height", _height + margin.top + margin.bottom);

    // Grupo principal
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Grid de fundo
    const xTicks = xScale.ticks(isExpanded ? 30 : 10);
    const yTicks = yScale.ticks(8);
    
    g.selectAll(".grid-line-x")
      .data(xTicks)
      .enter()
      .append("line")
      .attr("class", "grid-line-x")
      .attr("x1", (d) => xScale(d))
      .attr("x2", (d) => xScale(d))
      .attr("y1", 0)
      .attr("y2", _height)
      .attr("stroke", "#e2e8f0")
      .attr("stroke-width", 1);

    // Linhas horizontais do grid
    g.selectAll(".grid-line-y")
      .data(yTicks)
      .enter()
      .append("line")
      .attr("class", "grid-line-y")
      .attr("x1", 0)
      .attr("x2", _width)
      .attr("y1", (d) => yScale(d))
      .attr("y2", (d) => yScale(d))
      .attr("stroke", "#e2e8f0")
      .attr("stroke-width", 1);

    // Eixo Y
    g.append("g")
      .attr("transform", `translate(0,${_height})`)
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

    const procelColors = ["#028", "#7CFC00", "#FFFF00", "#FFA500", "#FF0000"];
    const faixaCount = procelColors.length;
    const faixaHeight = (_width * 1.05) / faixaCount; // altura de cada faixa
    
    procelColors.reverse().forEach((color, i) => {
      g.append("rect")
        .attr("y", _height - 4)
        .attr("x", i * faixaHeight)
        .attr("width", faixaHeight)
        .attr("height", 8)
        .attr("fill", color)
        .attr("opacity", 0.7); // suaviza o fundo
    });

    svg.append("path")
      .datum(denormalizedMin)
      .attr("fill", "none")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 2)
      .attr("d", d3.line<{ x: number; y: number; }>()
        .x(d => xScale2(d.y)) // usa o eixo de carbono incorporado
        .y(d => yScale2(d.x)) // se o seu y for o potencial de mitigação
        .curve(d3.curveBasis)
      );
    svg.append("path")
      .datum(denormalizedMax)
      .attr("fill", "none")
      .attr("stroke", "#E36F35")
      .attr("stroke-width", 2)
      .attr("d", d3.line<{ x: number; y: number; }>()
        .x(d => xScale2(d.y)) // usa o eixo de carbono incorporado
        .y(d => yScale2(d.x)) // se o seu y for o potencial de mitigação
        .curve(d3.curveBasis)
      );

  }, [isExpanded, reversedData, isResized, data]);

  useEffect(() => {
    if (!svgRef.current) return;
    if (!reversedData) return;
    const g = d3.select(svgRef.current).select("g");
    if (g.empty()) return;
    (reversedData || []).forEach((d, i) => {
      const gradientId = `gradient-${i}`;
      if ((selectedBars || []).includes(d.id)) {
        const y = yScale(d.y);
        const x1 = xScale2(d.min);
        const x2 = xScale2(d.max);

        if (isExpanded) {
          g.append("rect")
            .attr("x", x1 - 12)
            .attr("y", y - (barHeight + 4) / 2)
            .attr("width", x2 - x1 + 24)
            .attr("height", barHeight + 4)
            .attr("fill", `url(#${gradientId})`)
            .attr("rx", 15)
            .attr("ry", 15)
            .attr("id", `bar-${d.id}`)
            .attr("stroke", "#2563eb")
            .attr("stroke-width", 2);
        } else {
          const minimalBarHeight = 5;
          g.append("rect")
            .attr("x", x1)
            .attr("y", y - minimalBarHeight / 2)
            .attr("width", x2 - x1)
            .attr("height", minimalBarHeight)
            .attr("fill", `url(#${gradientId})`)
            .attr("rx", 5)
            .attr("ry", 5)
            .attr("id", `bar-${d.id}`)
            .attr("stroke", "#2563eb")
            .attr("stroke-width", 0.1);
        }

        g.append("circle")
          .attr("cx", x1)
          .attr("cy", y)
          .attr("r", isExpanded ? 6 : 5)
          .attr("fill", "#3b82f6")
          .attr("stroke", "white")
          .attr("stroke-width", isExpanded ? 2 : 1)
          .attr("id", `bar-circle-start-${d.id}`);

        g.append("circle")
          .attr("cx", x2)
          .attr("cy", y)
          .attr("r", isExpanded ? 6 : 5)
          .attr("fill", "#E36F35")
          .attr("stroke", "white")
          .attr("stroke-width", isExpanded ? 2 : 0.5)
          .attr("id", `bar-circle-end-${d.id}`);

        // add text label with min and max values
        g.append("text")
          .attr("x", x1 - 18)
          .attr("y", y + 4)
          .attr("text-anchor", "end")
          .attr("font-size", 14)
          .attr("font-weight", "bold")
          .attr("fill", "var(--primary)")
          .text(d.min.toFixed(0))
          .attr("id", `bar-label-min-${d.id}`);

        g.append("text")
          .attr("x", x2 + 18)
          .attr("y", y + 4)
          .attr("text-anchor", "start")
          .attr("font-size", 14)
          .attr("font-weight", "bold")
          .attr("fill", "var(--primary)")
          .text(d.max.toFixed(0))
          .attr("id", `bar-label-max-${d.id}`);

        // add project name label inside the bar
        if (isExpanded)
          g.append("text")
            .attr("x", (x1 + x2) / 2)
            .attr("y", y + 5)
            .attr("text-anchor", "middle")
            .attr("font-size", 14)
            .attr("font-weight", "bold")
            .attr("fill", "#FFF")
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
            if (
              no.attr("id") === `bar-label-min-${d.id}` ||
              no.attr("id") === `bar-label-max-${d.id}` ||
              no.attr("id") === `bar-label-name-${d.id}` ||
              no.attr("id") === `bar-circle-start-${d.id}` ||
              no.attr("id") === `bar-circle-end-${d.id}`
            ) {
              no.remove();
            }
          });
      }
    });
  }, [selectedBars, isExpanded, reversedData, isResized, tooltip]);

  return (
    <Card className={cn("shadow-none w-min-content")}>
      {/* <CardHeader>
        <CardTitle className="block w-full text-center">
          Cumulative x KgCO2/m2
        </CardTitle>
      </CardHeader> */}
      <CardContent>
        <div className="w-full overflow-hidden relative">
          <span className="absolute w-full text-center text-black/70 block rotate-270  left-0 -translate-x-[47%] -translate-y-1/2 top-1/2 h-8 m-0 p-0">
            potencial de mitigação
          </span>
          <svg ref={svgRef} className="bg-white dark:bg-sidebar"></svg>
          {tooltip && (
            <div
              className="absolute bg-gray-800 text-white text-sm p-3 rounded pointer-events-none transition-opacity duration-200 flex flex-col gap-2 z-400"
              style={{
                left: tooltip.x + 10,
                top: tooltip.y + 10,
              }}
            >
              {/* {tooltip.value.id && (
                <>
                  <span className="font-bold">{tooltip.value.label}</span>
                <Divider  />
                </>
              )} */}
              <span>
                Min: <b>{tooltip.value.min.toFixed(3)} Kg/m2</b>
              </span>
              <span>
                Max: <b>{tooltip.value.max.toFixed(3)} Kg/m2</b>
              </span>
            </div>
          )}
        </div>
        <div className="flex">
          <span>N: {data?.length}</span>
          <span className="flex-1 text-center w-full text-black/70">
            Carbono Incorporado (Kg CO₂/m²)
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default D3GradientRangeLineChart;
