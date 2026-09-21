import EmissionsChart from '@/components/charts/barChart';
import { Checkbox } from '@/components/ui/checkbox';
import React, { useEffect, useRef, useState } from 'react';

// Constantes fundamentais para o alinhamento matemático perfeito dos gráficos
const CHART_MARGIN_LEFT = 130;
const CHART_MARGIN_RIGHT = 30;
const CARD_INDENT = 12; // O quanto os cards secundários são menores nas laterais

export const EmissionsSection = ({ 
  data, 
  selected, 
  onChange, 
  benchmarkMax 
}: { 
  data: any[], 
  selected?: string[], 
  onChange?: (id: string, checked: boolean) => void; 
  benchmarkMax: Record<string, number>; 
}) => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    total: true,
    'torre-1': true
  });
  const [items, setItems] = useState(data);

  useEffect(() => {
    setItems(data);
  }, [data]);

  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragItem.current = position;
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, position: number) => {
    dragOverItem.current = position;
  };

  const handleDragEnd = () => {
    if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
      const copyListItems = [...items];
      const dragItemContent = copyListItems[dragItem.current];
      copyListItems.splice(dragItem.current, 1);
      copyListItems.splice(dragOverItem.current, 0, dragItemContent);
      setItems(copyListItems);
    }
    dragItem.current = null;
    dragOverItem.current = null;
  };

  const toggleSection = (id: string) => {
    setOpenSections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const procelIndicators = [
    { pct: 0.25, label: 'A', bg: '#57C95B' },
    { pct: 0.50, label: 'B', bg: '#A1DB2A' },
    { pct: 0.75, label: 'C', bg: '#F1E919' },
    { pct: 1.00, label: 'D', bg: '#FAA82C' },
  ];

  const totalItem = items.find(item => item.id === 'total');
  const buildingItems = items.filter(item => item.id !== 'total');

  return (
    <div className="flex flex-col w-full overflow-y-auto max-h-[80vh] p-4 pt-8 bg-[#f4f5f7]">
      
      {/* Contêiner de Layout Mestre */}
      <div className="relative w-full flex flex-col">

        {/* 1. Linhas Globais Procel */}
        <div 
          className="absolute top-8 bottom-0 pointer-events-none z-0" 
          style={{ left: CHART_MARGIN_LEFT, right: CHART_MARGIN_RIGHT }}
        >
          {procelIndicators.map((t) => (
            <div
              key={`line-${t.label}`}
              className="absolute top-0 bottom-0 border-l-[1.5px] border-dashed border-gray-600"
              style={{ left: `${t.pct * 100}%` }}
            />
          ))}
        </div>

        {/* 2. Cabeçalho das Bolinhas A, B, C, D */}
        <div 
          className="relative z-10 flex h-8 items-center mb-2"
          style={{ marginLeft: CHART_MARGIN_LEFT, marginRight: CHART_MARGIN_RIGHT }}
        >
          {procelIndicators.map((zone) => (
            <div
              key={zone.label}
              className="absolute flex flex-col items-center justify-center -translate-x-1/2"
              style={{ left: `${zone.pct * 100}%` }}
            >
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: zone.bg }}
              >
                {zone.label}
              </div>
            </div>
          ))}
        </div>

        {/* 3. Lista de Gráficos */}
        <div className="relative z-10 flex flex-col gap-2">
          
          {/* Card TOTAL */}
          {totalItem && (
            <div className="w-full">
              <div 
                className={`
                  flex flex-col shadow-sm overflow-hidden
                  border-b-[6px] border-b-[#297B76] border-gray-200
                `}
                style={{
                  background: 'linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,1) 56px, rgba(255,255,255,0.7) 56px, rgba(255,255,255,0.7) 100%)'
                }}
              >
                <div className="h-[56px] px-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      value={totalItem.id}
                      checked={selected?.includes(totalItem.id) ?? totalItem.defaultChecked}
                      onCheckedChange={(checked) => onChange?.(totalItem.id, !!checked)}
                    />
                    <span className="font-bold text-[16px] text-gray-900">{totalItem.title}</span>
                  </div>
                </div>
                
                <div className="w-full pb-5">
                  <EmissionsChart 
                    data={totalItem.chartData} 
                    benchmarkMax={benchmarkMax} 
                    barHeight={10} 
                    marginLeft={CHART_MARGIN_LEFT}
                    marginRight={CHART_MARGIN_RIGHT}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Cards das Edificações (Secundários e Menores) */}
          {buildingItems.map((section) => {
            const isOpen = openSections[section.id] ?? false;
            const isChecked = selected?.includes(section.id) ?? section.defaultChecked;
            const realIndex = items.findIndex(i => i.id === section.id);

            return (
              // Wrapper do card secundário aplicando o indent (24px de margem nas laterais)
              <div key={section.id} className="w-full" style={{ paddingLeft: CARD_INDENT, paddingRight: CARD_INDENT }}>
                
                <div 
                  draggable
                  onDragStart={(e) => handleDragStart(e, realIndex)}
                  onDragEnter={(e) => handleDragEnter(e, realIndex)}
                  onDragEnd={handleDragEnd}
                  onDragOver={(e) => e.preventDefault()}
                  className="flex flex-col shadow-sm border-l-[6px] border-l-secondary"
                  style={{
                    background: isOpen 
                      ? 'linear-gradient(to bottom, rgba(255,255,255,1) 0%, rgba(255,255,255,1) 56px, rgba(255,255,255,0.7) 56px, rgba(255,255,255,0.7) 100%)'
                      : '#ffffff'
                  }}
                >
                  <div 
                    className="h-[56px] px-4 flex items-center justify-between cursor-pointer"
                    onClick={() => toggleSection(section.id)}
                  >
                    <div className="flex items-center gap-3">
                      {/* Grip Icon */}
                      <div className="text-gray-300 cursor-grab hover:text-gray-500 flex items-center h-full" onClick={(e) => e.stopPropagation()}>
                        <svg width="18" height="18" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M5.5 3C5.5 3.828 4.828 4.5 4 4.5C3.172 4.5 2.5 3.828 2.5 3C2.5 2.172 3.172 1.5 4 1.5C4.828 1.5 5.5 2.172 5.5 3ZM12.5 3C12.5 3.828 11.828 4.5 11 4.5C10.172 4.5 9.5 3.828 9.5 3C9.5 2.172 10.172 1.5 11 1.5C11.828 1.5 12.5 2.172 12.5 3ZM5.5 7.5C5.5 8.328 4.828 9 4 9C3.172 9 2.5 8.328 2.5 7.5C2.5 6.672 3.172 6 4 6C4.828 6 5.5 6.672 5.5 7.5ZM12.5 7.5C12.5 8.328 11.828 9 11 9C10.172 9 9.5 8.328 9.5 7.5C9.5 6.672 10.172 6 11 6C11.828 6 12.5 6.672 12.5 7.5ZM5.5 12C5.5 12.828 4.828 13.5 4 13.5C3.172 13.5 2.5 12.828 2.5 12C2.5 11.172 3.172 10.5 4 10.5C4.828 10.5 5.5 11.172 5.5 12ZM12.5 12C12.5 12.828 11.828 13.5 11 13.5C10.172 13.5 9.5 12.828 9.5 12C9.5 11.172 10.172 10.5 11 10.5C11.828 10.5 12.5 11.172 12.5 12Z" fill="currentColor"/>
                        </svg>
                      </div>
                      
                      <div onClick={(e) => e.stopPropagation()}>
                        <Checkbox value={section.id} checked={isChecked} onCheckedChange={(checked) => onChange?.(section.id, !!checked)} />
                      </div>
                      <span className="font-bold text-[15px] text-gray-900">{section.title}</span>
                    </div>

                    {/* Chevron */}
                    <div className="text-gray-400">
                      {isOpen ? (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg>
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                      )}
                    </div>
                  </div>

                  {/* Como o card está "espremido" 24px de cada lado pelo parent, 
                      subtraímos esses mesmos 24px das margens do D3 para alinhar as barras! */}
                  {isOpen && (
                    <div className="w-full pb-5 bg-transparent">
                      <EmissionsChart 
                        data={section.chartData} 
                        benchmarkMax={benchmarkMax} 
                        barHeight={4} 
                        marginLeft={CHART_MARGIN_LEFT - CARD_INDENT} 
                        marginRight={CHART_MARGIN_RIGHT - CARD_INDENT}
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};