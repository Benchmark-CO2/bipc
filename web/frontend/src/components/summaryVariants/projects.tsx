import { useSummary } from '@/context/summaryContext';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';
import { IProject } from '@/types/projects';
import { useState } from 'react';
import CustomChart from '../charts/customChart';
import { DataPoint } from '../charts/mock';
import { Button } from '../ui/button';

type ProjectsSummaryProps = {
  projects: (IProject & {
    co: number
    mj: number
    density: number
  })[]
}
const calculateProgress = (project: ProjectsSummaryProps['projects'][number]) => {
  const total = project.co + project.mj + project.density;
  return {
    co: (project.co / total) * 100,
    mj: (project.mj / total) * 100,
    density: (project.density / total) * 100,
  };
};
const ProjectsSummary = ({projects}: ProjectsSummaryProps) => {
  const [type, setType] = useState<'co' | 'mj' | 'density'>('co')
  const coSum = projects.reduce((acc, project) => acc + project.co, 0);
  const mjSum = projects.reduce((acc, project) => acc + project.mj, 0);
  const densitySum = projects.reduce((acc, project) => acc + project.density, 0);
  const { isExpanded } = useSummary()
  const isMobile = useIsMobile()
  const screenWidth = window.innerWidth;

  const width = () => {
    if (isMobile) return screenWidth * 0.7
    if (isExpanded) return screenWidth/3
    return 400
  }

  const height = () => {
    if (isMobile && !isExpanded) return 140
    if (isMobile && isExpanded) return 320
    if (isExpanded) return 500
    return 250
  }

  if (!projects.length) return (
    <div className='w-full flex flex-col justify-center items-center'>
      <p className='text-2xl'>Nenhum projeto selecionado.</p>
    </div>
  );

  return (
    <div className='w-full flex justify-between gap-10 max-md:flex-col'>
      <div className='flex flex-col items-start w-full'>

        <div className='w-full flex gap-2 mb-10'>
          <Button className={cn({ 'text-active': type !== 'co' })} variant={type === 'co' ? 'bipc':'ghost'} onClick={() => setType('co')}>CO2</Button>
          <Button className={cn({ 'text-active': type !== 'mj' })} variant={type === 'mj' ? 'bipc':'ghost'} onClick={() => setType('mj')}>MJ</Button>
          <Button className={cn({ 'text-active': type !== 'density' })} variant={type === 'density' ? 'bipc':'ghost'} onClick={() => setType('density')}>Density</Button>
        </div>

        <ul className='flex flex-col gap-2 text-xl w-full text-black'>
          {projects.map((project) => {
            const progress = calculateProgress(project);
            return (
              <li key={project.id} className="grid grid-cols-5 items-center gap-3 w-full">
                <h3 className="whitespace-nowrap col-span-1">{project.name}</h3>
                <div className="flex w-full h-2 col-span-4">
                  <div
                    style={{
                      width: `${progress.co}%`,
                    }}
                    className={`bg-pink-500  h-2 rounded-l-md`}
                  ></div>
                  <div
                    style={{
                      width: `${progress.mj}%`,
                    }}
                    className={`bg-yellow-500  h-2`}
                  ></div>
                  <div
                    style={{
                      width: `${progress.density}%`,
                    }}
                    className={`bg-green-500  h-2 rounded-r-md`}
                  ></div>
                </div>
              </li>
            );
          })}
        </ul>
      
      </div>
        <CustomChart 
          maxWidth={width()}
          maxHeight={height()}
          datachart={projects.reduce((acc, project) => {
            acc['gray'] = [
              ...(acc['gray'] || []),
              { y: (project[type] / (type === 'co' ? coSum : type === 'mj' ? mjSum : densitySum)) * 10, x: project[type], fill: true, label: type + project.name, fillColor: 'hsl(340 75% 55%)' },
            ];
            return acc;
          }, {} as Record<string, DataPoint[]>)} 

        />
    </div>
  )
}

export default ProjectsSummary