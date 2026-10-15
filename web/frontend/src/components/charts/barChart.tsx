import { getTechColor, getTechKey } from '@/components/summaryVariants/utils';
import { useTranslation } from '@/i18n';
import * as d3 from 'd3';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const EmissionsChart = ({
  data,
  benchmarkMax,
  barHeight = 6,
  marginLeft = 130,
  marginRight = 30
}: {
  data: any[];
  benchmarkMax: Record<string, number> | number;
  barHeight?: number;
  marginLeft?: number;
  marginRight?: number;
}) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 100 });
  const tooltipRef = useRef<HTMLDivElement>(null);
  const { language, t } = useTranslation();

  useEffect(() => {
    if (!wrapperRef.current) return;
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;
      const calculatedHeight = Math.max(100, (data?.length || 0) * 38 + 20);
      setDimensions({ width, height: calculatedHeight });
    });
    resizeObserver.observe(wrapperRef.current);
    return () => resizeObserver.disconnect();
  }, [data]);

  useEffect(() => {
    if (!data || data.length === 0 || dimensions.width === 0) return;

    const { width, height } = dimensions;
    const margin = { top: 25, right: marginRight, bottom: 5, left: marginLeft };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', width)
      .attr('height', height)
      .style('background', 'transparent')
      .style('font-family', 'inherit');

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const keys = Array.from(new Set(data.flatMap(Object.keys))).filter(k => k !== 'name' && k !== 'id');

    const safeData = data.map(d => {
      const row = { ...d };
      keys.forEach(k => {
        if (row[k] === undefined || isNaN(row[k])) row[k] = 0;
      });
      return row;
    });

    const stack = d3.stack().keys(keys);
    const series = stack(safeData as any);

    const yScale = d3.scaleBand()
      .domain(safeData.map(d => d.name))
      .range([0, innerHeight])
      .padding(0.3);

    const rowScales: Record<string, d3.ScaleLinear<number, number>> = {};
    safeData.forEach(d => {
      const rowLocalSum = keys.reduce((sum, key) => sum + (d[key] || 0), 0);
      let rowAnchor = 0;
      const cleanName = String(d.name).trim();

      if (typeof benchmarkMax === 'number') {
        rowAnchor = benchmarkMax;
      } else if (benchmarkMax && typeof benchmarkMax === 'object') {
        rowAnchor = Number(benchmarkMax[cleanName] ?? benchmarkMax[d.id]) || 0;
      }
      
      const rowMax = rowAnchor > 0 ? rowAnchor : (rowLocalSum || 100);
      rowScales[d.name] = d3.scaleLinear().domain([0, rowMax]).range([0, innerWidth]);
    });

    // Nome da tecnologia para o tooltip (Viga Pilar, Radier Estaqueado...)
    const techNames: Record<string, string> = {
      beam_column: t.modules.structureTypes.beamColumn,
      concrete_wall: t.modules.structureTypes.concreteWall,
      structural_masonry: t.modules.structureTypes.masonry,
      raft_foundation: t.modules.structureTypes.raftFoundation,
      piles_foundation: t.modules.structureTypes.pilesFoundation,
      raft_piles_foundation: t.modules.structureTypes.raftPilesFoundation,
    };
    const techName = (category: string) => techNames[getTechKey(category)] ?? category;

    // Valores com 2 casas decimais no formato do idioma (vírgula em pt-BR, ponto em en)
    const formatValue = (val: number) =>
      val.toLocaleString(language === 'en' ? 'en-US' : 'pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const yAxis = d3.axisLeft(yScale).tickSize(0).tickPadding(10);
    const yAxisGroup = g.append('g').call(yAxis);
    yAxisGroup.select('.domain').remove();
    
    // Sem limite de caracteres e com tamanho ajustado para caber perfeitamente
    yAxisGroup.selectAll('.tick text')
      .attr('font-size', '13px')
      .attr('fill', '#1a1f36')
      .attr('font-weight', 'bold');

    const layer = g.selectAll('.layer')
      .data(series)
      .enter()
      .append('g')
      // Cor fixa por tecnologia (tokens do Figma); style aceita var(--token)
      .style('fill', d => getTechColor(d.key).bar);

    layer.selectAll('rect')
      .data(d => d)
      .enter()
      .append('rect')
      .attr('y', d => (yScale(d.data.name) as number) + (yScale.bandwidth() / 2) - (barHeight / 2))
      .attr('x', d => rowScales[d.data.name](d[0]))
      .attr('width', d => Math.max(0, rowScales[d.data.name](d[1]) - rowScales[d.data.name](d[0])))
      .attr('height', barHeight)
      .style('cursor', 'default')
      // Tooltip: tecnologia, métrica e valor do segmento
      .on('mousemove', function (event: MouseEvent, d) {
        const tooltip = tooltipRef.current;
        if (!tooltip) return;
        const key = (d3.select(this.parentNode as d3.BaseType).datum() as { key: string }).key;
        const color = getTechColor(key).bar;
        tooltip.replaceChildren();
        const title = document.createElement('div');
        title.className = 'flex items-center gap-1.5 font-semibold text-neutral-900';
        const swatch = document.createElement('span');
        swatch.className = 'inline-block size-2.5 rounded-xs';
        swatch.style.background = color;
        title.append(swatch, techName(key));
        const value = document.createElement('div');
        value.className = 'text-neutral-600';
        value.textContent = `${String(d.data.name)}: ${formatValue(d[1] - d[0])}`;
        tooltip.append(title, value);
        // Posição fixa na tela (o tooltip fica no body, fora dos cards com overflow-hidden).
        // Abre para a esquerda/para cima quando não cabe à direita/embaixo.
        const { clientX: x, clientY: y } = event;
        const fitsRight = x + 12 + tooltip.offsetWidth <= window.innerWidth;
        const fitsBelow = y + 12 + tooltip.offsetHeight <= window.innerHeight;
        tooltip.style.left = `${fitsRight ? x + 12 : Math.max(0, x - 12 - tooltip.offsetWidth)}px`;
        tooltip.style.top = `${fitsBelow ? y + 12 : Math.max(0, y - 12 - tooltip.offsetHeight)}px`;
        tooltip.style.opacity = '1';
      })
      .on('mouseleave', () => {
        if (tooltipRef.current) tooltipRef.current.style.opacity = '0';
      });

    const valueLabels = layer.selectAll('text')
      .data(d => d)
      .enter()
      .append('text')
      .attr('y', d => (yScale(d.data.name) as number) + (yScale.bandwidth() / 2) - (barHeight / 2) - 4) 
      .attr('x', d => rowScales[d.data.name](d[0]))
      .style('fill', function () {
        const parentData = d3.select(this.parentNode as d3.BaseType).datum() as { key: string; };
        return getTechColor(parentData.key).label;
      })
      .attr('text-anchor', 'start')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text(d => {
        const val = d[1] - d[0];
        const rowMax = rowScales[d.data.name].domain()[1];
        return val > (rowMax * 0.02) ? formatValue(val) : '';
      });

    // Rótulos sem sobreposição: em cada linha, o valor que encostaria no anterior é omitido
    // (o valor completo continua no tooltip do segmento)
    const labelsByRow = new Map<string, SVGTextElement[]>();
    valueLabels.each(function (d) {
      if (!this.textContent) return;
      const row = String(d.data.name);
      labelsByRow.set(row, [...(labelsByRow.get(row) ?? []), this]);
    });
    labelsByRow.forEach((labels) => {
      let lastRight = -Infinity;
      labels
        .sort((a, b) => a.getBBox().x - b.getBBox().x)
        .forEach((label) => {
          const box = label.getBBox();
          if (box.x < lastRight + 4) {
            label.textContent = '';
          } else {
            lastRight = box.x + box.width;
          }
        });
    });

  }, [data, dimensions, benchmarkMax, barHeight, marginLeft, marginRight, language, t]);

  return (
    <div ref={wrapperRef} style={{ width: '100%', margin: '0 auto' }}>
      <svg ref={svgRef} style={{ display: 'block' }}></svg>
      {createPortal(
        <div
          ref={tooltipRef}
          className="pointer-events-none fixed z-[200] flex flex-col gap-0.5 rounded-md bg-white px-2 py-1.5 text-xs shadow-md ring ring-primary whitespace-nowrap opacity-0 transition-opacity"
        />,
        document.body,
      )}
    </div>
  );
};

export default EmissionsChart;