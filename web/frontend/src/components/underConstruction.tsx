import Logo from "@/assets/logo.svg";
import { useTranslation } from '@/i18n';

import { cn } from '@/lib/utils';
export const MaintenanceBanner = () => {
  const isMobile = window.innerWidth < 768;
  const {t} = useTranslation()
  return (
    <div className="max-w-[800px] w-full text-center mx-auto py-20 px-4">
        <div className="mb-12 relative inline-block">
         <img
            src={Logo}
            alt="Logo"
            className={cn("h-[100px]", {
              "h-[30px]": isMobile,
            })}
          />
          
          
        </div>
        <h1
          className="text-2xl text-primary mb-6"
        >
          {t.underConstruction.title}
        </h1>
        <p
          className="font-body-lg text-body-lg text-on-surface-variant max-w-[600px] mx-auto mb-12"
        >
          {t.underConstruction.description}
        </p>

        <div
          className="mt-20 mx-auto"
        >
          <span>{t.underConstruction.predictDate.replace(/{date}/, '30/06/2026')}</span>
        </div>
      </div>
  )
}

export default MaintenanceBanner
