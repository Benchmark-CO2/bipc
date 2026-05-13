import { FlaskConical } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { useState } from "react";
import { Button } from "./ui/button";
import { useTranslation } from "@/i18n";

export const BetaWarning = ({ minimizedSidebar = false }) => {
  const [open, setOpen] = useState(false);
  const { t } = useTranslation();

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="sm:max-w-[500px] bg-primary p-10 border-none"
          showCloseButton={false}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl text-center text-accent flex items-center gap-2 justify-center">
              <FlaskConical />
              {t.beta.title}
            </DialogTitle>
            <DialogDescription className="text-center pt-4 text-accent/100">
              <p className="text-md mb-1">
                {t.beta.description}
              </p>
              <p className="text-md ">
                {t.beta.suggestion}
              </p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col sm:flex-col gap-3 mt-4">
            <Button
              variant="bipc"
              size="lg"
              className="w-full"
              onClick={() => setOpen(false)}
            >
              {t.beta.close}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div
        className="bg-primary text-white p-2 px-4 rounded-lg mx-auto flex items-center w-full hover:bg-primary/90 cursor-pointer border border-primary/50"
        onClick={() => setOpen(true)}
      >
        <span className="flex items-center gap-2">
          <FlaskConical size={16} />
          {!minimizedSidebar && <strong>{t.beta.title}</strong>}
        </span>
        {!minimizedSidebar && (
          <span className="text-sm ml-auto cursor-pointer">{t.beta.learnMore}</span>
        )}
      </div>
    </>
  );
};
