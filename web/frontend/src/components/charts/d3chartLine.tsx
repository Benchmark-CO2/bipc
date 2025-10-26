import { Card, CardContent } from "@/components/ui/card";
import { useSummary } from "@/context/summaryContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import * as d3 from "d3";
import { regressionPoly } from "d3-regression";
import React, { useEffect, useRef, useState } from "react";
import Divider from "../ui/divider";

type DataPoint = { x: number; y: number };

type D3GradientRangeChartProps = {
  selectedBars?: string[]; // IDs das barras selecionadas
  data?: { id: string; y: number; min: number; max: number; label: string }[];
  width?: number;
  height?: number;
  overrideDimensions?: boolean;
  customData?: any;
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
  const [tooltip, _setTooltip] = useState<{
    x: number;
    y: number;
    value: {
      min: number;
      max: number;
      label?: string;
    };
  } | null>();
  const reversedData = data
    ?.map((f) => ({ ...f, y: 1 - f.y }))
    .sort((a, b) => a.min - b.min);
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

  const revertData = (data || [])
    .map((d) => ({ ...d, y: 1 - d.y }))
    .sort((a, b) => a.min - b.min);

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

  const maxValues = (revertData || []).map((d) => d.max);
  const minValues = (revertData || []).map((d) => d.min);

  const minValue = Math.min(...maxValues);
  const maxValue = Math.max(...maxValues);

  // Normaliza os valores de max
  const normalized = (revertData || []).map((d) => ({
    x: d.y,
    y: (d.max - minValue) / (maxValue - minValue),
  }));
  const normalizedMin = (revertData || []).map((d) => ({
    x: d.y,
    y:
      (d.min - Math.min(...minValues)) /
      (Math.max(...minValues) - Math.min(...minValues)),
  }));

  const normalizeX = (x: number) => (x - xMin) / (xMax - xMin);

  // Ajuste polinomial de ordem 4
  const poly = regressionPoly()
    .x((d: DataPoint) => d.x)
    .y((d: DataPoint) => d.y)
    .order(3);
  const fittedMax = poly(normalized);
  const fittedMin = poly(normalizedMin);

  let denormalizedMax = fittedMax.map(([x, y]: [number, number]) => ({
    x,
    y: y * (maxValue - minValue) + minValue,
  }));

  let denormalizedMin = fittedMin.map(([x, y]: [number, number]) => ({
    x,
    y:
      y * (Math.max(...minValues) - Math.min(...minValues)) +
      Math.min(...minValues),
  }));
  const xMin =
    d3.min([...denormalizedMin, ...denormalizedMax], (d: DataPoint) => d.x) ??
    0;
  const xMax =
    d3.max([...denormalizedMin, ...denormalizedMax], (d: DataPoint) => d.x) ??
    1;

  denormalizedMax = denormalizedMax.map((d: DataPoint) => ({
    x: normalizeX(d.x),
    y: d.y,
  }));
  denormalizedMin = denormalizedMin.map((d: DataPoint) => {
    return {
      ...d,
      x: normalizeX(d.x),
    };
  });

  const xScale = d3.scaleLinear().domain([0, 1]).range([0, _width]);

  const yScale = d3.scaleLinear().domain([0, maxValue * 1.05]).range([0, _height]);

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

    const verticalLine = g
      .append("line")
      .attr("class", "tooltip-line")
      .attr("stroke", "#aaa")
      .attr("stroke-width", 1)
      .attr("y1", margin.top)
      .attr("y2", _height + margin.top)
      .style("opacity", 0);

    const horizontalLine = g
      .append("line")
      .attr("class", "tooltip-line")
      .attr("stroke", "#333")
      .attr("stroke-width", 1)
      .attr("x1", 0)
      .attr("x2", _width)
      .style("opacity", 0);
    const horizontalLine2 = g
      .append("line")
      .attr("class", "tooltip-line")
      .attr("stroke", "#333")
      .attr("stroke-width", 1)
      .attr("x1", 0)
      .attr("x2", _width)
      .style("opacity", 0);

    svg
      .append("rect")
      .attr("x", margin.left)
      .attr("y", margin.top)
      .attr("width", _width)
      .attr("height", _height)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .on("mousemove", (event) => {
        const [mx, my] = d3.pointer(event, g.node());
        const x0 = xScale.invert(mx);
        const y0 = yScale.invert(my);
        // função pra achar o ponto mais próximo em um dataset
        const getClosest = (data: DataPoint[], x: number) => {
          const bisect = d3.bisector((d: DataPoint) => d.x).center;
          const i = bisect(data, x);
          const clamp = (idx: number) =>
            Math.max(0, Math.min(idx, data.length - 1));
          return data[clamp(i)];
        };

        const dMax = getClosest(denormalizedMax, x0);
        const dMin = getClosest(denormalizedMin, x0);

        verticalLine
          .attr("x1", xScale(x0))
          .attr("x2", xScale(x0))
          .style("opacity", 1);

        horizontalLine
          .attr("x1", 0)
          .attr("x2", _width)
          .attr("y1", yScale(dMax.y))
          .attr("y2", yScale(dMax.y))
          .style("opacity", 1);

        horizontalLine2
          .attr("x1", 0)
          .attr("x2", _width)
          .attr("y1", yScale(dMin.y))
          .attr("y2", yScale(dMin.y))
          .style("opacity", 1);

        _setTooltip({
          x:
            xScale(dMax.x) > _width / 2
              ? xScale(dMax.x) - 100
              : xScale(dMax.x) + 100,
          y: yScale(y0),
          value: {
            min: dMin.y,
            max: dMax.y,
            label: ``,
          },
        });
      })
      .on("mouseleave", () => {
        verticalLine.style("opacity", 0);
        horizontalLine.style("opacity", 0);
        horizontalLine2.style("opacity", 0);
        _setTooltip(null);
      });

    // Grid de fundo
    const xTicks = xScale.ticks(isExpanded ? 30 : 10);
    const yTicks = yScale.ticks(12);

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

    const procelColors = [
      "#14400D",
      "#6B9215",
      "#F2E530",
      "#F28C0F",
      "#D90D0D",
    ];
    const faixaCount = procelColors.length;
    const faixaHeight = _width / faixaCount;

    procelColors.reverse().forEach((color, i) => {
      g.append("rect")
        .attr("y", _height - 10)
        .attr("x", i * faixaHeight)
        .attr("width", faixaHeight)
        .attr("height", 10)
        .attr("fill", color)
        .attr("opacity", 0.5); // suaviza o fundo
    });

    svg
      .append("path")
      .datum(denormalizedMin)
      .attr("fill", "none")
      .attr("stroke", "#3b82f6")
      .attr("stroke-width", 4)
      .attr("transform", `translate(${margin.left},${margin.top})`)
      .attr(
        "d",
        d3
          .line<{ x: number; y: number }>()
          .x((d) => xScale(d.x)) // usa o eixo de carbono incorporado
          .y((d) => yScale(d.y)) // se o seu y for o potencial de mitigação
          .curve(d3.curveBasis)
      );
    svg
      .append("path")
      .datum(denormalizedMax)
      .attr("fill", "none")
      .attr("stroke", "#E36F35")
      .attr("stroke-width", 4)
      .attr("stroke-dasharray", "6 3")
      .attr("transform", `translate(${margin.left},${margin.top})`)
      .attr(
        "d",
        d3
          .line<{ x: number; y: number }>()
          .y((d) => yScale(d.y))
          .x((d) => xScale(d.x))
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
      const gradient = g
        .append("defs")
        .append("linearGradient")
        .attr("id", gradientId)
        .attr("x1", "50%")
        .attr("x2", "50%")
        .attr("y1", "0%")
        .attr("y2", "100%");

      // Função simples: de amarelo até vermelho baseado em X global
      const colorScale = d3
        .scaleLinear<string>()
        .domain([maxValue * 0.20, maxValue * 0.40, maxValue * 0.60, maxValue * 0.80, maxValue]) // mesmo domínio do seu xScale
        .range([
          "#14400D",
          "#6B9215",
          "#F2E530",
          "#F28C0F",
          "#D90D0D",
        ]);

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
      // const gradientId = `gradient-${i}`;
      if ((selectedBars || []).includes(d.id)) {
        const x = xScale(d.y);
        const y1 = yScale(d.min);
        const y2 = yScale(d.max);
        const minimalBarHeight = 8;

        if (isExpanded) {
          g.append("rect")
            .attr("x", x - 12)
            .attr("y", y1 - (barHeight + 4) / 2)
            .attr("width", 24)
            .attr("height", y2 - y1 + barHeight + 4)
            .attr("fill", `url(#${gradientId})`)
            .attr("rx", 15)
            .attr("ry", 15)
            .attr("id", `bar-${d.id}`)
            .attr("stroke", "#2563eb")
            .attr("stroke-width", 2);
        } else {
          g.append("rect")
            .attr("x", x)
            .attr("y", y1 - minimalBarHeight / 2 - 2)
            // .attr("y2", y2)
            .attr("width", minimalBarHeight)
            .attr("height", y2 - y1 + 4)
            .attr("fill", `url(#${gradientId})`)
            .attr("rx", 5)
            .attr("ry", 5)
            .attr("id", `bar-${d.id}`)
            .attr("stroke", "#2563eb")
            .attr("stroke-width", 0.1);
        }


        g.append("circle")
          .attr("cx", x + (isExpanded ? barHeight : minimalBarHeight) / 2)
          .attr("cy", y1)
          .attr("r", isExpanded ? 6 : 5)
          .attr("fill", "#3b82f6")
          .attr("stroke", "white")
          .attr("stroke-width", isExpanded ? 2 : 1)
          .attr("id", `bar-circle-start-${d.id}`);

        g.append("circle")
          .attr("cx", x + (isExpanded ? barHeight : minimalBarHeight) / 2)
          .attr("cy", y2)
          .attr("r", isExpanded ? 6 : 5)
          .attr("fill", "#E36F35")
          .attr("stroke", "white")
          .attr("stroke-width", isExpanded ? 2 : 0.5)
          .attr("id", `bar-circle-end-${d.id}`);

        // add text label with min and max values
        // g.append("text")
        //   .attr("x", x + (isExpanded ? barHeight : minimalBarHeight) + 4)
        //   .attr("y", y1 - 8)
        //   .attr("text-anchor", "end")
        //   .attr("font-size", 12)
        //   .attr("font-weight", "normal")
        //   .attr("fill", "var(--primary)")
        //   .text(d.min.toFixed(0))
        //   .attr("id", `bar-label-min-${d.id}`);
        g.append("text")
          .attr("x", x + (isExpanded ? barHeight : minimalBarHeight) - 20)
          .attr("y", y1 + (isExpanded ? barHeight : minimalBarHeight))
          .attr("text-anchor", "end")
          .attr("font-size", 12)
          .attr("font-weight", "normal")
          .attr("fill", "var(--primary)")
          .attr(
            "transform",
            `rotate(90, ${x + (isExpanded ? barHeight : minimalBarHeight)}, ${y1})`
          )
          .text(`${d.label} -> `)
          .attr("id", `bar-label-min-${d.id}`);

        // g.append("text")
        //   .attr("x", x + 18)
        //   .attr("y", y2)
        //   .attr("text-anchor", "start")
        //   .attr("font-size", 12)
        //   .attr("font-weight", "normal")
        //   .attr("fill", "var(--primary)")
        //   .text(d.max.toFixed(0))
        //   .attr("id", `bar-label-max-${d.id}`);

        // add project name label inside the bar
        if (isExpanded)
          g.append("text")
            .attr("x", (y1 + y2) / 2)
            .attr("y", x + 5)
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
            Carbono Incorporado (Kg CO₂/m²)
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
              {tooltip.value.label && (
                <>
                  <span className="font-bold">{tooltip.value.label}</span>
                  <Divider />
                </>
              )}
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
            potencial de mitigação
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default D3GradientRangeLineChart;
