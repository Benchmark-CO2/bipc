import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import { useTranslation } from "react-i18next";
import { useState } from "react";

interface ModalSimpleProps {
  componentTrigger?: React.ReactNode;
  title: string;
  content: React.ReactNode;
  onConfirm?: () => void;
  confirmTitle?: string;
  onClose?: () => void;
}

const ModalSimple = ({
  componentTrigger,
  onConfirm,
  title,
  content,
  confirmTitle = "Ok",
  onClose,
}: ModalSimpleProps) => {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen && onClose) {
      onClose();
    }
  };

  const onConfirmAction = async () => {
    await onConfirm?.();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild data-action="delete-project">
        {componentTrigger ?? (
          <Button variant="outline" onClick={() => setOpen(true)}>
            {t("common.open")}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="text-center">
        <DialogHeader>
          <DialogTitle className="text-center">{title}</DialogTitle>
        </DialogHeader>
        <div>{content}</div>
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("common.cancel")}
          </Button>
          {onConfirm && (
            <Button variant="default" onClick={onConfirmAction}>
              {confirmTitle}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ModalSimple;
