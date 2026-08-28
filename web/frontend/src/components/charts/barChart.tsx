import * as d3 from 'd3';
import { useEffect, useRef, useState } from 'react';
import { EmissionLegend } from '../summaryVariants/components/emissionLegend';

const EmissionsChart = ({ data, benchmarkMax }: { data: any[], benchmarkMax: Record<string, number> | number; }) => {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 150 });

  useEffect(() => {
    if (!wrapperRef.current) return;

    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const { width } = entries[0].contentRect;

      const calculatedHeight = Math.max(150, (data?.length || 0) * 40 + 10);
      setDimensions({ width, height: calculatedHeight });
    });

    resizeObserver.observe(wrapperRef.current);

    return () => resizeObserver.disconnect();
  }, [data]);

  useEffect(() => {
    if (!data || data.length === 0 || dimensions.width === 0) return;

    const { width, height } = dimensions;

    // 1. Aumentamos a margem esquerda para dar espaço aos nomes maiores
    const margin = { top: 20, right: 20, bottom: 40, left: width < 600 ? 130 : 220 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('width', width)
      .attr('height', height)
      .style('background-color', '#f4f5f7')
      .style('font-family', 'sans-serif');

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const keys = Array.from(
      new Set(data.flatMap(Object.keys))
    ).filter(k => k !== 'name' && k !== 'id');

    const safeData = data.map(d => {
      const row = { ...d };
      keys.forEach(k => {
        if (row[k] === undefined || isNaN(row[k])) {
          row[k] = 0
        };
      });
      return row;
    });

    const stack = d3.stack().keys(keys);
    const series = stack(safeData as any);

    const yScale = d3.scaleBand()
      .domain(safeData.map(d => d.name))
      .range([0, innerHeight])
      .padding(0.2);

    const rowScales: Record<string, d3.ScaleLinear<number, number>> = {};

    safeData.forEach(d => {
      const rowLocalSum = keys.reduce((sum, key) => sum + (d[key] || 0), 0);

      let rowAnchor = 0;
      const cleanName = String(d.name).trim(); // Garante que espaços acidentais não quebrem o match

      if (typeof benchmarkMax === 'number') {
        rowAnchor = benchmarkMax;
      } else if (benchmarkMax && typeof benchmarkMax === 'object') {
        console.log(benchmarkMax, cleanName, d);
        // Tenta buscar pela chave sem espaços extras
        rowAnchor = Number(benchmarkMax[cleanName] ?? benchmarkMax[d.id]) || 0;
      }

      // ⚠️ CORREÇÃO PRINCIPAL AQUI:
      // Removemos o Math.max! O limite da escala deve ser OBRIGATORIAMENTE o benchmark.
      // Se não houver benchmark, usamos a soma local como fallback.
      const rowMax = rowAnchor > 0 ? rowAnchor : (rowLocalSum || 100);

      rowScales[d.name] = d3.scaleLinear()
        .domain([0, rowMax])
        .range([0, innerWidth]);
    });

    const colorPalette = ['#297B76', '#DF7A32', '#9775C1', '#6C9EE0', '#E0756C', '#45b54a', '#E2D36C'];
    const colorScale = d3.scaleOrdinal()
      .domain(keys)
      .range(colorPalette);

    const yAxis = d3.axisLeft(yScale).tickSize(0).tickPadding(10);
    const yAxisGroup = g.append('g').call(yAxis);
    yAxisGroup.select('.domain').remove();

    // 2. Aumentamos o limite do substring de 15 para 25 caracteres (ou você pode até remover a limitação)
    yAxisGroup.selectAll('.tick text')
      .attr('font-size', '14px')
      .attr('fill', '#1a1f36')
      .attr('font-weight', 'bold')
      .text(d => (d as string).length > 25 ? (d as string).substring(0, 22) + '...' : (d as string));

    const dummyXScale = d3.scaleLinear().domain([0, 100]).range([0, innerWidth]);
    const xAxisGroup = g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(dummyXScale).tickSize(0).tickValues([]));
    xAxisGroup.select('.domain').remove();

    const thresholds = [
      { pct: 0.25, color: '#57C95B' },
      { pct: 0.50, color: '#A1DB2A' },
      { pct: 0.75, color: '#F1E919' },
      { pct: 1.00, color: '#FAA82C' }
    ];

    thresholds.forEach(t => {
      g.append('line')
        .attr('x1', innerWidth * t.pct)
        .attr('x2', innerWidth * t.pct)
        .attr('y1', -10)
        .attr('y2', innerHeight + 10)
        .attr('stroke', t.color)
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,4');
    });

    const layer = g.selectAll('.layer')
      .data(series)
      .enter()
      .append('g')
      .attr('fill', d => colorScale(d.key) as string);

    const barHeight = 10;

    layer.selectAll('rect')
      .data(d => d)
      .enter()
      .append('rect')
      .attr('y', d => (yScale(d.data.name) as number) + (yScale.bandwidth() / 2) - (barHeight / 2))
      .attr('x', d => rowScales[d.data.name](d[0]))
      .attr('width', d => Math.max(0, rowScales[d.data.name](d[1]) - rowScales[d.data.name](d[0])))
      .attr('height', barHeight)
      .attr('stroke', '#f4f5f7')
      .attr('stroke-width', 1);

    layer.selectAll('text')
      .data(d => d)
      .enter()
      .append('text')
      .attr('y', d => (yScale(d.data.name) as number) + (yScale.bandwidth() / 2) - (barHeight / 2) - 6)
      .attr('x', d => rowScales[d.data.name](d[0]) + (rowScales[d.data.name](d[1]) - rowScales[d.data.name](d[0])) / 2)
      .attr('fill', function () {
        const parentData = d3.select(this.parentNode as d3.BaseType).datum() as { key: string; };
        return colorScale(parentData.key) as string;
      })
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text(d => {
        const val = d[1] - d[0];
        const rowMax = rowScales[d.data.name].domain()[1];
        return val > (rowMax * 0.05) ? `${val.toFixed(2)}` : '';
      });

    const gradeZones = [
      { pct: 0.25, label: 'A', bg: '#57C95B', txt: '#ffffff' },
      { pct: 0.50, label: 'B', bg: '#A1DB2A', txt: '#ffffff' },
      { pct: 0.75, label: 'C', bg: '#F1E919', txt: '#ffffff' },
      { pct: 1.00, label: 'D', bg: '#FAA82C', txt: '#ffffff' },
    ];

    const zonesG = g.append('g').attr('transform', `translate(0, ${innerHeight + 25})`);

    gradeZones.forEach(zone => {
      zonesG.append('circle')
        .attr('cx', innerWidth * zone.pct)
        .attr('cy', 0)
        .attr('r', 12)
        .attr('fill', zone.bg);

      zonesG.append('text')
        .attr('x', innerWidth * zone.pct)
        .attr('y', 0)
        .attr('fill', zone.txt)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .text(zone.label);
    });

  }, [data, dimensions, benchmarkMax]);

  return (
    <div ref={wrapperRef} style={{ width: '100%', margin: '0 auto' }}>
      <EmissionLegend keys={Array.from(
        new Set((data || []).flatMap(Object.keys))
      ).filter(k => k !== 'name' && k !== 'id') as string[]} />
      <svg ref={svgRef} style={{ display: 'block' }}></svg>
    </div>
  );
};

export default EmissionsChart;