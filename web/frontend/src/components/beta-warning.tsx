import { FlaskConical } from 'lucide-react';

export const BetaWarning = () => {
  return (
    <div className="bg-primary text-white p-2 px-3 rounded-lg mx-auto">
      <div className='flex items-center gap-2 my-1'>
        <FlaskConical size={16} className='self-start'/>
        <span>Estamos em beta</span>
      </div>
      <p className="text-sm ">A plataforma segue em desenvolvimento e recebe melhorias constantes.</p>
    </div>
  );
};