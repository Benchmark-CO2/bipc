import BipcIcon from "@/assets/icons/bipc";
import CollapseContentIcon from "@/assets/icons/collapse-content";
import ExpandContentIcon from "@/assets/icons/expand-content";
import Logo from "@/assets/logo.svg";
import LogoFull from "@/assets/logo_full.svg";
import { useSummary } from "@/context/summaryContext";
import { useAuth } from "@/hooks/useAuth";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useSidebar } from "@/hooks/useSidebar";
import { cn } from "@/lib/utils";
import { ENV } from "@/utils/constants";
import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  Bell,
  Building2,
  CircleHelp,
  ClipboardList,
  FileText,
  Fingerprint,
  FolderGit,
  GlobeLock,
  List,
  LogIn,
  Menu,
  MonitorPlay,
  Newspaper,
  Phone,
  Rss,
  Settings,
  UserPlus,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { BetaWarning } from "../beta-warning";
import { DevelopmentWarning } from "../development-warn";
import { Notifications } from "../notifications";
import { Button } from "../ui/button";
import { CustomLink } from "../ui/custom-link";
import Divider from "../ui/divider";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import ModalTraining from "./modal-training";
import { SidebarHoverPopover, type PopoverItem } from "./sidebar-hover-popover";

const saibaMaisItems: PopoverItem[] = [
  { label: "Perguntas frequentes", icon: CircleHelp, linkKey: "faq" },
  { label: "Glossário", icon: FileText, linkKey: "glossary" },
  { label: "BIPc na mídia", icon: MonitorPlay, linkKey: "media" },
  { label: "Lançamento", icon: Newspaper, linkKey: "launch" },
  { label: "Repositório", icon: FolderGit, linkKey: "repository" },
  { label: "Contato", icon: Phone, linkKey: "contact" },
];

