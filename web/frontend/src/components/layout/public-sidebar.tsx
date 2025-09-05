import LogoDark from "@/assets/logo-dark.svg";
import LogoFull from "@/assets/logo_full.svg";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useSidebar } from '@/hooks/useSidebar';
import { cn } from "@/lib/utils";
import { Home, MenuSquare } from "lucide-react";
import Divider from '../ui/divider';
import SidemenuItem from '../ui/sidemenu-item';
import { Link } from './link';


const activeProps = {
  className: "bg-zinc-700/30 rounded-md",
};

const PublicSidebar = () => {
  const { sidebarStatus, toggleSidebar} = useSidebar()

  const isMobile = useIsMobile();

  const sidemenuContent = (
    <div className="h-full flex flex-col justify-between gap-4">
      <div>
        <img
          src={LogoFull}
          alt=""
        />
      </div>
      <ul className={cn("flex flex-col gap-2 mt-auto")}>
        <li>
           <SidemenuItem variant="link">
            <Link
              to="/login"
              activeProps={activeProps}

            >
              <Home size={16} />
              <span>PD&I</span>
            </Link>
           </SidemenuItem>
        </li>
        <li>
          <SidemenuItem variant={'link'}>
            <Link
              to="/login"
              activeProps={activeProps}
            >
              <Home size={18} />
              <span>Institucional</span>
            </Link>
          </SidemenuItem>
        </li>
        <li>
          <SidemenuItem variant={'link'}>
            <Link
              to="/login"
              activeProps={activeProps}
            >
              <Home size={18} />
              <span>Consultoria</span>
            </Link>
          </SidemenuItem>
        </li>
        <Divider  />
        <li>
          <SidemenuItem variant={'link'}>
            <Link
              to="/sign-up"
              activeProps={activeProps}
            >
              <Home size={18} />
              <span>Cadastre-se</span>
            </Link>
          </SidemenuItem>
        </li>
        <li>
          <SidemenuItem variant={'link'}>
            <Link
              to="/login"
              activeProps={activeProps}
            >
              <Home size={18} />
              <span>Login</span>
            </Link>
          </SidemenuItem>
        </li>
        {/* <li>
          <SidemenuItem>
            <Link
              to="/projects"
              className="hover:opacity-80 rounded-md flex gap-2 items-center w-full justify-between"
              activeProps={activeProps}
            >
              <span>{t("projects.title")}</span>
              <File size={18} className="group-[.closed]:mx-auto" />
            </Link>
          </SidemenuItem>
        </li> */}
        <li className="mt-auto">
          {/* <SidemenuItem title={t("sidebar.theme")}>
            <ModeToggle />
          </SidemenuItem>
          <SidemenuItem title={t("sidebar.language")}>
            <LanguageToggle />
          </SidemenuItem> */}
        </li>
      </ul>
    </div>
  );

  if (isMobile) {
    return (
      <div
        className={cn(
          "sticky top-0 left-0 w-full min-h-28 bg-sidebar flex justify-between items-center px-6 shadow-dark-950 shadow-md",
          {
            "relative ": sidebarStatus === "open",
          }
        )}
      >
        <div>
          <img
            src={LogoDark}
            alt=""
            className="h-10 mb-4"
          />
        </div>
        <div className="flex gap-4 items-center">
          <MenuSquare
            size={24}
            className="text-white"
            onClick={toggleSidebar}
          />
        </div>
        <div
          onClick={toggleSidebar}
          className={cn(
            "absolute w-full top-0 left-0 h-screen backdrop-blur-sm  bg-zinc-900/70 -translate-x-220 p-2 transition-transform duration-300 z-60",
            { "translate-x-0": sidebarStatus === "open" }
          )}
        ></div>
        <div
          className={cn(
            "fixed w-2/3 z-60 top-0 left-0 h-screen bg-sidebar text-white -translate-x-200 p-6 transition-transform duration-300",
            { "translate-x-0": sidebarStatus === "open" }
          )}
        >
          {sidemenuContent}
        </div>
      </div>
    );
  }
  return (
    <div
      data-sidebar={sidebarStatus}
      className="flex h-screen flex-col bg-sidebar p-6 text-white inset-y-0 left-0 z-50 w-64 "
    >
      {sidemenuContent}
    </div>
  );
};

export default PublicSidebar;
