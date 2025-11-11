import { IBenchmarkItem } from "@/actions/benchmarks/types";
import { Card, CardContent } from "@/components/ui/card";
import { useSummary } from "@/context/summaryContext";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import * as d3 from "d3";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Indicators from "./components/indicators";
import { formatNumber } from "@/utils/numbers";

// Utility: Debounce function
const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// Constants
const DEFAULT_COLORS = {
  START: "#3b82f6",
  END: "#E36F35",
  GRADIENT_RANGE: [
    "#3b82f6",
    "hsl(97, 40%, 50%)",
    "hsl(55, 40%, 55%)",
    "hsl(0, 40%, 50%)",
  ],
  GRID: "#e2e8f0",
  TEXT: "#64748b",
  STROKE: "#2563eb",
} as const;

const CHART_CONFIG = {
  BAR_HEIGHT: 18,
  MINIMAL_BAR_HEIGHT: 5,
  CIRCLE_RADIUS: { expanded: 6, normal: 3 },
  TOOLTIP_DIMENSIONS: { width: 120, height: 40, offset: 10 },
} as const;

const UNIT_LABELS = {
  "KgCO₂/m²": "Carbono Incorporado (Kg CO₂/m²)",
  "MJ/m²": "Energia Incorporada (MJ/m²)",
} as const;

// Types
type ChartData = IBenchmarkItem & {
  label: string;
};

type D3GradientRangeChartProps = {
  selectedBars?: string[];
  data?: ChartData[];
  width?: number;
  height?: number;
  overrideDimensions?: boolean;
  unit?: string;
  totalProjects: number;
  minData: number[];
  maxData: number[];
};
// Custom hooks
const useChartDimensions = (
  props: Pick<D3GradientRangeChartProps, "width" | "height">,
  overrideDimensions: boolean,
  isMobile: boolean,
  isExpanded: boolean,
  hasLessValue: boolean,
  hasMoreValue: boolean
) => {
  return useMemo(() => {
    const screenWidth = window.innerWidth;

    const width = () => {
      if (props.width && overrideDimensions) return props.width;
      if (isMobile) return screenWidth * 0.6;
      if (isExpanded) return screenWidth * 0.8;
      if (screenWidth < 1300) return screenWidth * 0.35;
      if (screenWidth > 1300) return screenWidth * 0.4;
      return screenWidth * (hasLessValue || hasMoreValue ? 0.5 : 0.5);
    };

    const height = () => {
      if (props.height && overrideDimensions) return props.height;
      if (isMobile && !isExpanded) return 250;
      if (isMobile && isExpanded) return 320;
      if (isExpanded) return window.innerHeight * 0.96 - 130;
      return window.innerHeight * 0.7 - 340;
    };

    const margin = {
      top: isExpanded ? 15 : 20,
      right: isMobile ? 0 : 20,
      bottom: isMobile ? 20 : 35,
      left: isMobile ? 45 : 80,
    };

    const _width = width();
    const _height = height() - (margin.top + margin.bottom);

    return { width: _width, height: _height, margin };
  }, [
    props.width,
    props.height,
    overrideDimensions,
    isMobile,
    isExpanded,
    hasLessValue,
    hasMoreValue,
  ]);
};

const useTooltipPosition = () => {
  return useCallback(
    (event: MouseEvent, svgRef: React.RefObject<SVGSVGElement | null>) => {
      if (!svgRef.current) return { x: 0, y: 0 };

      const { left, top, width, height } =
        svgRef.current.getBoundingClientRect();
      const mouseX = event.clientX - left;
      const mouseY = event.clientY - top;

      const tooltipWidth = CHART_CONFIG.TOOLTIP_DIMENSIONS.width;
      const tooltipHeight = CHART_CONFIG.TOOLTIP_DIMENSIONS.height;
      const offset = CHART_CONFIG.TOOLTIP_DIMENSIONS.offset;

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

      return { x, y };
    },
    []
  );
};

