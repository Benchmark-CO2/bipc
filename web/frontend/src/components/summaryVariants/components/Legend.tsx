import { useSummary } from '@/context/summaryContext';
import { cn } from '@/lib/utils';

const Legend = () => {
  const { isExpanded } = useSummary();
  return (
    <section className={cn('w-full flex justify-between', {
      'w-2/3 my-6': isExpanded,
    })}>
      <div className='w-full'>
        <div className='grid grid-cols-4 w-full items-end max-sm:grid-cols-1 max-2xl:grid-cols-2 3xl:grid-cols-4 max-sm:gap-2 max-sm:my-4'>
          <div className='w-full flex flex-col justify-center'>
            <h2 className='text-base font-bold'>Legenda:</h2>
            <div className='w-full flex items-center'>
              <div className='w-3 h-3 border-1 border-white bg-[#6C9EE0] rounded-full'></div>
              <span className='ml-2 italic text-xs'>Melhor fornecedor</span>
            </div>
          </div>

          <div className='w-full flex items-center'>
            <div className='w-3 h-3 border-1 border-white bg-[#E0756C] rounded-full'></div>
            <span className='ml-2 italic text-xs'>Pior Fornecedor</span>
          </div>
          <div className='w-full flex items-center'>
            <div className='w-3 h-3 bg-[#F2CC5A] rounded-full'></div>
            <span className='ml-2 italic'>Quantidade de CO₂</span>
          </div>
          <div className='w-full flex flex-col justify-center self-center'>
            <span className=' text-xs'>Intervalo em destaque:</span>
            <div className='flex items-center'>
              <div className='w-4 h-4 border-2 border-white rounded-full bg-blue-500'></div>
              <div className='w-full h-2 bg-linear-to-r from-green-600 to-yellow-400'>
              </div>
              <div className='w-4 h-4 border-2 border-white rounded-full bg-amber-700'></div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Legend;