import { getTokenKey } from '@/actions/auth/token';
import { Copy, RefreshCcw } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from './ui/button';

export const GenerateApiKey = () => {
  const [visibleApiKey, setVisibleApiKey] = useState(false);
  const [apiKey, setApiKey] = useState("");

  const generateApiKey = async () => {
    setVisibleApiKey(true);
    const response = await getTokenKey() 
    
    if (response?.data?.api_key)
      setApiKey(response.data.api_key);
  };

  const handleCopy = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey);
    }
    toast.info('Chave de API copiada para a área de transferência!');
  };

  return (
    <div>
      <Button variant="link" className="p-0 h-auto" onClick={generateApiKey}>Gerar nova chave de API <RefreshCcw  /></Button>
      <div className="text-sm text-muted-foreground flex items-center gap-2 mt-2">
        
        {apiKey && <div className='flex flex-col gap-1'><span className='font-bold mt-2'>A chave de API é de visualização única, copie-a agora pois não será possível vê-la novamente.:</span> <span className="font-bold flex items-center gap-2">{visibleApiKey ? apiKey : "*****************"}<Copy className='cursor-pointer' size={16} onClick={handleCopy} /></span></div>}
      </div>
    </div>
  );
};