import LogoDark from "@/assets/logo-dark.svg";
import LogoWhite from "@/assets/logo.svg";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import { stringUtils } from "@/utils/string";
import { Link } from "@tanstack/react-router";
import { File, Home, MenuSquare, Settings, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageToggle } from "../language-toggle";
import { ModeToggle } from "../mode-toggle";
import { Notifications } from "../notifications";
import { useTheme } from "../theme-provider";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Button } from "../ui/button";
import SidemenuItem from "../ui/sidemenu-item";
interface ISidebar {
  handleLogout: () => void;
}

const activeProps = {
  style: {
    fontWeight: "bold",
    borderRadius: ".5rem",
    height: "40px",
    color: "var(--color-active-text)",
  },
};

const Sidebar = ({ handleLogout }: ISidebar) => {
  const { user, sidebarStatus, toggleSidebar } = useAuth();
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isMobile = useIsMobile();

  const sidemenuContent = (
    <div className="h-full flex flex-col justify-between gap-4">
      <div>
        <img
          src={theme === "light" ? LogoWhite : LogoDark}
          alt=""
          className="h-10 mb-4"
        />
      </div>
      <ul className={cn("mt-4 flex h-full flex-col gap-2")}>
        <li>
          <SidemenuItem>
            <Link
              to="/"
              className="hover:opacity-80 rounded-md flex gap-2 items-center w-full justify-between"
              activeProps={activeProps}
            >
              <span>{t(["home.title"])}</span>
              <Home size={18} />
            </Link>
          </SidemenuItem>
        </li>
        <li>
          <SidemenuItem>
            <Link
              to="/new_projects"
              className="hover:opacity-80 rounded-md flex gap-2 items-center w-full justify-between"
              activeProps={activeProps}
            >
              <span>{t("projects.title")}</span>
              <File size={18} className="group-[.closed]:mx-auto" />
            </Link>
          </SidemenuItem>
        </li>
        <li className="mt-auto">
          <SidemenuItem title={t("sidebar.notifications")} hide={isMobile}>
            <Notifications />
          </SidemenuItem>
          <SidemenuItem>
            <Link
              to="/profile"
              className="hover:text-gray-400 flex justify-between items-center w-full group"
              activeProps={activeProps}
            >
              <span>{t("sidebar.profile")}</span>
              <Settings
                size={16}
                className="group-hover:rotate-180 transition-transform duration-1000"
              />
            </Link>
          </SidemenuItem>
          <SidemenuItem title={t("sidebar.theme")}>
            <ModeToggle />
          </SidemenuItem>
          <SidemenuItem title={t("sidebar.language")}>
            <LanguageToggle />
          </SidemenuItem>
        </li>

        <li className="flex items-center gap-4 border-t border-zinc-700 pt-4">
          <div className="flex items-center gap-2 group-[.closed]:mx-auto">
            <Avatar>
              {/* <AvatarImage src='https://github.com/shadcn.png' /> */}
              <AvatarFallback className="bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
                {stringUtils.getInitials(user?.name || "") || (
                  <User className="w-4 h-4" />
                )}
              </AvatarFallback>
            </Avatar>
            <div className="group-[.closed]:animate-sidebar-items-close animate-sidebar-items-open">
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-gray-400">{user?.email}</p>
            </div>
          </div>
        </li>

        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="mt-2 ml-auto bg-destructive text-white rounded-br-none max-md:w-full"
          >
            <span>{t("common.logout")}</span>
          </Button>
        </div>
      </ul>
    </div>
  );

  if (isMobile) {
    return (
      <div
        className={cn(
          "sticky top-0 left-0 w-full h-30 bg-sidebar flex justify-between items-center px-6 shadow-dark-950 shadow-md",
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
          <Notifications size={24} />
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

export default Sidebar;
