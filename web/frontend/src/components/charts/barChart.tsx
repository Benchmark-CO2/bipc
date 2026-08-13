import * as d3 from 'd3';
import { useEffect, useRef, useState } from 'react';
import { EmissionLegend } from '../summaryVariants/components/emissionLegend';

const EmissionsChart = ({ data }: { data: any[] }) => {
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
    
    const margin = { top: 20, right: 20, bottom: 40, left: width < 600 ? 100 : 160 }; 
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

    // svg.append('text')
    //   .attr('x', 20)
    //   .attr('y', 40)
    //   .attr('font-size', width < 600 ? '16px' : '24px')
    //   .attr('font-weight', 'bold')
    //   .attr('fill', '#1a1f36')
    //   .text('Total de Emissões por tecnologia');

    const keys = Array.from(
      new Set(data.flatMap(Object.keys))
    ).filter(k => k !== 'name');

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
      .padding(0.2); // Espaçamento entre os blocos (nomes)

    const maxTotal = d3.max(safeData, d => 
      keys.reduce((sum, key) => sum + (d[key] || 0), 0)
    ) || 100;

    const xScale = d3.scaleLinear()
      .domain([0, maxTotal])
      .range([0, innerWidth]);

    const colorPalette = ['#297B76', '#DF7A32', '#9775C1', '#6C9EE0', '#E0756C', '#45b54a', '#E2D36C'];
    const colorScale = d3.scaleOrdinal()
      .domain(keys)
      .range(colorPalette);

    const yAxis = d3.axisLeft(yScale).tickSize(0).tickPadding(10);
    const yAxisGroup = g.append('g').call(yAxis);
    yAxisGroup.select('.domain').remove();
    
    yAxisGroup.selectAll('.tick text')
      .attr('font-size', '14px')
      .attr('fill', '#1a1f36')
      .attr('font-weight', 'bold')
      .text(d => (d as string).length > 15 ? (d as string).substring(0, 12) + '...' : (d as string));

    const xAxisGroup = g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickSize(0).tickValues([]));
    xAxisGroup.select('.domain').remove(); // Remove a linha preta sólida do eixo X

    // ── CONFIGURAÇÃO DE LINHAS DE LIMITE (PONTILHADAS) ──
    const thresholds = [
      { val: maxTotal * 0.25, color: '#57C95B' }, // Verde (A)
      { val: maxTotal * 0.50, color: '#A1DB2A' }, // Verde Limão (B)
      { val: maxTotal * 0.75, color: '#F1E919' }, // Amarelo (C)
      { val: maxTotal, color: '#FAA82C' }         // Laranja (D)
    ];

    thresholds.forEach(t => {
      g.append('line')
        .attr('x1', xScale(t.val))
        .attr('x2', xScale(t.val))
        .attr('y1', -10)
        .attr('y2', innerHeight + 10)
        .attr('stroke', t.color)
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,4'); // Torna a linha pontilhada
    });

    const layer = g.selectAll('.layer')
      .data(series)
      .enter()
      .append('g')
      .attr('fill', d => colorScale(d.key) as string);

    // ── ESPESSURA FIXA DA BARRA ──
    const barHeight = 10; // Defina a espessura da barra aqui (em pixels)

    layer.selectAll('rect')
      .data(d => d)
      .enter()
      .append('rect')
      // Centraliza a barra fina verticalmente no espaço de banda reservado para ela
      .attr('y', d => (yScale(d.data.name) as number) + (yScale.bandwidth() / 2) - (barHeight / 2))
      .attr('x', d => xScale(d[0]))
      .attr('width', d => Math.max(0, xScale(d[1]) - xScale(d[0])))
      .attr('height', barHeight)
      .attr('stroke', '#f4f5f7') 
      .attr('stroke-width', 1);

    // ── TEXTO ACIMA DA BARRA ──
    layer.selectAll('text')
      .data(d => d)
      .enter()
      .append('text')
      // Posiciona o Y ligeiramente acima do limite superior do retângulo
      .attr('y', d => (yScale(d.data.name) as number) + (yScale.bandwidth() / 2) - (barHeight / 2) - 6)
      .attr('x', d => xScale(d[0]) + (xScale(d[1]) - xScale(d[0])) / 2)
      // A cor do texto pode herdar a cor do bloco, como na sua referência
      .attr('fill', function() {
        const parentData = d3.select(this.parentNode as d3.BaseType).datum() as { key: string };
        return colorScale(parentData.key) as string;
      })
      .attr('text-anchor', 'middle')
      .attr('font-size', '12px') 
      .attr('font-weight', 'bold')
      .text(d => {
        const val = d[1] - d[0];
        // Mostra o valor/porcentagem apenas se couber visualmente
        return val > (maxTotal * 0.05) ? `${val.toFixed(0)}` : ''; 
      });

    // ── INDICADORES NA BASE (A, B, C, D) ──
    const gradeZones = [
      { mid: maxTotal * 0.25, label: 'A', bg: '#57C95B', txt: '#ffffff' },
      { mid: maxTotal * 0.50, label: 'B', bg: '#A1DB2A', txt: '#ffffff' },
      { mid: maxTotal * 0.75, label: 'C', bg: '#F1E919', txt: '#ffffff' },
      { mid: maxTotal * 1.00, label: 'D', bg: '#FAA82C', txt: '#ffffff' },
    ];

    const zonesG = g.append('g').attr('transform', `translate(0, ${innerHeight + 25})`);

    gradeZones.forEach(zone => {
      zonesG.append('circle')
        .attr('cx', xScale(zone.mid))
        .attr('cy', 0)
        .attr('r', 12)
        .attr('fill', zone.bg);

      zonesG.append('text')
        .attr('x', xScale(zone.mid))
        .attr('y', 0)
        .attr('fill', zone.txt)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'central')
        .attr('font-size', '12px')
        .attr('font-weight', 'bold')
        .text(zone.label);
    });

  }, [data, dimensions]); 

  return (
    <div ref={wrapperRef} style={{ width: '100%', margin: '0 auto' }}>
      <EmissionLegend keys={Array.from(
        new Set((data || []).flatMap(Object.keys))
      ).filter(k => k !== 'name') as string[]}  />
      <svg ref={svgRef} style={{ display: 'block' }}></svg>
    </div>
  );
};

export default EmissionsChart;