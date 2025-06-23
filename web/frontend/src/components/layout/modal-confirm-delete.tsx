import { Trash } from "lucide-react";
import { useState } from "react";
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

interface ModalConfirmDeleteProps {
  componentTrigger?: React.ReactNode;
  title: string;
  onConfirm?: () => void;
}

const ModalConfirmDelete = ({
  componentTrigger,
  onConfirm,
  title,
}: ModalConfirmDeleteProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const onConfirmDeletion = async () => {
    await onConfirm?.();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild data-action="delete-project">
        {componentTrigger ?? (
          <Trash
            size={20}
            className="delete-project z-50 absolute right-2 top-2 hover:shadow-md"
          />
        )}
      </DialogTrigger>
      <DialogContent className="text-center">
        <DialogHeader>
          <DialogTitle className="text-center">{title}</DialogTitle>
        </DialogHeader>
        <p className="text-gray-600">{t("modalConfirmDelete.description")}</p>
        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={() => setOpen(false)}>
            {t("modalConfirmDelete.cancelButton")}
          </Button>
          <Button variant="destructive" onClick={onConfirmDeletion}>
            {t("modalConfirmDelete.deleteButton")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ModalConfirmDelete;
