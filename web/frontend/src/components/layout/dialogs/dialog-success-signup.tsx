import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from 'react-i18next';

interface DialogSuccessSignupProps {
  handleClose: () => void;
}
export const DialogSuccessSignup = ({ handleClose }: DialogSuccessSignupProps) => {
  const { t } = useTranslation();
  return (
    <Dialog onOpenChange={handleClose} open={true} >
      <DialogContent>
      <DialogTitle>{t('signUp.dialog.success.title')}</DialogTitle>
      <DialogDescription>
      <div className="my-8">
        <p className="text-base text-muted-foreground">
          {t('signUp.dialog.success.content')}
        </p>
      </div>
        {t('signUp.dialog.success.description')}
      </DialogDescription>

      <Button onClick={handleClose} className="mt-6 w-full" variant="default">
        <span className="text-sm">{t('signUp.dialog.success.button')}</span>
        <span className="ml-2">→</span>
      </Button>
      </DialogContent>
    </Dialog>
  )
}

