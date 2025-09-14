import LogoDark from "@/assets/logo-dark.svg";
import LogoFull from "@/assets/logo_full.svg";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useSidebar } from "@/hooks/useSidebar";
import { cn } from "@/lib/utils";
import { stringUtils } from "@/utils/string";
import { Link } from "@tanstack/react-router";
import {
  Bell,
  File,
  Home,
  MenuSquare,
  Settings,
  User,
  UserPlus,
  LogIn,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { SidebarLanguageToggle } from "../sidebar-language-toggle";
import { SidebarThemeToggle } from "../sidebar-theme-toggle";
import { Notifications } from "../notifications";
import { Avatar, AvatarFallback } from "../ui/avatar";
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

  const sidemenuContent = (
    <div className="h-full flex flex-col">
      {/* Header com Logo */}
      <div className="flex items-center mb-6 p-4">
        <img src={LogoFull} alt="Logo" className="w-full" />
      </div>

      {/* Menu Items - Seção Principal */}
      <div className="flex-1 flex flex-col p-4 overflow-auto">
        <ul className="flex flex-col gap-1 mt-auto mb-2">
          {/* PD&I */}
          <li>
            <SidemenuItem variant="link">
              <Link
                to={isAuthenticated ? "/" : "/login"}
                className="flex gap-3 items-center w-full p-2 hover:bg-zinc-700/30 rounded-md transition-colors"
              >
                <Home size={18} />
                <span>PD&I</span>
              </Link>
            </SidemenuItem>
          </li>

          {/* Institucional */}
          <li>
            <SidemenuItem variant="link">
              <Link
                to={isAuthenticated ? "/" : "/login"}
                className="flex gap-3 items-center w-full p-2 hover:bg-zinc-700/30 rounded-md transition-colors"
              >
                <Settings size={18} />
                <span>Institucional</span>
              </Link>
            </SidemenuItem>
          </li>

          {/* Ações (apenas se logado) / Consultoria (apenas se não logado) */}
          {isAuthenticated ? (
            <li>
              <SidemenuItem variant="link">
                <Link
                  to="/"
                  className="flex gap-3 items-center w-full p-2 hover:bg-zinc-700/30 rounded-md transition-colors"
                >
                  <MenuSquare size={18} />
                  <span>Ações</span>
                </Link>
              </SidemenuItem>
            </li>
          ) : (
            <li>
              <SidemenuItem variant="link">
                <Link
                  to="/login"
                  className="flex gap-3 items-center w-full p-2 hover:bg-zinc-700/30 rounded-md transition-colors"
                >
                  <Home size={18} />
                  <span>Consultoria</span>
                </Link>
              </SidemenuItem>
            </li>
          )}

          <Divider className="my-1" />

          {/* Seção específica para usuários logados */}
          {isAuthenticated ? (
            <>
              {/* Benchmark - Home (apenas se logado) */}
              <li>
                <SidemenuItem variant="link">
                  <Link
                    to="/"
                    activeProps={activeProps}
                    className="flex gap-3 items-center w-full p-2 hover:bg-zinc-700/30 rounded-md transition-colors"
                  >
                    <Home size={18} />
                    <span>{t("home.title")}</span>
                  </Link>
                </SidemenuItem>
              </li>
              {/* Projetos */}
              <li>
                <SidemenuItem variant="link">
                  <Link
                    to="/new_projects"
                    activeProps={activeProps}
                    className="flex gap-3 items-center w-full p-2 hover:bg-zinc-700/30 rounded-md transition-colors"
                  >
                    <File size={18} />
                    <span>{t("projects.title")}</span>
                  </Link>
                </SidemenuItem>
              </li>

              {/* Perfil */}
              <li>
                <SidemenuItem variant="link">
                  <Link
                    to="/profile"
                    activeProps={activeProps}
                    className="flex gap-3 items-center w-full p-2 hover:bg-zinc-700/30 rounded-md transition-colors"
                  >
                    <User size={18} />
                    <span>{t("sidebar.profile")}</span>
                  </Link>
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
              <Divider className="my-1" />

              {/* Notificações */}
              <SidemenuItem variant="link" hide={isMobile}>
                <div className="flex gap-3 items-center w-full p-2">
                  <Bell size={18} />
                  <div className="flex-1">
                    <Notifications />
                  </div>
                </div>
              </SidemenuItem>

              {/* Configurações - Tema e Idioma */}
              <div className="p-2">
                <SidebarThemeToggle />
              </div>
              <div className="px-2">
                <SidebarLanguageToggle />
              </div>

              <Divider className="my-1" />

              {/* Container do usuário */}
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
              </div>

              {/* Botão de sair */}
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
          <img src={LogoDark} alt="Logo" className="h-8" />
        </div>
        <div className="flex gap-4 items-center">
          {isAuthenticated && <Notifications size={24} />}
          <MenuSquare
            size={24}
            className="text-white cursor-pointer"
            onClick={() => {
              toggleSidebar();
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
    <div className="flex h-screen flex-col bg-sidebar text-white w-80">
      {sidemenuContent}
    </div>
  );
};

export default Sidebar;
