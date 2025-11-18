import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "../../ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "../../ui/drawer";
import PrivacyPolicy from "./privacy-policy";
import TermsOfUse from "./terms-of-use";

const DrawerDocuments = ({
  documentType,
  onClose,
  opened,
  triggerComponent,
}: {
  documentType: "privacy-policy" | "terms-of-use";
  onClose?: () => void;
  opened?: boolean;
  triggerComponent?: React.ReactNode;
}) => {
  const [isOpen, setIsOpen] = useState(!!opened);

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) {
      onClose();
    }
  };

  const content = {
    "privacy-policy": {
      title: "Política de Privacidade",
      component: <PrivacyPolicy />,
    },
    "terms-of-use": { title: "Termos de Uso", component: <TermsOfUse /> },
  };

  const isMobile = useIsMobile();

  return (
    <Drawer
      direction={isMobile ? "bottom" : "right"}
      open={isOpen}
      dismissible={false}
      onOpenChange={setIsOpen}
      onClose={handleClose}
    >
      <DrawerTrigger asChild>
        {triggerComponent ? (
          triggerComponent
        ) : (
          <Button variant="link" className="p-0 h-auto">
            {content[documentType].title}
          </Button>
        )}
      </DrawerTrigger>
      <DrawerContent
        className={cn("min-w-3/6", {
          "w-full h-[80vh]": isMobile,
        })}
      >
        <DrawerHeader className="px-8">
          <DrawerTitle className="text-2xl font-bold text-primary">
            {content[documentType].title}
          </DrawerTitle>
          <Button
            onClick={handleClose}
            className="absolute right-4 top-2"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </DrawerHeader>
        <div className="mx-auto w-full p-6 pr-0 pt-0 flex overflow-auto max-sm:flex-col max-sm:flex-1 max-sm:min-h-0">
          {content[documentType].component}
        </div>
        <DrawerFooter className="px-8">
          <Button variant="bipc" onClick={handleClose}>
            OK
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default DrawerDocuments;
