import { Trash } from 'lucide-react';
import React, { SetStateAction, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';

const ModalConfirmDeleteUnit = ({callback, componentTrigger, isOpen}: {callback: () => void, componentTrigger?: React.ReactNode, isOpen?: boolean, setIsOpen?: React.Dispatch<SetStateAction<boolean>>}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(isOpen ?? false);

  const onConfirm = () => {
    callback()
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild data-action='delete-project'>
        {componentTrigger ?? <Trash size={20} className='delete-project z-50 absolute right-2 top-2 hover:shadow-md'/>}
      </DialogTrigger>
      <DialogContent className="text-center">
        <DialogHeader>
          <DialogTitle className="text-center">
            {t('modalConfirmDeleteUnit.title')}
          </DialogTitle>
        </DialogHeader>
          <p className="text-gray-600">
            {t('modalConfirmDeleteUnit.description')}
          </p>
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t('modalConfirmDeleteUnit.cancelButton')}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {t('modalConfirmDeleteUnit.deleteButton')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ModalConfirmDeleteUnit