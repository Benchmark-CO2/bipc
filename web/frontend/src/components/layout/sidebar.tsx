import Logo from "@/assets/logo.svg";
import LogoFull from "@/assets/logo_full.svg";
import BipcIcon from "@/assets/icons/bipc";
import { useSummary } from "@/context/summaryContext";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useSidebar } from "@/hooks/useSidebar";
import { cn } from "@/lib/utils";
import { posLaunchFeatures } from "@/utils/posLaunchFeatures";
import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  Book,
  File,
  GlobeLock,
  Info,
  LogIn,
  Menu,
  Settings,
  UserPlus,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Notifications } from "../notifications";
import { Button } from "../ui/button";
import Divider from "../ui/divider";
import SidemenuItem from "../ui/sidemenu-item";
import ExpandContentIcon from "@/assets/icons/expand-content";
import CollapseContentIcon from "@/assets/icons/collapse-content";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { BetaWarning } from "../beta-warning";
import ModalTraining from "./modal-training";

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

  // Estado para controlar se o sidebar está minimizado
  const [isMinimized, setIsMinimized] = useState(() => {
    const saved = localStorage.getItem("sidebarMinimized");
    return saved === "true";
  });

  // Salvar estado no localStorage quando mudar
  useEffect(() => {
    localStorage.setItem("sidebarMinimized", isMinimized.toString());
  }, [isMinimized]);

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  // Versão minimizada do sidebar
  const minimizedSidebar = (
    <div className="h-full flex flex-col py-4 px-3 relative">
      {/* Logo minimizado - flutuante no topo */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2">
        <Link to={isAuthenticated ? "/benchmark" : "/login"}>
          <BipcIcon size={48} className="text-secondary" />
        </Link>
      </div>

      {/* Espaço para o logo flutuante */}
      <div className="h-16" />

      {/* Botão para expandir */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={toggleMinimize}
            className="mb-6 p-2 hover:bg-zinc-700/30 rounded-md transition-colors flex items-center justify-center"
          >
            <ExpandContentIcon size={28} className="text-white" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <p>Expandir sidebar</p>
        </TooltipContent>
      </Tooltip>

      {/* Ícones de navegação */}
      <div className="flex-1 flex flex-col gap-1 justify-end">
        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to="/about"
              className="p-2 hover:bg-zinc-700/30 rounded-md transition-colors flex items-center justify-center"
            >
              <Info size={18} className="text-white" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Sobre o BIPc</p>
          </TooltipContent>
        </Tooltip>

        {posLaunchFeatures.trainingModal.enabled && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                to={posLaunchFeatures.trainingModal.formUrl}
                target="_blank"
                className="p-2 hover:bg-zinc-700/30 rounded-md transition-colors flex items-center justify-center"
              >
                <Book size={18} className="text-white" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Capacitação</p>
            </TooltipContent>
          </Tooltip>
        )}

        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to="/benchmark"
              activeProps={{ className: "bg-zinc-700/30" }}
              className="p-2 hover:bg-zinc-700/30 rounded-md transition-colors flex items-center justify-center"
            >
              <BarChart3 size={18} className="text-white" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Benchmark</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Link
              to="/privacidade"
              className="p-2 hover:bg-zinc-700/30 rounded-md transition-colors flex items-center justify-center"
            >
              <GlobeLock size={18} className="text-white" />
            </Link>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Políticas de Privacidade</p>
          </TooltipContent>
        </Tooltip>

        <div className="h-px bg-zinc-700/50 my-2" />

        {isAuthenticated ? (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/new_projects"
                  activeProps={{ className: "bg-zinc-700/30" }}
                  className="p-2 hover:bg-zinc-700/30 rounded-md transition-colors flex items-center justify-center"
                >
                  <File size={18} className="text-white" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Empreendimentos</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/settings"
                  activeProps={{ className: "bg-zinc-700/30" }}
                  className="p-2 hover:bg-zinc-700/30 rounded-md transition-colors flex items-center justify-center"
                >
                  <Settings size={18} className="text-white" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Configurações</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="p-2 hover:bg-zinc-700/30 rounded-md transition-colors flex items-center justify-center">
                  <Notifications iconOnly size={18} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Notificações</p>
              </TooltipContent>
            </Tooltip>
          </>
        ) : (
          <>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/sign-up"
                  activeProps={{ className: "bg-zinc-700/30" }}
                  className="p-2 hover:bg-zinc-700/30 rounded-md transition-colors flex items-center justify-center"
                >
                  <UserPlus size={18} className="text-white" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Cadastre-se</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  to="/login"
                  activeProps={{ className: "bg-zinc-700/30" }}
                  className="p-2 hover:bg-zinc-700/30 rounded-md transition-colors flex items-center justify-center"
                >
                  <LogIn size={18} className="text-white" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Login</p>
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>

      {/* Botão de logout no rodapé */}
      {isAuthenticated && handleLogout && (
        <div className="mt-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={handleLogout}
                className="p-2 hover:bg-red-700/30 rounded-md transition-colors flex items-center justify-center w-full"
              >
                <LogIn size={18} className="text-red-500 rotate-180" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Sair</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  );

  const sidemenuContent = (
    <div className="h-full flex flex-col relative">
      {/* Header com Logo */}
      <div className="flex items-center mb-6 p-4 justify-between relative">
        <Link to={isAuthenticated ? "/benchmark" : "/login"}>
          <img src={LogoFull} alt="Logo" className="w-full" />
        </Link>
        {!isMobile && (
          <button
            onClick={toggleMinimize}
            className="p-2 hover:bg-zinc-700/30 rounded-md transition-colors absolute right-4 top-4"
            title="Minimizar sidebar"
          >
            <CollapseContentIcon size={28} className="text-white" />
          </button>
        )}
      </div>

      <div className="p-4 flex flex-col gap-2 w-full">
        <BetaWarning />
        <ModalTraining
          isAuthenticated={isAuthenticated}
          onNavigateToSignUp={() => {}}
        />
      </div>

      {/* Menu Items - Seção Principal */}
      <div className="flex-1 flex flex-col p-4 overflow-auto custom-scrollbar">
        <ul
          className="flex flex-col gap-1 mt-auto mb-2 transition-opacity duration-200"
          style={{ opacity: isMinimized && !isMobile ? 0 : 1 }}
        >
          {/* Institucional */}
          <li>
            <SidemenuItem variant="link">
              <Link
                to={"/about"}
                className="flex gap-3 items-center w-full p-2 hover:bg-zinc-700/30 rounded-md transition-colors"
              >
                <Info size={18} />
                <span>Sobre o BIPc</span>
              </Link>
            </SidemenuItem>
          </li>

          {posLaunchFeatures.trainingModal.enabled && (
            <li>
              <SidemenuItem variant="link">
                <Link
                  to={posLaunchFeatures.trainingModal.formUrl}
                  target="_blank"
                  className="flex gap-3 items-center w-full p-2 hover:bg-zinc-700/30 rounded-md transition-colors"
                >
                  <Book size={18} />
                  <span>Capacitação</span>
                </Link>
              </SidemenuItem>
            </li>
          )}

          <li>
            <SidemenuItem variant="link">
              <Link
                to="/benchmark"
                activeProps={activeProps}
                className="flex gap-3 items-center w-full p-2 hover:bg-zinc-700/30 rounded-md transition-colors"
              >
                <BarChart3 size={18} />
                <span>Benchmark</span>
              </Link>
            </SidemenuItem>
          </li>
          <li>
            <SidemenuItem variant="link">
              <Link
                to="/privacidade"
                className="flex gap-3 items-center w-full p-2 hover:bg-zinc-700/30 rounded-md transition-colors"
              >
                <GlobeLock size={18} />
                <span>Políticas de Privacidade</span>
              </Link>
            </SidemenuItem>
          </li>

          <Divider className="my-4" />

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
                    <span>Empreendimentos</span>
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
          },
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
                sidebarStatus === "open" ? "closed" : "open",
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
              : "opacity-0 pointer-events-none",
          )}
        />

        {/* Mobile Sidebar */}
        <div
          className={cn(
            "fixed top-0 left-0 h-screen w-80 bg-sidebar text-white p-6 transition-transform duration-300 z-50",
            sidebarStatus === "open" ? "translate-x-0" : "-translate-x-full",
          )}
        >
          {sidemenuContent}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex h-screen flex-col bg-sidebar text-white transition-all duration-300",
        isMinimized ? "w-[72px]" : "w-96",
      )}
    >
      {isMinimized ? minimizedSidebar : sidemenuContent}
    </div>
  );
};

export default Sidebar;
