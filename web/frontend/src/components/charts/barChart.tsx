import * as d3 from 'd3';
import { useEffect, useRef } from 'react';

const EmissionsChart = ({ data }) => {
  const svgRef = useRef(null);

  useEffect(() => {
    if (!data || data.length === 0) return;

    // 1. Configuração inicial e dimensões
    const width = 800;
    const height = 350;
    const margin = { top: 60, right: 20, bottom: 80, left: 160 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Limpa renderizações anteriores

    svg
      .attr('viewBox', `0 0 ${width} ${height}`)
      .style('background-color', '#f4f5f7')
      .style('font-family', 'sans-serif');

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // 2. Título do gráfico
    svg.append('text')
      .attr('x', 20)
      .attr('y', 40)
      .attr('font-size', '24px')
      .attr('font-weight', 'bold')
      .attr('fill', '#1a1f36')
      .text('Total de Emissões por tecnologia (kg CO₂)');

    // 3. Extração Dinâmica de Chaves e Dados Seguros
    // Pega todas as chaves possíveis de todos os objetos, excluindo 'name'
    const keys = Array.from(
      new Set(data.flatMap(Object.keys))
    ).filter(k => k !== 'name');

    // Garante que todo objeto tenha todas as chaves (mesmo que com valor 0) para o d3.stack não falhar
    const safeData = data.map(d => {
      const row = { ...d };
      keys.forEach(k => {
        if (row[k] === undefined || isNaN(row[k])) row[k] = 0;
      });
      return row;
    });

    const stack = d3.stack().keys(keys);
    const series = stack(safeData);

    // 4. Escalas
    // Eixo Y (Nomes dos projetos/unidades)
    const yScale = d3.scaleBand()
      .domain(safeData.map(d => d.name))
      .range([0, innerHeight])
      .padding(0.4);

    // Eixo X (Valores dinâmicos) - encontra o projeto com a maior soma
    const maxTotal = d3.max(safeData, d => 
      keys.reduce((sum, key) => sum + (d[key] || 0), 0)
    ) || 100;

    const xScale = d3.scaleLinear()
      .domain([0, maxTotal]) // Agora vai até o valor máximo real, e não mais 100
      .range([0, innerWidth]);

    // Paleta de cores estendida caso venham muitas categorias
    const colorPalette = ['#1F818C', '#F08B46', '#9C72DF', '#6C9EE0', '#E0756C', '#45b54a', '#E2D36C'];
    const colorScale = d3.scaleOrdinal()
      .domain(keys)
      .range(colorPalette);

    // 5. Eixos e Linhas de Grade
    const yAxis = d3.axisLeft(yScale).tickSize(0).tickPadding(10);
    const yAxisGroup = g.append('g').call(yAxis);
    yAxisGroup.select('.domain').remove();
    
    // Encurta nomes muito grandes no eixo Y
    yAxisGroup.selectAll('.tick text')
      .attr('font-size', '14px')
      .attr('fill', '#1a1f36')
      .attr('font-weight', 'bold')
      .text(d => d.length > 18 ? d.substring(0, 15) + '...' : d);

    // Eixo X Base invisível
    const xAxisGroup = g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale).tickSize(5).tickValues([]));
    xAxisGroup.select('.domain').attr('stroke', '#ccc');

    // 6. Linhas de Limite (Thresholds A, B, C, D) adaptados ao Eixo X
    const thresholds = [
      { val: maxTotal * 0.25, color: '#45b54a' }, // 25% do máximo
      { val: maxTotal * 0.50, color: '#93c83e' }, // 50% do máximo
      { val: maxTotal * 0.75, color: '#f0db3f' }, // 75% do máximo
      { val: maxTotal, color: '#f0a232' }         // 100% do máximo
    ];

    thresholds.forEach(t => {
      g.append('line')
        .attr('x1', xScale(t.val))
        .attr('x2', xScale(t.val))
        .attr('y1', -10)
        .attr('y2', innerHeight + 10)
        .attr('stroke', t.color)
        .attr('stroke-width', 2);
    });

    // 7. Barras Empilhadas
    const layer = g.selectAll('.layer')
      .data(series)
      .enter()
      .append('g')
      .attr('fill', d => colorScale(d.key));

    layer.selectAll('rect')
      .data(d => d)
      .enter()
      .append('rect')
      .attr('y', d => yScale(d.data.name))
      .attr('x', d => xScale(d[0]))
      .attr('width', d => Math.max(0, xScale(d[1]) - xScale(d[0])))
      .attr('height', yScale.bandwidth())
      .attr('stroke', '#f4f5f7') 
      .attr('stroke-width', 2);

    // Textos de Valores dentro das barras
    layer.selectAll('text')
      .data(d => d)
      .enter()
      .append('text')
      .attr('y', d => yScale(d.data.name) + yScale.bandwidth() / 2)
      .attr('x', d => xScale(d[0]) + (xScale(d[1]) - xScale(d[0])) / 2)
      .attr('fill', '#ffffff')
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'central')
      .attr('font-size', '12px')
      .attr('font-weight', 'bold')
      .text(d => {
        const val = d[1] - d[0];
        // Mostra apenas se o valor for grande o suficiente para caber na barra
        return val > (maxTotal * 0.05) ? `${val.toFixed(1)}` : ''; 
      });

    // 8. Indicadores (A, B, C, D) na parte inferior (adaptados)
    const gradeZones = [
      { mid: maxTotal * 0.125, label: 'A', bg: '#C6EBC3', txt: '#ffffff' },
      { mid: maxTotal * 0.375, label: 'B', bg: '#A4D338', txt: '#ffffff' },
      { mid: maxTotal * 0.625, label: 'C', bg: '#FDF1B8', txt: '#ffffff' },
      { mid: maxTotal * 0.875, label: 'D', bg: '#FBE4C6', txt: '#ffffff' },
    ];

    const zonesG = g.append('g').attr('transform', `translate(0, ${innerHeight + 30})`);

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
        .attr('font-size', '14px')
        .attr('font-weight', 'bold')
        .text(zone.label);
    });

    // 9. Legenda Dinâmica
    const legendG = svg.append('g')
      .attr('transform', `translate(20, ${height - 30})`);

    let currentX = 0; // Para lidar com palavras de tamanhos variados
    keys.forEach((key, i) => {
      const itemG = legendG.append('g')
        .attr('transform', `translate(${currentX}, 0)`);

      itemG.append('rect')
        .attr('width', 16)
        .attr('height', 16)
        .attr('rx', 2)
        .attr('fill', colorScale(key));

      itemG.append('text')
        .attr('x', 24)
        .attr('y', 13)
        .attr('font-size', '13px')
        .attr('fill', '#1a1f36')
        .text(key);
      
      // Estima o espaço necessário para o próximo item baseado no tamanho do texto
      currentX += 30 + (key.length * 7.5); 
    });

  }, [data]);

  return (
    <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
      <svg ref={svgRef} style={{ width: '100%', height: 'auto', display: 'block' }}></svg>
    </div>
  );
};

export default EmissionsChart;