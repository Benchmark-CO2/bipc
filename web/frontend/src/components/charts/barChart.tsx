import * as d3 from 'd3';
import { useEffect, useRef, useState } from 'react';

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

    const colorPalette = ['#2B84F8', '#187B8B', '#F28C48', '#EB644F', '#E2D36C', '#9F70DB'];
    const colorScale = d3.scaleOrdinal().domain(keys).range(colorPalette);

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
      .attr('fill', d => colorScale(d.key) as string);

    layer.selectAll('rect')
      .data(d => d)
      .enter()
      .append('rect')
      .attr('y', d => (yScale(d.data.name) as number) + (yScale.bandwidth() / 2) - (barHeight / 2))
      .attr('x', d => rowScales[d.data.name](d[0]))
      .attr('width', d => Math.max(0, rowScales[d.data.name](d[1]) - rowScales[d.data.name](d[0])))
      .attr('height', barHeight)
      .attr('rx', barHeight / 2)
      .attr('opacity', 0.7)

    layer.selectAll('text')
      .data(d => d)
      .enter()
      .append('text')
      .attr('y', d => (yScale(d.data.name) as number) + (yScale.bandwidth() / 2) - (barHeight / 2) - 4) 
      .attr('x', d => rowScales[d.data.name](d[0]))
      .attr('fill', function () {
        const parentData = d3.select(this.parentNode as d3.BaseType).datum() as { key: string; };
        return colorScale(parentData.key) as string;
      })
      .attr('text-anchor', 'start')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text(d => {
        const val = d[1] - d[0];
        const rowMax = rowScales[d.data.name].domain()[1];
        return val > (rowMax * 0.02) ? `${val.toFixed(2)}` : '';
      });

  }, [data, dimensions, benchmarkMax, barHeight, marginLeft, marginRight]);

  return (
    <div ref={wrapperRef} style={{ width: '100%', margin: '0 auto' }}>
      <svg ref={svgRef} style={{ display: 'block' }}></svg>
    </div>
  );
};

export default EmissionsChart;