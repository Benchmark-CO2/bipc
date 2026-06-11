import Logo from "@/assets/logo.svg";
import BipcIcon from "@/assets/icons/bipc";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  BarChart3,
  CircleHelp,
  ClipboardList,
  FileText,
  Fingerprint,
  FolderGit,
  GlobeLock,
  Menu,
  MonitorPlay,
  Newspaper,
  Phone,
  Rss,
  UserCircle,
  X,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { CustomLink } from "../ui/custom-link";
import Divider from "../ui/divider";
import { Button } from "../ui/button";
import { SidebarHoverPopover } from "./sidebar-hover-popover";
import { links } from "@/utils/commonLinks";
import { useTranslation } from "@/i18n";

const activeProps = {
  style: {
    textShadow: "0.4px 0 0 currentColor, -0.4px 0 0 currentColor",
  },
};

export default function PublicHeader() {
  const isMobile = useIsMobile();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t } = useTranslation();
  const { aboutItems, transparencyItems } = links(t);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const handleCloseMenu = () => setIsMenuOpen(false);

  const NavLinks = () => (
    <>
      <CustomLink
        linkKey="about"
        className="flex items-center gap-2 hover:text-gray-300 transition-colors"
        onClick={handleCloseMenu}
      >
        <BipcIcon size={18} />
        <span className="text-sm">{t.sidebar.about}</span>
      </CustomLink>

      <SidebarHoverPopover
        triggerClassName="flex items-center gap-2 hover:text-gray-300 transition-colors"
        trigger={
          <>
            <Rss size={18} />
            <span className="text-sm">{t.sidebar.learnMore}</span>
          </>
        }
        items={aboutItems}
        onItemClick={handleCloseMenu}
        isMobile={isMobile}
        side="bottom"
      />

      <SidebarHoverPopover
        triggerClassName="flex items-center gap-2 hover:text-gray-300 transition-colors"
        trigger={
          <>
            <GlobeLock size={18} />
            <span className="text-sm">{t.sidebar.transparency}</span>
          </>
        }
        items={transparencyItems}
        onItemClick={handleCloseMenu}
        isMobile={isMobile}
        side="bottom"
      />

      <Divider
        className={cn("h-[28px] w-[1px] my-0", {
          hidden: isMobile,
          "mx-4": !isMobile,
        })}
      />

      <Link
        to="/benchmark"
        activeProps={activeProps}
        className="flex items-center gap-2 hover:text-gray-300 transition-colors"
        onClick={handleCloseMenu}
      >
        <BarChart3 size={18} />
        <span className="text-sm">{t.sidebar.benchmark}</span>
      </Link>

      <Link to="/login" onClick={handleCloseMenu}>
        <Button
          variant="secondary"
          size="sm"
          className="flex items-center gap-2 text-accent"
        >
          <UserCircle size={16} />
          <span>{t.sidebar.login}</span>
        </Button>
      </Link>
    </>
  );

  return (
    <nav className="bg-sidebar text-white relative">
      <div className="flex items-center justify-between px-4 md:px-8 py-0">
        <Link to="/benchmark" className="p-0">
          <img
            src={Logo}
            alt="Logo"
            className={cn("h-[30px]", {
              "h-[30px]": isMobile,
            })}
          />
        </Link>

        {/* Desktop Navigation */}
        {!isMobile && (
          <div className="flex gap-6 items-center py-2 ml-auto">
            <NavLinks />
          </div>
        )}

        {/* Mobile Menu Button */}
        {isMobile && (
          <button
            onClick={toggleMenu}
            className="p-2 hover:bg-gray-700 rounded-md transition-colors"
            aria-label="Toggle menu"
          >
            {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        )}
      </div>

      {/* Mobile Navigation Menu */}
      {isMobile && (
        <div
          className={cn(
            "absolute top-full left-0 right-0 bg-sidebar border-t border-gray-600 transition-all duration-300 ease-in-out z-50",
            {
              "opacity-100 visible": isMenuOpen,
              "opacity-0 invisible": !isMenuOpen,
            },
          )}
        >
          <div className="flex flex-col gap-2 p-4">
            <NavLinks />
          </div>
        </div>
      )}
    </nav>
  );
}
