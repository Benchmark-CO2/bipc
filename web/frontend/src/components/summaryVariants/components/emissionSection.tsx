import EmissionsChart from '@/components/charts/barChart';
import { EmissionLegend } from './emissionLegend';

// Importe seu componente de checkbox aqui
const projectEmissionsData = [
  {
    id: "total",
    title: "Projeto completo",
    defaultChecked: true, // Para o checkbox
    chartData: [
      { 
        name: "CO₂ (kg)", 
        "Parede de concreto": 62, 
        "Fundação radier": 24, 
        "Cobertura": 14 
      },
      { 
        name: "Energia (MJ)", 
        "Parede de concreto": 58, 
        "Fundação radier": 27, 
        "Cobertura": 15 
      },
      { 
        name: "Material (m²)", 
        "Parede de concreto": 66, 
        "Fundação radier": 21, 
        "Cobertura": 13 
      }
    ]
  },
  {
    id: "torre-1",
    title: "Torre 1",
    defaultChecked: false,
    chartData: [
      { 
        name: "CO₂ (kg)", 
        "Parede de concreto": 62, 
        "Fundação radier": 24, 
        "Cobertura": 14 
      },
      { 
        name: "Energia (MJ)", 
        "Parede de concreto": 58, 
        "Fundação radier": 27, 
        "Cobertura": 15 
      },
      { 
        name: "Material (m²)", 
        "Parede de concreto": 66, 
        "Fundação radier": 21, 
        "Cobertura": 13 
      }
    ]
  },
  {
    id: "torre-2",
    title: "Torre 2",
    defaultChecked: false,
    chartData: [
      { 
        name: "CO₂ (kg)", 
        "Parede de concreto": 62, 
        "Fundação radier": 24, 
        "Cobertura": 14 
      },
      { 
        name: "Energia (MJ)", 
        "Parede de concreto": 58, 
        "Fundação radier": 27, 
        "Cobertura": 15 
      },
      { 
        name: "Material (m²)", 
        "Parede de concreto": 66, 
        "Fundação radier": 21, 
        "Cobertura": 13 
      }
    ]
  }
];
export const EmissionsSection = ({ data, selected, onChange }: { data: typeof projectEmissionsData, selected?: string[], onChange?: (id: string, checked: boolean) => void }) => {
  return (
    <div className="flex flex-col gap-6 w-full">
      
      {/* 1. Legenda Global no Topo */}
      <div className="mb-4">
        <h2 className="text-xl font-bold mb-2">Total de Emissões por tecnologia</h2>
        <EmissionLegend keys={data[0]?.chartData?.map(item => item.name) || []} />
      </div>

      {/* 2. Lista de Gráficos (Total + Edificações) */}
      {data.map((section) => (
        <div key={section.id} className="flex flex-col gap-1 border-b pb-0 last:border-b-0">
          
          {/* Cabeçalho da Seção com Checkbox */}
          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              checked={selected?.includes(section.id) ?? section.defaultChecked} 
              className="w-4 h-4 text-green-600 rounded focus:ring-green-500"
              onChange={(e) => onChange?.(section.id, e.target.checked)}
            />
            <span className="font-bold text-gray-800">{section.title}</span>
          </div>

          {/* Gráfico D3 */}
          <div className="w-full">
            <EmissionsChart data={section.chartData} />
          </div>

        </div>
      ))}
      
    </div>
  );
};