
const Legend = () => {
  return (
    <section className='w-full mt-auto flex justify-between'>
      <div className='w-full'>
        <h2 className='text-base font-bold'>Legenda:</h2>
        <div className='flex w-full '>
          <div className='w-full flex items-center'>
            <div className='w-3 h-3 border-1 border-white bg-[#6C9EE0] rounded-full'></div>
            <span className='ml-2 italic'>Melhor fornecedor</span>
          </div>
          <div className='w-full flex items-center'>
            <div className='w-3 h-3 border-1 border-white bg-[#E0756C] rounded-full'></div>
            <span className='ml-2 italic'>Pior Fornecedor 2</span>
          </div>
          <div className='w-full flex items-center'>
            <div className='w-3 h-3 bg-[#F2CC5A] rounded-full'></div>
            <span className='ml-2 italic'>Quantidade de CO₂</span>
          </div>
        </div>
      </div>
      <div className='w-1/4 flex flex-col justify-center'>
        <span className='font-bold'>Intervalo em destaque:</span>
        <div className='flex items-center'>
          <div className='w-4 h-4 border-2 border-white rounded-full bg-blue-500'></div>
          <div className='w-full h-2 bg-linear-to-r from-green-600 to-yellow-400'>
          </div>
          <div className='w-4 h-4 border-2 border-white rounded-full bg-amber-700'></div>
        </div>
      </div>
    </section>
  );
};

export default Legend;