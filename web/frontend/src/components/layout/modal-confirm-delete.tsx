import { deleteProject } from '@/actions/projects/deleteProjects';
import { queryClient } from '@/utils/queryClient';
import { Trash } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';

const ModalConfirmDelete = ({projectUUID, componentTrigger}: {projectUUID: string, componentTrigger?: React.ReactNode}) => {
  const [open, setOpen] = useState(false);

  const onConfirm = () => {
    void deleteProject(projectUUID).then(async () => {
      
      toast.success('Projeto deletado com sucesso!')
      await queryClient.invalidateQueries({
        queryKey: ['projects'],
        refetchType: 'all'
      })
      setOpen(false)
    })
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild   data-action='delete-project'>
        {componentTrigger ?? <Trash size={20} className='delete-project z-50 absolute right-2 top-2 hover:shadow-md'/>}
      </DialogTrigger>
      <DialogContent className="text-center">
        <DialogHeader>
          <DialogTitle className="text-center">
            Deletar projeto
          </DialogTitle>
        </DialogHeader>
          <p className="text-gray-600">
            Esta ação não pode ser desfeita. Você tem certeza de que deseja continuar?
          </p>
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            Deletar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ModalConfirmDelete