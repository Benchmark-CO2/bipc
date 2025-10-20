import Logo from "@/assets/logo.svg";
import LogoFull from "@/assets/logo_full.svg";
import { useSummary } from "@/context/summaryContext";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useSidebar } from "@/hooks/useSidebar";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  Activity,
  BarChart3,
  Bell,
  Contact,
  File,
  FlaskConical,
  Info,
  LogIn,
  Menu,
  Settings,
  UserPlus,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Notifications } from "../notifications";
import { Button } from "../ui/button";
import Divider from "../ui/divider";
import SidemenuItem from "../ui/sidemenu-item";

interface ISidebar {
  handleLogout?: () => void;
}

const activeProps = {
  className: "bg-zinc-700/30 rounded-md",
};

const Sidebar = ({ handleLogout }: ISidebar) => {
  const { user, isAuthenticated } = useAuth();
  const { sidebarStatus, toggleSidebar } = useSidebar();
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { context, setSummaryContext } = useSummary();
  const sidemenuContent = (
    <div className="h-full flex flex-col">
      {/* Header com Logo */}
      <div className="flex items-center mb-6 p-4">
        <Link to={isAuthenticated ? "/" : "/login"}>
          <img src={LogoFull} alt="Logo" className="w-full" />
        </Link>
      </div>

      {/* Menu Items - Seção Principal */}
      <div className="flex-1 flex flex-col p-4 overflow-auto custom-scrollbar">
        <ul className="flex flex-col gap-1 mt-auto mb-2">
          {/* Institucional */}
          <li>
            <SidemenuItem variant="link">
              <Link
                to={isAuthenticated ? "/" : "/login"}
                className="flex gap-3 items-center w-full p-2 hover:bg-zinc-700/30 rounded-md transition-colors"
              >
                <Info size={18} />
                <span>Sobre</span>
              </Link>
            </SidemenuItem>
          </li>

          {/* PD&I */}
          <li>
            <SidemenuItem variant="link">
              <Link
                to={isAuthenticated ? "/" : "/login"}
                className="flex gap-3 items-center w-full p-2 hover:bg-zinc-700/30 rounded-md transition-colors"
              >
                <FlaskConical size={18} />
                <span>PD&I</span>
              </Link>
            </SidemenuItem>
          </li>

          <li>
            <SidemenuItem variant="link">
              <Link
                to="/"
                className="flex gap-3 items-center w-full p-2 hover:bg-zinc-700/30 rounded-md transition-colors"
              >
                <Activity size={18} />
                <span>Ações</span>
              </Link>
            </SidemenuItem>
          </li>

          <Divider className="my-1" />

          <li>
            <SidemenuItem variant="link">
              <Link
                to="/"
                activeProps={activeProps}
                className="flex gap-3 items-center w-full p-2 hover:bg-zinc-700/30 rounded-md transition-colors"
              >
                <BarChart3 size={18} />
                <span>Benchmark</span>
              </Link>
            </SidemenuItem>
          </li>

          {/* Seção específica para usuários logados */}
          {isAuthenticated ? (
            <>
              {/* Projetos */}
              <li>
                <SidemenuItem variant="link">
                  <Link
                    to="/new_projects"
                    activeProps={activeProps}
                    className="flex gap-3 items-center w-full p-2 hover:bg-zinc-700/30 rounded-md transition-colors"
                  >
                    <File size={18} />
                    <span>Projetos</span>
                  </Link>
                </SidemenuItem>
              </li>

              <li>
                <SidemenuItem variant="link">
                  <Link
                    to={"/contacts" as any}
                    activeProps={activeProps}
                    className="flex gap-3 items-center w-full p-2 hover:bg-zinc-700/30 rounded-md transition-colors"
                  >
                    <Contact size={18} />
                    <span>Contatos</span>
                  </Link>
                </SidemenuItem>
              </li>

              <li>
                <SidemenuItem variant="link">
                  <Link
                    to={"/settings"}
                    activeProps={activeProps}
                    className="flex gap-3 items-center w-full p-2 hover:bg-zinc-700/30 rounded-md transition-colors"
                  >
                    <Settings size={18} />
                    <span>Configurações</span>
                  </Link>
                </SidemenuItem>
              </li>

              {/* Notificações */}
              <li>
                <SidemenuItem variant="link" hide={isMobile}>
                  <div className="flex gap-3 items-center w-full p-2">
                    <Bell size={18} />
                    <div className="flex-1">
                      <Notifications />
                    </div>
                  </div>
                </SidemenuItem>
              </li>
            </>
          ) : (
            <>
              {/* Seção para usuários não logados */}
              {/* Cadastre-se */}
              <li>
                <SidemenuItem variant="link">
                  <Link
                    to="/sign-up"
                    activeProps={activeProps}
                    className="flex gap-3 items-center w-full p-2 hover:bg-zinc-700/30 rounded-md transition-colors"
                  >
                    <UserPlus size={18} />
                    <span>Cadastre-se</span>
                  </Link>
                </SidemenuItem>
              </li>

              {/* Login */}
              <li>
                <SidemenuItem variant="link">
                  <Link
                    to="/login"
                    activeProps={activeProps}
                    className="flex gap-3 items-center w-full p-2 hover:bg-zinc-700/30 rounded-md transition-colors"
                  >
                    <LogIn size={18} />
                    <span>Login</span>
                  </Link>
                </SidemenuItem>
              </li>
            </>
          )}
        </ul>

        {/* Seção inferior - sempre no final */}
        <div>
          {isAuthenticated && (
            <div className="flex flex-col gap-2">
              {/* <Divider className="my-1" />

                  <div className="p-2">
                    <SidebarThemeToggle />
                  </div>
                  <div className="px-2">
                    <SidebarLanguageToggle />
                  </div>

                  <Divider className="my-1" />

                  <div className="flex items-center gap-3 p-2 pt-4 mb-4">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200">
                        {stringUtils.getInitials(user?.name || "") || (
                          <User className="w-4 h-4" />
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user?.name}</p>
                      <p className="text-xs text-gray-400 truncate">
                        {user?.email}
                      </p>
                    </div>
                  </div> */}

              {handleLogout && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleLogout}
                  className="w-full"
                >
                  <span>{t("common.logout")}</span>
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
  const hideSummary = () => {
    if (!context) return;
    if (sidebarStatus === "open") {
      setTimeout(() => {
        setSummaryContext({
          ...context,
          hide: false,
        });
      }, 200);
    } else {
      setSummaryContext({
        ...context,
        hide: true,
      });
    }
  };
  if (isMobile) {
    return (
      <div
        className={cn(
          "sticky top-0 left-0 w-full h-16 bg-sidebar flex justify-between items-center px-6 shadow-md z-50",
          {
            relative: sidebarStatus === "open",
          }
        )}
      >
        <div>
          <img src={Logo} alt="Logo" className="h-8" />
        </div>
        <div className="flex gap-4 items-center text-accent">
          {isAuthenticated && <Notifications size={24} />}
          <Menu
            size={24}
            className="text-white cursor-pointer"
            onClick={() => {
              toggleSidebar();
              hideSummary();
              localStorage.setItem(
                "sidebarStatus",
                sidebarStatus === "open" ? "closed" : "open"
              );
            }}
          />
        </div>

        {/* Overlay */}
        <div
          onClick={() => {
            toggleSidebar();
            hideSummary();

            localStorage.setItem("sidebarStatus", "closed");
          }}
          className={cn(
            "fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-300 z-40",
            sidebarStatus === "open"
              ? "opacity-100"
              : "opacity-0 pointer-events-none"
          )}
        />

        {/* Mobile Sidebar */}
        <div
          className={cn(
            "fixed top-0 left-0 h-screen w-80 bg-sidebar text-white p-6 transition-transform duration-300 z-50",
            sidebarStatus === "open" ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {sidemenuContent}
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-sidebar text-white max-w-80 w-full">
      {sidemenuContent}
    </div>
  );
};

export default Sidebar;
