import { barColors } from '../utils';

const Subtitle = () => {
  return (
    <div className='flex gap-4 text-sm md:text-base text-primary mt-auto items-end'>
      <div className='flex gap-2 items-center'>
        <div className="w-4 h-4 rounded-sm" style={{
          backgroundColor: barColors[0],
        }}></div>
        <span>Bloco estrutural</span>
      </div>
      <div className='flex gap-2 items-center'>
        <div className="w-4 h-4 rounded-sm" style={{
          backgroundColor: barColors[1],
        }}></div>
        <span>Bloco estrutural</span>
      </div>
      <div className='flex gap-2 items-center'>
        <div className="w-4 h-4  rounded-sm" style={{
          backgroundColor: barColors[2],
        }}></div>
        <span>Bloco estrutural</span>
      </div>
    </div>
  )
}

export default Subtitle