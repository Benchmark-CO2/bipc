import Instagram from '@/assets/instagram.svg';
import Linkedin from '@/assets/linkedin.svg';
import FullLogo from '@/assets/logo_full.svg';
import Youtube from '@/assets/youtube.svg';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { createFileRoute } from '@tanstack/react-router';
export const Route = createFileRoute('/(public)/contact')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div className='flex w-full h-full'>
    <div className='w-full flex justify-center items-center flex-col'>
      <img src={FullLogo} alt="Logo" className='w-3/5' />
      <div className='flex gap-6 w-3/5 ml-6 mt-4'>
        <a href="">
          <img src={Linkedin} alt="Linkedin"  className='cursor-pointer select-none' draggable={false}/>
        </a>
        <a href="">
          <img src={Youtube} alt="Youtube"  className='cursor-pointer select-none' draggable={false}/>
        </a>
        <a href="">
          <img src={Instagram} alt="Instagram" className='cursor-pointer select-none' draggable={false} />
        </a>
      </div>
    </div>
    <div className='w-full flex flex-col justify-center items-center'>
      <h1 className='text-4xl text-primary font-bold block w-1/3 text-left mb-10'>Fale conosco</h1>
      <div className='w-1/3'>
        <Input placeholder='Nome' className='mb-4 w-full' type='text' />
        <Input placeholder='E-mail' className='mb-4 w-full' type='email' />
        <Input placeholder='Assunto' className='mb-4 w-full' type='text' />
        <Textarea placeholder='Mensagem' className='mb-4 w-full' />
        <Button variant={'default'} className='w-full'>Enviar</Button>
      </div>
    </div>
  </div>
}