const transparenciaItems: PopoverItem[] = [
  { label: "Privacidade dos dados", icon: Fingerprint, linkKey: "privacy" },
  { label: "Termos de uso", icon: ClipboardList, linkKey: "termsOfUse" },
  { label: "Formulário de dados", icon: List, linkKey: "dataForm" },
];

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

  const handleMobileNavigation = () => {
    if (isMobile) {
      toggleSidebar();
      hideSummary();
      localStorage.setItem("sidebarStatus", "closed");
    }
  };

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

      <div className="flex flex-col gap-2 w-full">
        {ENV !== "production" && <DevelopmentWarning minimizedSidebar />}
        <BetaWarning minimizedSidebar />
        {isAuthenticated && (
          <ModalTraining
            isAuthenticated={isAuthenticated}
            minimizedSidebar
            hasNavigateToSignUp={false}
          />
        )}
      </div>

      {/* Ícones de navegação */}
      <div className="flex-1 flex flex-col gap-1 justify-end">
        <Tooltip>
          <TooltipTrigger asChild>
            <CustomLink
              linkKey="about"
              className="p-2 hover:bg-zinc-700/30 rounded-md transition-colors flex items-center justify-center"
            >
              <BipcIcon size={18} className="text-white" />
            </CustomLink>
          </TooltipTrigger>
          <TooltipContent side="right">
            <p>Sobre o BIPc</p>
          </TooltipContent>
        </Tooltip>

        <SidebarHoverPopover
          triggerClassName="p-2 hover:bg-zinc-700/30 rounded-md transition-colors flex items-center justify-center"
          trigger={<Rss size={18} className="text-white" />}
          items={saibaMaisItems}
        />

        <SidebarHoverPopover
          triggerClassName="p-2 hover:bg-zinc-700/30 rounded-md transition-colors flex items-center justify-center"
          trigger={<GlobeLock size={18} className="text-white" />}
          items={transparenciaItems}
        />

        <div className="h-px bg-zinc-700/50 my-2" />

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
                  <Building2 size={18} className="text-white" />
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
        {ENV !== "production" && <DevelopmentWarning />}
        <BetaWarning />
        {isAuthenticated && (
          <ModalTraining
            isAuthenticated={isAuthenticated}
            disableFloating={true}
            hasNavigateToSignUp={false}
          />
        )}
      </div>

      {/* Menu Items - Seção Principal */}
      <div className="flex-1 flex flex-col p-4 overflow-auto custom-scrollbar">
        <ul
          className="flex flex-col gap-1 mt-auto mb-2 transition-opacity duration-200"
          style={{ opacity: isMinimized && !isMobile ? 0 : 1 }}
        >
          {/* Institucional */}
          <li>
            <CustomLink
              linkKey="about"
              className="flex gap-3 items-center w-full p-2 hover:bg-zinc-700/30 rounded-md transition-colors"
              onClick={handleMobileNavigation}
            >
              <BipcIcon size={18} />
              <span>Sobre o BIPc</span>
            </CustomLink>
          </li>

          <li>
            <SidebarHoverPopover
              triggerClassName="flex gap-3 items-center w-full p-2 hover:bg-zinc-700/30 rounded-md transition-colors"
              trigger={
                <>
                  <Rss size={18} />
                  <span>Saiba mais</span>
                </>
              }
              items={saibaMaisItems}
              onItemClick={handleMobileNavigation}
              isMobile={isMobile}
            />
          </li>

          <li>
            <SidebarHoverPopover
              triggerClassName="flex gap-3 items-center w-full p-2 hover:bg-zinc-700/30 rounded-md transition-colors"
              trigger={
                <>
                  <GlobeLock size={18} />
                  <span>Transparência</span>
                </>
              }
              items={transparenciaItems}
              onItemClick={handleMobileNavigation}
              isMobile={isMobile}
            />
          </li>

          <Divider className="my-4 h-[1px]" />

          <li>
            <Link
              to="/benchmark"
              onClick={handleMobileNavigation}
              activeProps={activeProps}
              className="flex gap-3 items-center w-full p-2 hover:bg-zinc-700/30 rounded-md transition-colors"
            >
              <BarChart3 size={18} />
              <span>Benchmark</span>
            </Link>
          </li>

          <Divider className="my-4 h-[1px]" />

          {/* Seção específica para usuários logados */}
          {isAuthenticated ? (
            <>
              {/* Projetos */}
              <li>
                <Link
                  to="/new_projects"
                  onClick={handleMobileNavigation}
                  activeProps={activeProps}
                  className="flex gap-3 items-center w-full p-2 hover:bg-zinc-700/30 rounded-md transition-colors"
                >
                  <Building2 size={18} />
                  <span>Empreendimentos</span>
                </Link>
              </li>

              <li>
                <Link
                  to="/settings"
                  onClick={handleMobileNavigation}
                  activeProps={activeProps}
                  className="flex gap-3 items-center w-full p-2 hover:bg-zinc-700/30 rounded-md transition-colors"
                >
                  <Settings size={18} />
                  <span>Configurações</span>
                </Link>
              </li>

              {/* Notificações */}
              <li>
                <div
                  className="flex gap-3 items-center w-full p-2"
                  style={{ display: isMobile ? "none" : "flex" }}
                >
                  <Bell size={18} />
                  <div className="flex-1">
                    <Notifications />
                  </div>
                </div>
              </li>
            </>
          ) : (
            <>
              {/* Seção para usuários não logados */}
              <li>
                <Link
                  to="/sign-up"
                  onClick={handleMobileNavigation}
                  activeProps={activeProps}
                  className="flex gap-3 items-center w-full p-2 hover:bg-zinc-700/30 rounded-md transition-colors"
                >
                  <UserPlus size={18} />
                  <span>Cadastre-se</span>
                </Link>
              </li>

              <li>
                <Link
                  to="/login"
                  onClick={handleMobileNavigation}
                  activeProps={activeProps}
                  className="flex gap-3 items-center w-full p-2 hover:bg-zinc-700/30 rounded-md transition-colors"
                >
                  <LogIn size={18} />
                  <span>Login</span>
                </Link>
              </li>
            </>
          )}
        </ul>

        {/* Seção inferior - sempre no final */}
        <div>
          {isAuthenticated && (
            <div className="flex flex-col gap-2">
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
            "fixed top-0 left-0 h-screen w-80 bg-sidebar text-white p-0 transition-transform duration-300 z-51",
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
