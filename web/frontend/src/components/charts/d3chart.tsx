import { Card, CardContent } from "@/components/ui/card";
import { useSummary } from "@/context/summaryContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import * as d3 from "d3";
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
  data?: { id: string; y: number; min: number; max: number; label: string }[];
  width?: number;
  height?: number;
  overrideDimensions?: boolean;
  unit?: string;
};
const D3GradientRangeChart: React.FC<D3GradientRangeChartProps> = ({
  selectedBars,
  data,
  overrideDimensions = false,
  unit = "",
  ...props
}) => {
  const { isExpanded } = useSummary();
  const svgRef = useRef<SVGSVGElement>(null);
  const isMobile = useIsMobile();
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    value: { min: number; max: number; label?: string };
  } | null>();

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
  const maxValue =
    (data?.map((d) => d.max).reduce((a, b) => Math.max(a, b), 0) || 170) * 1.1;
  const xScale = d3
    .scaleLinear()
    .domain([0, maxValue])
    .range([0, _width * 1.05]);

  const maxYValue =
    data?.map((d) => d.y).reduce((a, b) => Math.max(a, b), 0) || 1;
  const yScale = d3.scaleLinear().domain([0, maxYValue]).range([_height, 0]);

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

    // Linhas verticais do grid
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

    // Eixo X
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
        .range([
          "#3b82f6", // azul saturado
          "hsl(97, 40%, 50%)", // verde menos saturado
          "hsl(55, 40%, 55%)", // amarelo menos saturado
          "hsl(0, 40%, 50%)", // vermelho menos saturado
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

      // Círculo inicial (azul)
      g.append("circle")
        .attr("cx", x1)
        .attr("cy", y)
        .attr("r", isExpanded ? 6 : 3)
        .attr("fill", "#3b82f6")
        .attr("stroke", "white")
        .attr("stroke-width", isExpanded ? 2 : 0)
        .on("mouseover", function (event) {
          const { left, top, width, height } =
            svgRef.current!.getBoundingClientRect();

          const mouseX = event.clientX - left;
          const mouseY = event.clientY - top;

          const tooltipWidth = 120;
          const tooltipHeight = 40;
          const offset = 10;

          let x = mouseX + offset;
          if (mouseX + tooltipWidth + offset > width) {
            x = mouseX - tooltipWidth - offset;
          }

          let y = mouseY;
          if (mouseY + tooltipHeight > height) {
            y = height - tooltipHeight - offset;
          }
          if (mouseY < offset) {
            y = offset;
          }
          setTooltip({
            x,
            y,
            value: {
              min: d.min,
              max: d.max,
              label: selectedBars?.includes(d.id) ? d.label : undefined,
            },
          });
        })
        .on("mousemove", function (event) {
          const { left, top, width, height } =
            svgRef.current!.getBoundingClientRect();

          const mouseX = event.clientX - left;
          const mouseY = event.clientY - top;

          const tooltipWidth = 120;
          const tooltipHeight = 40;
          const offset = 10;

          let x = mouseX + offset;
          if (mouseX + tooltipWidth + offset > width) {
            x = mouseX - tooltipWidth - offset;
          }

          let y = mouseY - offset;
          if (mouseY + tooltipHeight > height) {
            y = height - tooltipHeight - (offset + 20);
          }
          if (mouseY < offset) {
            y = offset;
          }
          setTooltip({
            x,
            y,
            value: {
              min: d.min,
              max: d.max,
              label: selectedBars?.includes(d.id) ? d.label : undefined,
            },
          });
        })
        .on("mouseout", function () {
          setTooltip(null);
        });

      // Círculo final (cor baseada na posição)
      // const endColor = getColor(d.end, d.y);

      g.append("circle")
        .attr("cx", x2)
        .attr("cy", y)
        .attr("r", isExpanded ? 6 : 3)
        .attr("fill", "#E36F35")
        .attr("stroke", "white")
        .attr("stroke-width", isExpanded ? 2 : 0)
        .on("mouseover", function (event) {
          const { left, top, width, height } =
            svgRef.current!.getBoundingClientRect();

          const mouseX = event.clientX - left;
          const mouseY = event.clientY - top;

          const tooltipWidth = 120;
          const tooltipHeight = 40;
          const offset = 10;

          let x = mouseX + offset;
          if (mouseX + tooltipWidth + offset > width) {
            x = mouseX - tooltipWidth - offset;
          }

          let y = mouseY;
          if (mouseY + tooltipHeight > height) {
            y = height - tooltipHeight - offset;
          }
          if (mouseY < offset) {
            y = offset;
          }
          setTooltip({
            x,
            y,
            value: {
              min: d.min,
              max: d.max,
              label: selectedBars?.includes(d.id) ? d.label : undefined,
            },
          });
        })
        .on("mousemove", function (event) {
          const { left, top, width, height } =
            svgRef.current!.getBoundingClientRect();

          const mouseX = event.clientX - left;
          const mouseY = event.clientY - top;

          const tooltipWidth = 120;
          const tooltipHeight = 40;
          const offset = 10;

          let x = mouseX + offset;
          if (mouseX + tooltipWidth + offset > width) {
            x = mouseX - tooltipWidth - offset;
          }

          let y = mouseY - offset;
          if (mouseY + tooltipHeight > height) {
            y = height - tooltipHeight - (offset + 20);
          }
          if (mouseY < offset) {
            y = offset;
          }
          setTooltip({
            x,
            y,
            value: {
              min: d.min,
              max: d.max,
              label: selectedBars?.includes(d.id) ? d.label : undefined,
            },
          });
        })
        .on("mouseout", function () {
          setTooltip(null);
        });
    });
  }, [isExpanded, data, isResized]);

  // useEffect(() => {
  //   if (!svgRef.current) return;
  //   if (!data) return;
  //   const g = d3.select(svgRef.current).select("g");
  //   data.forEach(d => {

  //     g.on("mouseover", function (event) {
  //         const { left, top, width } = svgRef.current!.getBoundingClientRect();

  //           const mouseX = event.clientX - left;
  //           const mouseY = event.clientY - top;

  //           const tooltipWidth = 120;
  //           const offset = 10;

  //           let x = mouseX + offset;
  //           if (mouseX + tooltipWidth + offset > width) {
  //             x = mouseX - tooltipWidth - offset;
  //           }

  //           setTooltip({
  //             x,
  //             y: mouseY - 20,
  //             value: {
  //               min: d.min,
  //               max: d.max,
  //               label: selectedBars?.includes(d.id) ? d.label : undefined
  //             },
  //           });
  //       })
  //         .on("mousemove", function (event) {
  //           const { left, top, width } = svgRef.current!.getBoundingClientRect();

  //           const mouseX = event.clientX - left;
  //           const mouseY = event.clientY - top;

  //           const tooltipWidth = 120;
  //           const offset = 10;

  //           let x = mouseX + offset;
  //           if (mouseX + tooltipWidth + offset > width) {
  //             x = mouseX - tooltipWidth - offset;
  //           }

  //           setTooltip({
  //             x,
  //             y: mouseY - 20,
  //             value: {
  //               min: d.min,
  //               max: d.max,
  //               label: selectedBars?.includes(d.id) ? d.label : undefined
  //             },
  //           });
  //         })
  //         .on("mouseout", function () {
  //           setTooltip(null);
  //         });
  //   })
  // }, [data, selectedBars]);

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
  }, [selectedBars, isExpanded, data, isResized, tooltip]);

  const labelX = {
    "KgCO₂/m²": "Carbono Incorporado (Kg CO₂/m²)",
    "MJ/m²": "Energia Incorporada (MJ/m²)",
  } as any;

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
                Min:{" "}
                <b>
                  {tooltip.value.min.toFixed(3)} {unit}
                </b>
              </span>
              <span>
                Max:{" "}
                <b>
                  {tooltip.value.max.toFixed(3)} {unit}
                </b>
              </span>
            </div>
          )}
        </div>
        <div className="flex">
          <span>N: {data?.length}</span>
          <span className="flex-1 text-center w-full text-black/70">
            {/* Carbono Incorporado (Kg CO₂/m²) */}
            {labelX[unit] || "Carbono Incorporado"}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default D3GradientRangeChart;