const D3GradientRangeChart: React.FC<D3GradientRangeChartProps> = ({
  selectedBars = [],
  data = [],
  overrideDimensions = false,
  unit = "",
  totalProjects,
  minData,
  maxData,
  ...props
}) => {
  const { isExpanded } = useSummary();
  const svgRef = useRef<SVGSVGElement>(null);
  const isMobile = useIsMobile();
  const [tooltip, setTooltip] = useState<{
    x: number;
    y: number;
    value: { min: number; max: number; label?: string };
  } | null>(null);
  const [isResized, setIsResized] = useState(0);
  const [brushSelectionCount, setBrushSelectionCount] = useState<number>(0);
  const brushSelectionCountRef = useRef<number>(0);
  const [hasZoomed, setHasZoomed] = useState(false);

  // Inicializar o contador com o total de dados
  useEffect(() => {
    setBrushSelectionCount(data.length);
    brushSelectionCountRef.current = data.length;
  }, [data.length]);

  // Função auxiliar para atualizar o contador
  const updateBrushCount = useCallback((count: number) => {
    brushSelectionCountRef.current = count;
    setBrushSelectionCount(count);
  }, []);

  const minLessDataValue = useMemo(() => Math.min(...minData), [minData]);
  const minMaxDataValue = useMemo(() => Math.min(...maxData), [maxData]);
  const maxLessDataValue = useMemo(() => Math.max(...minData), [minData]);
  const maxMaxDataValue = useMemo(() => Math.max(...maxData), [maxData]);
  const hasLessValue =
    totalProjects > 0
      ? parseFloat((minData[0] || 0).toFixed(2)) < minLessDataValue
      : false;
  const hasMoreValue =
    totalProjects > 0
      ? parseFloat((maxData[maxData.length - 1] || 0).toFixed(2)) >
        maxMaxDataValue
      : false;

  const {
    width: _width,
    height: _height,
    margin,
  } = useChartDimensions(
    props,
    overrideDimensions,
    isMobile,
    isExpanded,
    hasLessValue,
    hasMoreValue
  );

  const getTooltipPosition = useTooltipPosition();

  // Scales and calculations
  const maxValue = useMemo(
    () =>
      (data?.map((d) => d.max).reduce((a, b) => Math.max(a, b), 0) || 170) *
      1.1,
    [data]
  );

  const xScale = useMemo(() => {
    // Ensure we have a valid width before creating the scale
    const width = _width > 0 ? _width : 400; // fallback width
    return d3
      .scaleLinear()
      .domain([0, maxValue * 1.15])
      .range([0, width * 1.1]);
  }, [maxValue, _width]);

  const yScale = useMemo(() => {
    // Y values are normalized between 0 and 1
    return d3.scaleLinear().domain([0, 1.01]).range([_height, 0]);
  }, [_height]);

  const colorScale = useMemo(
    () =>
      d3
        .scaleLinear<string>()
        .domain([0, maxValue * 0.25, maxValue * 0.5, maxValue])
        .range(DEFAULT_COLORS.GRADIENT_RANGE),
    [maxValue]
  );

  // Event handlers - Responsivos e diretos
  const handleMouseOver = useCallback(
    (event: any, d: ChartData) => {
      const position = getTooltipPosition(event, svgRef);
      setTooltip({
        ...position,
        value: {
          min: d.min,
          max: d.max,
          label: selectedBars?.includes(d.id) ? d.label : undefined,
        },
      });
    },
    [getTooltipPosition]
  ); // Removed selectedBars dependency to prevent re-renders

  const handleMouseMove = useCallback(
    (event: any, d: ChartData) => {
      const position = getTooltipPosition(event, svgRef);
      setTooltip({
        ...position,
        value: {
          min: d.min,
          max: d.max,
          label: selectedBars?.includes(d.id) ? d.label : undefined,
        },
      });
    },
    [getTooltipPosition]
  ); // Removed selectedBars dependency to prevent re-renders

  const handleMouseOut = useCallback(() => {
    setTooltip(null);
  }, []);

  // Resize handler - Debounced leve
  const debouncedResizeRef = useMemo(
    () =>
      debounce(() => {
        if (!svgRef.current) return;

        const parent = svgRef.current.parentElement;
        if (!parent) return;

        // Only update width attribute, don't trigger chart recreation
        svgRef.current.setAttribute(
          "width",
          (parent.clientWidth + margin.left + margin.right).toString()
        );

        // Update internal width state without triggering full re-render
        // This preserves zoom state and other interactions
      }, 50),
    [svgRef, margin]
  );

  useEffect(() => {
    window.addEventListener("resize", debouncedResizeRef);
    return () => window.removeEventListener("resize", debouncedResizeRef);
  }, [debouncedResizeRef]);

  // ResizeObserver to watch parent element changes
  useEffect(() => {
    if (!svgRef.current?.parentElement) return;

    let resizeTimer: NodeJS.Timeout;
    const resizeObserver = new ResizeObserver(() => {
      // Clear previous timer
      clearTimeout(resizeTimer);

      // Debounce the resize to avoid excessive updates
      resizeTimer = setTimeout(() => {
        if (!svgRef.current) return;

        const parent = svgRef.current.parentElement;
        if (!parent) return;

        const newWidth = parent.clientWidth + margin.left + margin.right;
        const currentWidth = svgRef.current.getAttribute("width");

        // Only update if there's a significant change in width (> 20px to be very conservative)
        if (Math.abs(newWidth - parseFloat(currentWidth || "0")) > 20) {
          svgRef.current.setAttribute("width", newWidth.toString());

          // Update chart dimensions while preserving zoom state
          const svg = d3.select(svgRef.current);
          const currentTransform = d3.zoomTransform(svg.node() as any);

          if (
            currentTransform &&
            (currentTransform.k !== 1 ||
              currentTransform.x !== 0 ||
              currentTransform.y !== 0)
          ) {
            // If zoomed, preserve the transform but update chart area
            // Update clipping path
            svg.select("#clip rect").attr("width", parent.clientWidth);
          } else {
            // If not zoomed, trigger a controlled re-render
            setIsResized((prev) => prev + 1);
          }
        }
      }, 150); // Increased debounce time to be more conservative
    });

    resizeObserver.observe(svgRef.current.parentElement);

    return () => {
      clearTimeout(resizeTimer);
      resizeObserver.disconnect();
    };
  }, [margin]);

  // Main chart effect
  useEffect(() => {
    if (!svgRef.current) return;

    // Clear previous SVG
    d3.select(svgRef.current).selectAll("*").remove();

    // Create SVG
    const svg = d3
      .select(svgRef.current)
      .attr("width", _width + margin.left + margin.right)
      .attr("height", _height + margin.top + margin.bottom);

    // Main group
    const g = svg
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create clipping path to hide elements outside the chart area
    svg
      .append("defs")
      .append("clipPath")
      .attr("id", "clip")
      .append("rect")
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", _width)
      .attr("height", _height);

    // Apply clipping to a group that will contain all chart elements
    const chartArea = g.append("g").attr("clip-path", "url(#clip)");

    // Grid lines
    const xTicks = xScale.ticks(isExpanded ? 30 : 10);
    const yTicks = yScale.ticks(8);

    // Vertical grid lines
    chartArea
      .selectAll(".grid-line-x")
      .data(xTicks)
      .enter()
      .append("line")
      .attr("class", "grid-line-x")
      .attr("x1", (d) => xScale(d))
      .attr("x2", (d) => xScale(d))
      .attr("y1", 0)
      .attr("y2", _height)
      .attr("stroke", DEFAULT_COLORS.GRID)
      .attr("stroke-width", 1);

    // Horizontal grid lines
    chartArea
      .selectAll(".grid-line-y")
      .data(yTicks)
      .enter()
      .append("line")
      .attr("class", "grid-line-y")
      .attr("x1", 0)
      .attr("x2", _width)
      .attr("y1", (d) => yScale(d))
      .attr("y2", (d) => yScale(d))
      .attr("stroke", DEFAULT_COLORS.GRID)
      .attr("stroke-width", 1);

    // Axes (outside clipped area)
    g.append("g")
      .attr("class", "axis-x")
      .attr("transform", `translate(0,${_height})`)
      .call(d3.axisBottom(xScale).ticks(Math.min(10, Math.floor(_width / 60))))
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", DEFAULT_COLORS.TEXT)
      .text(d => (d as number).toInternational());

    g.append("g")
      .attr("class", "axis-y")
      .call(d3.axisLeft(yScale).ticks(8))
      .selectAll("text")
      .style("font-size", "12px")
      .style("fill", DEFAULT_COLORS.TEXT)
      .text(d => (d as number).toInternational());
    // Remove axis lines
    g.selectAll(".domain").remove();
    g.selectAll(".tick line").remove();

    // Zoom behavior com scroll e touch (pinch)
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 10]) // Min 1x (original), Max 10x
      .translateExtent([
        [0, 0],
        [_width, _height],
      ])
      .extent([
        [0, 0],
        [_width, _height],
      ])
      .wheelDelta((event) => {
        // Sensibilidade do scroll: menor = mais suave
        // -event.deltaY / 500 = sensibilidade de ~0.2 (20% por scroll)
        // Shift + scroll = 2x mais rápido
        const sensitivity = event.shiftKey ? 250 : 700;
        return -event.deltaY / sensitivity;
      })
      .filter((event) => {
        // Permitir zoom com wheel, pan com drag E touch events (pinch no mobile)
        // Bloquear apenas o botão direito do mouse e dblclick
        return !event.button && event.type !== "dblclick";
      })
      .touchable(() => true) // Habilitar explicitamente eventos touch para pinch-to-zoom
      .on("zoom", zoomed);

    // Aplicar zoom ao SVG
    svg.call(zoom as any).on("dblclick.zoom", null); // Desabilitar o duplo-click padrão do zoom

    // Create data points with gradients
    (data || []).forEach((d, i) => {
      const y = yScale(d.y);
      const x1 = xScale(d.min);
      const x2 = xScale(d.max);

      // Create unique gradient for each bar
      const gradientId = `gradient-${i}`;
      const gradient = svg
        .append("defs")
        .append("linearGradient")
        .attr("id", gradientId)
        .attr("x1", "0%")
        .attr("x2", "100%")
        .attr("y1", "50%")
        .attr("y2", "50%");

      const startColor = colorScale(d.min);
      const endColor = colorScale(d.max);

      gradient
        .append("stop")
        .attr("offset", "0%")
        .attr("stop-color", startColor);

      gradient
        .append("stop")
        .attr("offset", "100%")
        .attr("stop-color", endColor);

      // Start circle (inside clipped area)
      chartArea
        .append("circle")
        .attr("cx", x1)
        .attr("cy", y)
        .attr(
          "r",
          isExpanded
            ? CHART_CONFIG.CIRCLE_RADIUS.expanded
            : CHART_CONFIG.CIRCLE_RADIUS.normal
        )
        .attr("fill", DEFAULT_COLORS.START)
        .attr("stroke", "white")
        .attr("stroke-width", isExpanded ? (isMobile ? 1 : 2) : 0)
        .attr("data-point", `${i}-start`)
        .style("pointer-events", "all") // Garantir que eventos funcionem
        .on("mouseover", (event) => {
          handleMouseOver(event, d);
        })
        .on("mousemove", (event) => handleMouseMove(event, d))
        .on("mouseout", handleMouseOut)
        .raise();

      // End circle (inside clipped area)
      chartArea
        .append("circle")
        .attr("cx", x2)
        .attr("cy", y)
        .attr(
          "r",
          isExpanded
            ? CHART_CONFIG.CIRCLE_RADIUS.expanded
            : CHART_CONFIG.CIRCLE_RADIUS.normal
        )
        .attr("fill", DEFAULT_COLORS.END)
        .attr("stroke", "white")
        .attr("stroke-width", isExpanded ? (isMobile ? 1 : 2) : 0)
        .attr("data-point", `${i}-end`)
        .raise()
        .style("pointer-events", "all") // Garantir que eventos funcionem
        .on("mouseover", (event) => {
          handleMouseOver(event, d);
        })
        .on("mousemove", (event) => handleMouseMove(event, d))
        .on("mouseout", handleMouseOut);
    });

    // Função de zoom - responsiva e imediata
    function zoomed(event: any) {
      const transform = event.transform;

      // Criar novas escalas baseadas no transform
      const newXScale = transform.rescaleX(xScale);
      const newYScale = transform.rescaleY(yScale);

      // Atualizar eixos imediatamente
      g.select<SVGGElement>(".axis-x").call(
        d3
          .axisBottom(newXScale)
          .ticks(Math.min(15, Math.floor(_width / 60))) as any
      );

      g.select<SVGGElement>(".axis-y").call(
        d3.axisLeft(newYScale).ticks(8) as any
      );

      // Atualizar posições imediatamente
      updateElementsPosition(newXScale, newYScale);

      // Contar elementos visíveis
      const [x0, x1] = newXScale.domain();
      const [y0, y1] = newYScale.domain();

      const countInView = data.filter((d) => {
        const xInRange = d.min >= x0 && d.max <= x1;
        const yInRange = d.y >= y0 && d.y <= y1;
        return xInRange && yInRange;
      }).length;

      updateBrushCount(countInView);

      // Verificar se está com zoom ativo (qualquer transformação)
      const isZoomed =
        transform.k !== 1 || transform.x !== 0 || transform.y !== 0;
      setHasZoomed(isZoomed);
    }

    svg.on("dblclick", () => {
      // Reset zoom usando o comportamento do D3 zoom
      svg
        .transition()
        .duration(750)
        .call(zoom.transform as any, d3.zoomIdentity);

      // Reset contador para o total
      updateBrushCount(data.length);

      // Reset indicador de zoom
      setHasZoomed(false);
    });

    function updateElementsPosition(newXScale = xScale, newYScale = yScale) {
      // Update all circles - simplificado e direto
      (data || []).forEach((d, i) => {
        const x1 = newXScale(d.min);
        const x2 = newXScale(d.max);
        const y = newYScale(d.y);

        // Update start circles - seleção direta
        chartArea
          .selectAll(`circle[data-point="${i}-start"]`)
          .attr("cx", x1)
          .attr("cy", y)
          .style("pointer-events", "all")
          .on("mouseover", (event: any) => handleMouseOver(event, d))
          .on("mousemove", (event: any) => handleMouseMove(event, d))
          .on("mouseout", handleMouseOut);

        // Update end circles - seleção direta
        chartArea
          .selectAll(`circle[data-point="${i}-end"]`)
          .attr("cx", x2)
          .attr("cy", y)
          .style("pointer-events", "all")
          .on("mouseover", (event: any) => handleMouseOver(event, d))
          .on("mousemove", (event: any) => handleMouseMove(event, d))
          .on("mouseout", handleMouseOut);

        // Update selected bar elements if they exist
        const barRect = chartArea.select(`rect#bar-${d.id}`);
        if (!barRect.empty()) {
          if (isExpanded) {
            barRect
              .attr("x", x1 - 12)
              .attr("y", y - (CHART_CONFIG.BAR_HEIGHT + 4) / 2)
              .attr("width", x2 - x1 + 24);
          } else {
            barRect
              .attr("x", x1)
              .attr("y", y - CHART_CONFIG.MINIMAL_BAR_HEIGHT / 2)
              .attr("width", x2 - x1);
          }
        }

        // Update selected bar circles
        chartArea
          .select(`circle#bar-circle-start-${d.id}`)
          .attr("cx", x1)
          .attr("cy", y);

        chartArea
          .select(`circle#bar-circle-end-${d.id}`)
          .attr("cx", x2)
          .attr("cy", y);

        // Update labels
        const avgX = (x1 + x2) / 2;
        const isMoreThanHalf = avgX < (maxValue ? maxValue * 0.5 : 0);

        chartArea
          .select(`text#bar-label-min-${d.id}`)
          .attr("x", x1 - 18)
          .attr("y", y + 4);

        chartArea
          .select(`text#bar-label-max-${d.id}`)
          .attr("x", x2 + 18)
          .attr("y", y + 4);

        chartArea
          .select(`text#bar-label-project-${d.id}`)
          .attr("x", isMoreThanHalf ? x2 + 150 : x1 - 150)
          .attr("y", y + 4);

        chartArea
          .select(`text#bar-label-name-${d.id}`)
          .attr("x", (x1 + x2) / 2)
          .attr("y", y + 5);
      });

      // Update grid lines
      const xTicks = newXScale.ticks(isExpanded ? 30 : 10);
      const yTicks = newYScale.ticks(8);

      // Update vertical grid lines
      const gridX = chartArea
        .selectAll<SVGLineElement, number>(".grid-line-x")
        .data(xTicks);

      gridX.exit().remove();

      gridX
        .enter()
        .append("line")
        .attr("class", "grid-line-x")
        .merge(gridX)
        .attr("x1", (d) => newXScale(d))
        .attr("x2", (d) => newXScale(d))
        .attr("y1", 0)
        .attr("y2", _height)
        .attr("stroke", DEFAULT_COLORS.GRID)
        .attr("stroke-width", 1);

      // Update horizontal grid lines
      const gridY = chartArea
        .selectAll<SVGLineElement, number>(".grid-line-y")
        .data(yTicks);

      gridY.exit().remove();

      gridY
        .enter()
        .append("line")
        .attr("class", "grid-line-y")
        .merge(gridY)
        .attr("x1", 0)
        .attr("x2", _width)
        .attr("y1", (d) => newYScale(d))
        .attr("y2", (d) => newYScale(d))
        .attr("stroke", DEFAULT_COLORS.GRID)
        .attr("stroke-width", 1);
    }

    // Cleanup function
    return () => {
      // Nenhum cleanup necessário
    };
  }, [
    isExpanded,
    data,
    isResized,
    _width,
    _height,
    margin,
    xScale,
    yScale,
    colorScale,
    updateBrushCount,
  ]);

  // Selected bars effect
  useEffect(() => {
    if (!svgRef.current || !data) return;
    const g = d3.select(svgRef.current).select("g");
    if (g.empty()) return;

    // Select the chartArea group (with clip-path)
    const chartArea = g.select("g[clip-path='url(#clip)']");
    if (chartArea.empty()) return;

    (data || []).forEach((d, i) => {
      const gradientId = `gradient-${i}`;
      if (selectedBars.includes(d.id)) {
        const y = yScale(d.y);
        const x1 = xScale(d.min);
        const x2 = xScale(d.max);

        if (isExpanded) {
          chartArea
            .append("rect")
            .attr("x", x1 - 12)
            .attr("y", y - (CHART_CONFIG.BAR_HEIGHT + 4) / 2)
            .attr("width", x2 - x1 + 24)
            .attr("height", CHART_CONFIG.BAR_HEIGHT + 4)
            .attr("fill", `url(#${gradientId})`)
            .attr("rx", 15)
            .attr("ry", 15)
            .attr("id", `bar-${d.id}`)
            .attr("stroke", DEFAULT_COLORS.STROKE)
            .attr("stroke-width", 2);
        } else {
          chartArea
            .append("rect")
            .attr("x", x1)
            .attr("y", y - CHART_CONFIG.MINIMAL_BAR_HEIGHT / 2)
            .attr("width", x2 - x1)
            .attr("height", CHART_CONFIG.MINIMAL_BAR_HEIGHT)
            .attr("fill", `url(#${gradientId})`)
            .attr("rx", 5)
            .attr("ry", 5)
            .attr("id", `bar-${d.id}`)
            .attr("stroke", DEFAULT_COLORS.STROKE)
            .attr("stroke-width", 0.1);
        }

        // Start circle
        chartArea
          .append("circle")
          .attr("cx", x1)
          .attr("cy", y)
          .attr("r", isExpanded ? CHART_CONFIG.CIRCLE_RADIUS.expanded : 5)
          .attr("fill", DEFAULT_COLORS.START)
          .attr("stroke", "white")
          .attr("stroke-width", isExpanded ? 2 : 1)
          .attr("id", `bar-circle-start-${d.id}`);

        // End circle
        chartArea
          .append("circle")
          .attr("cx", x2)
          .attr("cy", y)
          .attr("r", isExpanded ? CHART_CONFIG.CIRCLE_RADIUS.expanded : 5)
          .attr("fill", DEFAULT_COLORS.END)
          .attr("stroke", "white")
          .attr("stroke-width", isExpanded ? 2 : 0.5)
          .attr("id", `bar-circle-end-${d.id}`);

        const avgX = (x1 + x2) / 2;
        const isMoreThanHalf = avgX < (maxValue ? maxValue * 0.5 : 0);

        // Min value label
        chartArea
          .append("text")
          .attr("x", x1 - 18)
          .attr("y", y + 4)
          .attr("text-anchor", "end")
          .attr("font-size", 14)
          .attr("font-weight", "bold")
          .attr("fill", "var(--primary)")
          .text(d.min.toInternational(undefined, 0))
          .attr("id", `bar-label-min-${d.id}`);

        // Max value label
        chartArea
          .append("text")
          .attr("x", x2 + 18)
          .attr("y", y + 4)
          .attr("text-anchor", "start")
          .attr("font-size", 14)
          .attr("font-weight", "bold")
          .attr("fill", "var(--primary)")
          .text(d.max.toInternational(undefined, 0))
          .attr("id", `bar-label-max-${d.id}`);

        // Project identifier
        chartArea
          .append("text")
          .attr("x", isMoreThanHalf ? x2 + 150 : x1 - 150)
          .attr("y", y + 4)
          .attr("text-anchor", "start")
          .attr("font-size", 12)
          .attr("font-weight", "normal")
          .attr("fill", "var(--primary)")
          .text(
            `${isMoreThanHalf ? "<--" : ""} ${d.label} ${!isMoreThanHalf ? "-->" : ""}`
          )
          .attr("id", `bar-label-project-${d.id}`);

        // Project name inside bar (expanded only)
        if (isExpanded) {
          chartArea
            .append("text")
            .attr("x", (x1 + x2) / 2)
            .attr("y", y + 5)
            .attr("text-anchor", "middle")
            .attr("font-size", 14)
            .attr("font-weight", "bold")
            .attr("fill", "#FFF")
            .text(d.label)
            .attr("id", `bar-label-name-${d.id}`);
        }
      } else {
        // Remove elements for unselected bars
        chartArea
          .selectAll("rect, text, circle")
          .nodes()
          .forEach((element) => {
            if (!element) return;
            const node = d3.select(element);
            const id = node.attr("id");
            if (
              id &&
              (id === `bar-${d.id}` ||
                id === `bar-label-min-${d.id}` ||
                id === `bar-label-max-${d.id}` ||
                id === `bar-label-name-${d.id}` ||
                id === `bar-label-project-${d.id}` ||
                id === `bar-circle-start-${d.id}` ||
                id === `bar-circle-end-${d.id}`)
            ) {
              node.remove();
            }
          });
      }
    });
  }, [selectedBars, isExpanded, data, isResized, yScale, xScale, maxValue]);

  const labelX =
    UNIT_LABELS[unit as keyof typeof UNIT_LABELS] || "Carbono Incorporado";

  return (
    <Card className={cn("shadow-none w-min-content min-w-1/2")}>
      <CardContent>
        <div className="w-full overflow-hidden relative">
          <span className="absolute text-xs w-full text-center text-foreground/70 block rotate-270 left-0 -translate-x-[47%] -translate-y-1/2 top-1/2 h-8 m-0 p-0">
            Potencial de mitigação
          </span>

          <Indicators
            max={maxLessDataValue}
            min={minLessDataValue}
            hasZoomed={hasZoomed}
            position="end"
          />

          <svg ref={svgRef} className="bg-white dark:bg-zinc-900 w-full" />

          {!isMobile && (
            <Indicators
              max={maxLessDataValue}
              min={minLessDataValue}
              hasZoomed={hasZoomed}
              position="start"
            />
          )}

          {tooltip && (
            <div
              className="absolute bg-gray-800 text-white text-sm p-3 rounded pointer-events-none transition-opacity duration-200 flex flex-col gap-2 z-400"
              style={{
                left: tooltip.x + 10,
                top: tooltip.y + 10,
              }}
            >
              <span>
                Min:{" "}
                <b>
                  {tooltip.value.min.toInternational()} {unit}
                </b>
              </span>
              <span>
                Max:{" "}
                <b>
                  {tooltip.value.max.toInternational()} {unit}
                </b>
              </span>
            </div>
          )}
        </div>

        <div className="flex max-sm:flex-col-reverse max-sm:gap-4 max-sm:mt-2">
          <span>
            Exibindo: {brushSelectionCount} / {data?.length || 0}
          </span>
          {isMobile && (
            <Indicators
              max={maxLessDataValue}
              min={minLessDataValue}
              hasZoomed={hasZoomed}
              position="start"
            />
          )}
          <span className="flex-1 text-xs text-center w-full text-foreground/70">
            {labelX}
          </span>
        </div>
      </CardContent>
    </Card>
  );
};

export default D3GradientRangeChart;
